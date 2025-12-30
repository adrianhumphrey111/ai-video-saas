"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { FolderKanban, MoreVertical, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import type { Project } from "@/server/db/schema";

export function ProjectsClient({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renaming, setRenaming] = useState<{ projectId: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const sorted = useMemo(() => projects, [projects]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((p) => (
          <div key={p.id} className="group relative">
            <Link href={`/dashboard/projects/${p.id}`} className="block">
              <Card className="h-full overflow-hidden border-white/10 bg-white/5 text-white transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-slate-300" />
                    {p.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm text-slate-300 line-clamp-2">{p.summary}</div>
                  <div className="flex flex-wrap gap-2">
                    <span className={cn("rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-200")}>
                      {p.status}
                    </span>
                    <span className={cn("rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-200")}>
                      {p.progress}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <div className="absolute right-2 top-2 z-20">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-slate-200 hover:bg-white/10 border border-white/10">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={6} className="bg-black/90 text-white border-white/10">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setRenaming({ projectId: p.id, name: p.name ?? "Untitled project" });
                      setRenameOpen(true);
                      requestAnimationFrame(() => inputRef.current?.focus());
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
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
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!renaming) return;
              const next = renaming.name.trim();
              if (!next) return;
              try {
                setSaving(true);
                const res = await fetch("/api/projects/rename", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ projectId: renaming.projectId, name: next }),
                });
                if (!res.ok) throw new Error("Failed");
                setRenameOpen(false);
                router.refresh();
              } finally {
                setSaving(false);
              }
            }}
          >
            <Input
              ref={inputRef}
              value={renaming?.name ?? ""}
              onChange={(e) => setRenaming((r) => (r ? { ...r, name: e.target.value } : r))}
              className="border-white/10 bg-white/5 text-white"
              maxLength={60}
              placeholder="Project name"
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
              <Button type="submit" className="bg-white text-black hover:bg-white/90" disabled={saving}>
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

