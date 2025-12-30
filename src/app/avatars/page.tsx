"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, User, FlaskConical, Car, MoreVertical, Trash2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRef } from "react";

import { api } from "@/trpc/react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CreateAvatarModal } from "@/components/avatars/create-avatar-modal";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AvatarsPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [filterKind, setFilterKind] = useState<"all" | "character" | "object" | "other">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const utils = api.useUtils();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  const elementsQuery = api.elements.list.useQuery(
    { userId: userId ?? "", kind: filterKind === "all" ? undefined : filterKind },
    { enabled: Boolean(userId) },
  );

  const deleteElementMutation = api.elements.deleteElement.useMutation({
    onSuccess: async () => {
      if (!userId) return;
      await utils.elements.list.invalidate({
        userId,
        kind: filterKind === "all" ? undefined : filterKind,
      });
      toast.success("Element deleted");
    },
    onError: () => {
      toast.error("Could not delete element. Try again.");
    },
    onSettled: () => setDeletingId(null),
  });

  const createElementMutation = api.elements.createElement.useMutation();
  const updateNameMutation = api.elements.updateName.useMutation({
    onSuccess: async () => {
      if (!userId) return;
      await utils.elements.list.invalidate({
        userId,
        kind: filterKind === "all" ? undefined : filterKind,
      });
    },
  });

  const creationOptions = useMemo(
    () => [
      {
        kind: "character" as const,
        label: "Character",
        description: "Faces, avatars, and people.",
        icon: User,
      },
      {
        kind: "object" as const,
        label: "Object",
        description: "Props, vehicles, gear, tools.",
        icon: Car,
      },
      {
        kind: "other" as const,
        label: "Other",
        description: "FX, abstract, environments.",
        icon: FlaskConical,
      },
    ],
    [],
  );

  const handleCreate = async (kind: "character" | "object" | "other") => {
    if (!userId) {
      toast.error("You need to be signed in to create elements.");
      return;
    }

    try {
      const element = await createElementMutation.mutateAsync({
        userId,
        kind,
        name:
          kind === "character"
            ? "New Character"
            : kind === "object"
              ? "New Object"
              : "New Element",
      });

      router.push(`/avatars/design?id=${element.id}&kind=${kind}`);
    } catch (err) {
      console.error(err);
      toast.error("Could not start a new element. Try again.");
    }
  };

  const handleDelete = async (
    e: React.MouseEvent,
    elementId: string,
  ) => {
    e.stopPropagation();
    if (!userId) {
      toast.error("You need to be signed in.");
      return;
    }
    setDeletingId(elementId);
    await deleteElementMutation.mutateAsync({ id: elementId, userId });
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Elements
        </h1>
        <p className="text-slate-400">
          Characters, objects, and other elements you can reuse in scenes.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-4">
          Create New Element
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {creationOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.kind}
                onClick={() => handleCreate(option.kind)}
                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-left transition-all hover:border-white/20 hover:bg-white/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-white group-hover:bg-white/10">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-white">
                    {option.label}
                  </span>
                  <span className="text-sm text-slate-400">
                    {option.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">My Elements</h2>
          <p className="text-slate-400 text-sm">
            Latest saved versions are shown; open to view history.
          </p>
        </div>
        <CreateAvatarModal>
          <button className="group relative flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition-all hover:border-white/20 hover:bg-white/10">
            <Plus className="h-4 w-4" />
            New from upload
          </button>
        </CreateAvatarModal>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "character", "object", "other"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilterKind(k)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all",
              filterKind === k
                ? "border-white/30 bg-white/10 text-white shadow-sm"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white",
            )}
          >
            {k === "all" ? "All" : k}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {elementsQuery.data?.length ? (
          elementsQuery.data.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() =>
                router.push(
                  `/elements/design?id=${item.id}&kind=${item.kind}${item.imageUrl ? `&image=${encodeURIComponent(item.imageUrl)}` : ""
                  }`,
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(
                    `/elements/design?id=${item.id}&kind=${item.kind}${item.imageUrl ? `&image=${encodeURIComponent(item.imageUrl)}` : ""
                    }`,
                  );
                }
              }}
              className="group relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition-all hover:border-white/20 cursor-pointer"
            >
              <div className="absolute right-2 top-2 z-20">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-slate-200 hover:bg-white/10 border border-white/10">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={6} className="bg-black/90 text-white border-white/10">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenaming({ id: item.id, name: item.name ?? "Untitled" });
                        setRenameOpen(true);
                        requestAnimationFrame(() => renameInputRef.current?.focus());
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-400 focus:text-red-300"
                      disabled={deletingId === item.id || deleteElementMutation.isPending}
                      onClick={(e) => handleDelete(e, item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="absolute inset-0">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl!}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-900" />
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">{item.name}</h3>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                    {item.kind}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  v{item.latestVersion?.versionNumber ?? 1} •{" "}
                  {item.status === "ready" ? "Ready" : item.status}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 py-12 text-center text-slate-400">
            <p className="text-sm">No elements yet. Start by creating one.</p>
          </div>
        )}
      </div>

      <Dialog
        open={renameOpen}
        onOpenChange={(o) => {
          setRenameOpen(o);
          if (!o) setRenaming(null);
        }}
      >
        <DialogContent className="max-w-md border-white/10 bg-black/95 text-white">
          <DialogHeader>
            <DialogTitle>Rename element</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!renaming || !userId) return;
              const next = renaming.name.trim();
              if (!next) return;
              try {
                await updateNameMutation.mutateAsync({ id: renaming.id, userId, name: next });
                toast.success("Renamed");
                setRenameOpen(false);
              } catch {
                toast.error("Could not rename");
              }
            }}
          >
            <Input
              ref={renameInputRef}
              value={renaming?.name ?? ""}
              onChange={(e) => setRenaming((r) => (r ? { ...r, name: e.target.value } : r))}
              className="border-white/10 bg-white/5 text-white"
              maxLength={60}
              placeholder="Name"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="text-slate-200 hover:bg-white/10"
                onClick={() => setRenameOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-white text-black hover:bg-white/90" disabled={updateNameMutation.isPending}>
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
