"use client";

import Link from "next/link";
import {
  Home,
  LayoutTemplate,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sparkles,
  User,
  Film,
  FolderKanban,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useLocalStorage } from "usehooks-ts";
import { DefaultChatTransport } from "ai";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { MultimodalInput, type ChatAttachment, type ChatAssetSuggestion } from "@/components/chat/multimodal-input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { api } from "@/trpc/react";

import type { Project } from "@/server/db/schema";

function slugifyLabel(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "asset";
}

type ReferenceShelfItem =
  | {
      kind: "asset";
      elementId: string;
      label: string;
      name: string;
      previewUrl: string;
      locked: boolean;
    }
  | {
      kind: "upload";
      uploadId: string;
      imageId: string;
      label: string;
      name: string;
      previewUrl: string;
      locked: boolean;
    };

type ReferenceShelfState = {
  pinned: ReferenceShelfItem[];
  editMode: "generate" | "inpaint";
  maskUploadId?: string;
  maskImageId?: string;
};

type VideoToolResult = {
  status?: "running" | "succeeded" | "failed";
  videoId?: string;
  versionId?: string;
  jobId?: string;
  operationName?: string;
  previewUrls?: string[];
  outputGcsUris?: string[];
  message?: string;
};

function buildReferenceSetPayload(state: ReferenceShelfState) {
  const locked: string[] = [];
  const unlocked: string[] = [];
  for (const r of state.pinned) {
    const token =
      r.kind === "asset" ? `asset:${r.elementId}` : `upload:${r.uploadId}`;
    if (r.locked) locked.push(token);
    else unlocked.push(token);
  }
  return { locked, unlocked, strategy: "locked-first" as const };
}

export function VideoAgentClient({ project }: { project: Project }) {
  const [navOpen, setNavOpen] = useState(true);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [shelfOpen, setShelfOpen] = useState(false);
  const [projectName, setProjectName] = useState(project.name);
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [savingProjectName, setSavingProjectName] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<VideoToolResult | null>(null);
  const [activeVideoPreviewUrls, setActiveVideoPreviewUrls] = useState<string[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  const elementsQuery = api.elements.list.useQuery(
    { userId: userId ?? "", kind: undefined },
    { enabled: Boolean(userId) },
  );

  const assetSuggestions = useMemo<ChatAssetSuggestion[]>(() => {
    const rows = elementsQuery.data ?? [];
    const seen = new Map<string, number>();
    const nextLabel = (name: string) => {
      const base = slugifyLabel(name);
      const current = seen.get(base) ?? 0;
      seen.set(base, current + 1);
      if (current === 0) return base;
      return `${base}-${current + 1}`;
    };

    return rows
      .map((el: any) => ({
        label: nextLabel(el.name ?? "asset"),
        name: el.name ?? "Untitled",
        elementId: el.id,
        elementKind: el.kind,
        previewUrl: el.imageUrl || el.thumbnailUrl || "",
      }))
      .filter((x) => Boolean(x.previewUrl));
  }, [elementsQuery.data]);

  const chatHelpers = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {},
    }),
    messages: [],
  }) as any;

  const { messages, stop, status } = chatHelpers;
  const sendMessage = (message: any, options?: any) => {
    if (chatHelpers.sendMessage) {
      chatHelpers.sendMessage(message, options);
    } else if (chatHelpers.append) {
      chatHelpers.append(message, options);
    }
  };

  const [storedMessages, setStoredMessages] = useLocalStorage<any[]>(
    `project:${project.id}:chat:messages`,
    [],
  );

  useEffect(() => {
    if (!chatHelpers?.setMessages) return;
    if ((messages?.length ?? 0) > 0) return;
    if (storedMessages.length === 0) return;
    chatHelpers.setMessages(storedMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (Array.isArray(messages)) setStoredMessages(messages);
  }, [messages, setStoredMessages]);

  const availableImages = useMemo(() => {
    const out: ChatAttachment[] = [];
    for (const m of messages ?? []) {
      for (const p of (m as any)?.parts ?? []) {
        if (p?.type === "file" && typeof p?.url === "string" && typeof p?.imageId === "string") {
          out.push({
            url: p.url,
            name: p.name ?? p.filename ?? "image",
            contentType: p.mediaType ?? p.contentType,
            storagePath: p.storagePath,
            uploadId: p.uploadId,
            imageId: p.imageId,
          });
        }
      }
    }
    return out;
  }, [messages]);

  const [referenceShelf, setReferenceShelf] = useLocalStorage<ReferenceShelfState>(
    `project:${project.id}:reference-shelf`,
    { pinned: [], editMode: "generate" },
  );

  const referenceOptions = useMemo(() => {
    const images = [...availableImages, ...attachments]
      .filter((a) => a.contentType?.startsWith("image/"))
      .filter((a) => Boolean(a.uploadId) && Boolean(a.imageId))
      .map((a) => ({
        kind: "upload" as const,
        key: `upload:${a.uploadId}`,
        uploadId: a.uploadId as string,
        imageId: a.imageId,
        label: a.imageId,
        name: a.name ?? a.imageId,
        previewUrl: a.url,
      }));

    const assets = assetSuggestions.map((a) => ({
      kind: "asset" as const,
      key: `asset:${a.elementId}`,
      elementId: a.elementId,
      label: a.label,
      name: a.name,
      previewUrl: a.previewUrl,
    }));

    return [...assets, ...images];
  }, [attachments, assetSuggestions, availableImages]);

  const maskOptions = useMemo(() => {
    return [...availableImages, ...attachments]
      .filter((a) => a.contentType?.startsWith("image/"))
      .filter((a) => Boolean(a.uploadId) && Boolean(a.imageId))
      .map((a) => ({
        uploadId: a.uploadId as string,
        imageId: a.imageId,
        name: a.name ?? a.imageId,
        previewUrl: a.url,
      }));
  }, [attachments, availableImages]);

  const selectedMask =
    referenceShelf.maskUploadId && referenceShelf.maskImageId
      ? maskOptions.find((m) => m.uploadId === referenceShelf.maskUploadId) ?? null
      : null;

  const renderTextWithMentions = (t: string) =>
    t.split(/(@[a-zA-Z0-9-]+)/g).map((part, idx) =>
      /^@[a-zA-Z0-9-]+$/.test(part) ? (
        <span key={`${part}-${idx}`} className="rounded-md bg-indigo-500/20 px-1.5 py-0.5 font-semibold text-indigo-200">
          {part}
        </span>
      ) : (
        <span key={idx}>{part}</span>
      ),
    );

  const openVideoModal = async (toolOutput: VideoToolResult) => {
    setActiveVideo(toolOutput);
    setVideoModalOpen(true);
    const initial = Array.isArray(toolOutput.previewUrls) ? toolOutput.previewUrls : [];
    if (initial.length > 0) {
      setActiveVideoPreviewUrls(initial);
      return;
    }
    if (!toolOutput.versionId) return;
    try {
      setLoadingPreview(true);
      const res = await fetch("/api/videos/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ versionId: toolOutput.versionId }),
      });
      const json = await res.json().catch(() => null);
      const urls = (json?.previewUrls ?? []) as string[];
      if (Array.isArray(urls)) setActiveVideoPreviewUrls(urls);
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#05060a] via-[#0b0c11] to-black text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(99,102,241,0.12),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.12),transparent_35%)]" />
      </div>

      <div className="relative flex w-full h-screen overflow-hidden py-6 gap-4">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex flex-col justify-between border-r border-white/10 bg-black/80 backdrop-blur-xl transition-all duration-300 ease-in-out lg:static lg:bg-transparent lg:border-none lg:shadow-none",
            navOpen ? "w-[260px] translate-x-0" : "w-0 -translate-x-full opacity-0 lg:w-0 lg:translate-x-0 lg:opacity-0",
          )}
        >
          <div className="flex h-full w-full flex-col gap-2 p-3 lg:rounded-3xl lg:border lg:border-white/10 lg:bg-black/50 lg:p-4 lg:shadow-[0_25px_70px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between px-2 pb-4 pt-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold tracking-tight text-white">VidNova</div>
                  {editingProjectName ? (
                    <form
                      className="mt-1 flex items-center gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const next = projectName.trim();
                        if (!next) return;
                        try {
                          setSavingProjectName(true);
                          const res = await fetch("/api/projects/rename", {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ projectId: project.id, name: next }),
                          });
                          if (!res.ok) throw new Error("Failed");
                          setEditingProjectName(false);
                        } catch {
                          // noop (keep inline editing)
                        } finally {
                          setSavingProjectName(false);
                        }
                      }}
                    >
                      <Input
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="h-7 w-[160px] rounded-md border-white/10 bg-white/5 text-xs text-white"
                        maxLength={60}
                        autoFocus
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="h-7 rounded-md bg-white text-black hover:bg-white/90"
                        disabled={savingProjectName}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 rounded-md text-slate-300 hover:bg-white/10"
                        onClick={() => {
                          setProjectName(project.name);
                          setEditingProjectName(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="group flex items-center gap-2 truncate text-[10px] uppercase tracking-[0.3em] text-slate-500 hover:text-slate-300"
                      onClick={() => setEditingProjectName(true)}
                      title="Rename project"
                    >
                      <span className="truncate">{projectName}</span>
                      <span className="opacity-0 transition-opacity group-hover:opacity-100">Edit</span>
                    </button>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-white lg:hidden"
                onClick={() => setNavOpen(false)}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>

            <Button
              className="w-full justify-start gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-6 text-base font-semibold text-white shadow-lg shadow-blue-900/20 hover:from-cyan-400 hover:to-blue-500 hover:shadow-blue-500/20"
              asChild
            >
              <Link href={`/dashboard/projects/${project.id}`}>
                <Plus className="h-5 w-5" />
                Create Video
              </Link>
            </Button>

            <div className="flex-1 space-y-2 overflow-y-auto px-1 py-4 scrollbar-none">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 rounded-xl px-3 py-2 bg-white/10 text-white"
                asChild
              >
                <Link href={`/dashboard/projects/${project.id}`}>
                  <Film className="h-5 w-5" />
                  Video Agent
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 rounded-xl px-3 py-2 text-slate-400 hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link href={`/dashboard/projects/${project.id}/videos`}>
                  <LayoutTemplate className="h-5 w-5" />
                  Videos
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 rounded-xl px-3 py-2 text-slate-400 hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link href="/dashboard/projects">
                  <Home className="h-5 w-5" />
                  Projects
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 rounded-xl px-3 py-2 text-slate-400 hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link href="/avatars">
                  <FolderKanban className="h-5 w-5" />
                  Assets
                </Link>
              </Button>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5">
              <Button variant="ghost" className="flex w-full items-center justify-start gap-3 rounded-xl px-2 py-6 hover:bg-white/5">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400" />
                <div className="flex flex-col items-start gap-0.5 overflow-hidden">
                  <span className="text-sm font-semibold text-white">You</span>
                  <span className="text-xs text-slate-400">
                    <User className="inline h-3 w-3 mr-1" />
                    {userId ? "Signed in" : "Loading…"}
                  </span>
                </div>
              </Button>
            </div>
          </div>
        </aside>

        <main className="relative flex-1 flex flex-col min-w-0 pr-4 sm:pr-6 lg:pr-10">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              onClick={() => setNavOpen((v) => !v)}
            >
              {navOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </Button>
            <div className="ml-auto" />
          </div>

          <div className="flex-1 flex flex-col rounded-3xl border border-white/10 bg-black/40 backdrop-blur overflow-hidden">
            <div className="flex-1 relative">
              <Conversation className="absolute inset-0">
                <ConversationContent>
                  {messages.length === 0 ? (
                    <ConversationEmptyState
                      title="Generate videos with Veo 3.1"
                      description="Upload images, tag avatars with @, and describe the video you want."
                      icon={null}
                      className="h-full flex flex-col items-center justify-center p-0"
                    />
                  ) : (
                    messages.map((message: any) => {
                      const text =
                        typeof message.content === "string"
                          ? message.content
                          : Array.isArray(message.parts)
                            ? message.parts
                              .filter((p: any) => p?.type === "text")
                              .map((p: any) => {
                                if (typeof p.text !== "string") return "";
                                const t = p.text.trim();
                                if (/^@[a-zA-Z0-9-]+$/.test(t)) return "";
                                return p.text;
                              })
                              .join("")
                            : "";

                      const fileParts = Array.isArray(message.parts)
                        ? message.parts.filter((p: any) => p?.type === "file" && typeof p.url === "string")
                        : [];

                      const assetParts = Array.isArray(message.parts)
                        ? message.parts.filter((p: any) => p?.type === "asset" && typeof p.previewUrl === "string")
                        : [];

                      const videoToolParts = Array.isArray(message.parts)
                        ? message.parts.filter(
                            (p: any) =>
                              p?.type === "tool-generate_video_veo" &&
                              (p?.state === "output-available" || p?.state === "output-error") &&
                              p?.output,
                          )
                        : [];

                      return (
                        <Message key={message.id} from={message.role} className={message.role === "user" ? "ml-auto" : ""}>
                          <MessageContent>
                            {message.role === "assistant" ? (
                              <div className="space-y-3">
                                {text ? <MessageResponse>{text}</MessageResponse> : null}
                                {videoToolParts.map((tp: any) => {
                                  const out = (tp.output ?? tp.result ?? {}) as VideoToolResult;
                                  const status = out.status ?? "running";
                                  const versionId = out.versionId ?? "";
                                  const previewUrl = Array.isArray(out.previewUrls) ? out.previewUrls[0] : null;
                                  return (
                                    <button
                                      key={tp.toolCallId ?? versionId ?? Math.random()}
                                      type="button"
                                      onClick={() => openVideoModal(out)}
                                      className="w-full text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition overflow-hidden"
                                    >
                                      <div className="flex items-stretch gap-3 p-3">
                                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                                          {previewUrl ? (
                                            <video
                                              src={previewUrl}
                                              className="h-full w-full object-cover"
                                              muted
                                              playsInline
                                              preload="metadata"
                                            />
                                          ) : (
                                            <div className="h-full w-full flex items-center justify-center text-[10px] font-semibold text-slate-300">
                                              VIDEO
                                            </div>
                                          )}
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                            <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                                              Preview
                                            </div>
                                          </div>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <div
                                              className={cn(
                                                "h-2 w-2 rounded-full",
                                                status === "succeeded"
                                                  ? "bg-emerald-400"
                                                  : status === "failed"
                                                    ? "bg-rose-400"
                                                    : "bg-indigo-400 animate-pulse",
                                              )}
                                            />
                                            <div className="text-sm font-semibold text-white">
                                              {status === "succeeded"
                                                ? "Video ready"
                                                : status === "failed"
                                                  ? "Video failed"
                                                  : "Generating video"}
                                            </div>
                                          </div>
                                          <div className="mt-1 text-xs text-slate-400">
                                            {out.message ??
                                              (status === "succeeded"
                                                ? "Click to view and download."
                                                : "Click to view status.")}
                                          </div>
                                          {out.videoId && out.versionId ? (
                                            <div className="mt-2 text-[10px] text-slate-500">
                                              {out.videoId.slice(0, 8)} · v{out.versionId.slice(0, 8)}
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {fileParts.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {fileParts.map((fp: any, fpIdx: number) => (
                                      <div key={`${fp.url}-${fpIdx}`} className="relative h-20 w-20 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={fp.url} alt={fp.name ?? "attachment"} className="h-full w-full object-cover" />
                                        <div className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                          {fp.imageId ?? `image-${fpIdx + 1}`}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {assetParts.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {assetParts.map((ap: any) => (
                                      <div key={`${ap.elementId}-${ap.label}`} className="relative h-20 w-20 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={ap.previewUrl} alt={ap.name ?? ap.label} className="h-full w-full object-cover" />
                                        <div className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                          {ap.label}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <p className="whitespace-pre-wrap">{renderTextWithMentions(text)}</p>
                              </div>
                            )}
                          </MessageContent>
                        </Message>
                      );
                    })
                  )}
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>
            </div>

            <div className="p-4 sm:p-6 lg:p-8 pt-0 z-10">
              <div className="max-w-3xl mx-auto w-full relative">
                <div className="mb-3 rounded-2xl border border-white/10 bg-black/40 p-3 backdrop-blur">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                      References
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={referenceShelf.editMode === "generate" ? "secondary" : "ghost"}
                        className="h-8 rounded-full"
                        onClick={() => setReferenceShelf((s) => ({ ...s, editMode: "generate" }))}
                      >
                        Generate
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={referenceShelf.editMode === "inpaint" ? "secondary" : "ghost"}
                        className="h-8 rounded-full"
                        onClick={() => setReferenceShelf((s) => ({ ...s, editMode: "inpaint" }))}
                      >
                        Edit (Inpaint)
                      </Button>
                      <Dialog open={shelfOpen} onOpenChange={setShelfOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" size="sm" className="h-8 rounded-full bg-white text-black hover:bg-white/90">
                            Add reference
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg border-white/10 bg-black/95 text-white">
                          <DialogHeader>
                            <DialogTitle>Select a reference</DialogTitle>
                          </DialogHeader>
                          <Command className="rounded-xl border border-white/10 bg-black">
                            <CommandInput placeholder="Search assets and images…" />
                            <CommandList>
                              <CommandEmpty>No matches.</CommandEmpty>
                              <CommandGroup heading="Assets / Images">
                                {referenceOptions.map((opt) => (
                                  <CommandItem
                                    key={opt.key}
                                    value={`${opt.label} ${opt.name}`}
                                    onSelect={() => {
                                      setReferenceShelf((s) => {
                                        if (s.pinned.length >= 3) return s;
                                        if (opt.kind === "asset") {
                                          if (s.pinned.some((p) => p.kind === "asset" && p.elementId === opt.elementId)) return s;
                                          return {
                                            ...s,
                                            pinned: [
                                              ...s.pinned,
                                              {
                                                kind: "asset",
                                                elementId: opt.elementId,
                                                label: opt.label,
                                                name: opt.name,
                                                previewUrl: opt.previewUrl,
                                                locked: true,
                                              },
                                            ],
                                          };
                                        }
                                        if (s.pinned.some((p) => p.kind === "upload" && p.uploadId === opt.uploadId)) return s;
                                        return {
                                          ...s,
                                          pinned: [
                                            ...s.pinned,
                                            {
                                              kind: "upload",
                                              uploadId: opt.uploadId,
                                              imageId: opt.imageId,
                                              label: opt.label,
                                              name: opt.name,
                                              previewUrl: opt.previewUrl,
                                              locked: false,
                                            },
                                          ],
                                        };
                                      });
                                      setShelfOpen(false);
                                    }}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={opt.previewUrl} alt={opt.name} className="mr-2 h-8 w-8 rounded-md object-cover ring-1 ring-white/10" />
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold">{`@${opt.label}`}</div>
                                      <div className="truncate text-[11px] text-slate-400">{opt.name}</div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                          <div className="mt-2 text-xs text-slate-400">
                            Veo supports up to 3 reference images. Pin your character for consistency.
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {referenceShelf.pinned.length === 0 ? (
                      <div className="text-sm text-slate-400">No pinned references yet.</div>
                    ) : (
                      referenceShelf.pinned.map((r) => (
                        <div
                          key={r.kind === "asset" ? `asset:${r.elementId}` : `upload:${r.uploadId}`}
                          className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.previewUrl} alt={r.name} className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/10" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white">{`@${r.label}`}</div>
                            <div className="max-w-[180px] truncate text-[10px] text-slate-400">{r.name}</div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 rounded-full px-2 text-[11px] text-slate-200 hover:bg-white/10"
                            onClick={() =>
                              setReferenceShelf((s) => ({
                                ...s,
                                pinned: s.pinned.map((p) => {
                                  const same =
                                    (p.kind === "asset" &&
                                      r.kind === "asset" &&
                                      p.elementId === r.elementId) ||
                                    (p.kind === "upload" &&
                                      r.kind === "upload" &&
                                      p.uploadId === r.uploadId);
                                  return same ? { ...p, locked: !p.locked } : p;
                                }),
                              }))
                            }
                          >
                            {r.locked ? "Locked" : "Replaceable"}
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-full text-slate-300 hover:bg-white/10"
                            onClick={() =>
                              setReferenceShelf((s) => ({
                                ...s,
                                pinned: s.pinned.filter((p) => {
                                  if (r.kind === "asset" && p.kind === "asset") return p.elementId !== r.elementId;
                                  if (r.kind === "upload" && p.kind === "upload") return p.uploadId !== r.uploadId;
                                  return true;
                                }),
                              }))
                            }
                          >
                            ×
                          </Button>
                        </div>
                      ))
                    )}
                  </div>

                  {referenceShelf.editMode === "inpaint" && (
                    <div className="mt-4 border-t border-white/10 pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                          Mask
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button type="button" size="sm" variant="secondary" className="h-8 rounded-full">
                              Pick mask image
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg border-white/10 bg-black/95 text-white">
                            <DialogHeader>
                              <DialogTitle>Select mask image</DialogTitle>
                            </DialogHeader>
                            <Command className="rounded-xl border border-white/10 bg-black">
                              <CommandInput placeholder="Search images…" />
                              <CommandList>
                                <CommandEmpty>No images.</CommandEmpty>
                                <CommandGroup heading="Images">
                                  {maskOptions.map((opt) => (
                                    <CommandItem
                                      key={opt.uploadId}
                                      value={`${opt.imageId} ${opt.name}`}
                                      onSelect={() => {
                                        setReferenceShelf((s) => ({
                                          ...s,
                                          maskUploadId: opt.uploadId,
                                          maskImageId: opt.imageId,
                                        }));
                                      }}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={opt.previewUrl} alt={opt.name} className="mr-2 h-8 w-8 rounded-md object-cover ring-1 ring-white/10" />
                                      <div className="min-w-0">
                                        <div className="text-sm font-semibold">{`@${opt.imageId}`}</div>
                                        <div className="truncate text-[11px] text-slate-400">{opt.name}</div>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                            <div className="mt-2 text-xs text-slate-400">
                              Mask should be a black/white image where white indicates the area to change.
                            </div>
                          </DialogContent>
                        </Dialog>
                        {selectedMask ? (
                          <div className="ml-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={selectedMask.previewUrl} alt={selectedMask.name} className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/10" />
                            <div className="text-xs font-semibold text-white">{`@${selectedMask.imageId}`}</div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-full text-slate-300 hover:bg-white/10"
                              onClick={() => setReferenceShelf((s) => ({ ...s, maskUploadId: undefined, maskImageId: undefined }))}
                            >
                              ×
                            </Button>
                          </div>
                        ) : (
                          <div className="ml-auto text-sm text-slate-400">No mask selected.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <MultimodalInput
                  chatId={`project:${project.id}`}
                  input={input}
                  setInput={setInput}
                  status={status}
                  stop={stop}
                  attachments={attachments}
                  setAttachments={setAttachments}
                  availableImages={availableImages}
                  assetSuggestions={assetSuggestions}
                  sendMessage={sendMessage}
                  sendOptions={() => ({
                    body: {
                      projectId: project.id,
                      referenceSet: buildReferenceSetPayload(referenceShelf),
                      editContext:
                        referenceShelf.editMode === "inpaint"
                          ? { mode: "inpaint", maskUploadId: referenceShelf.maskUploadId }
                          : { mode: "generate" },
                    },
                  })}
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      <Dialog
        open={videoModalOpen}
        onOpenChange={(o) => {
          setVideoModalOpen(o);
          if (!o) {
            setActiveVideo(null);
            setActiveVideoPreviewUrls([]);
            setLoadingPreview(false);
          }
        }}
      >
        <DialogContent className="max-w-5xl border-white/10 bg-black/95 text-white">
          <DialogHeader>
            <DialogTitle>Video Preview</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
            <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
              {loadingPreview ? (
                <div className="flex h-[420px] items-center justify-center text-sm text-slate-300">
                  Loading preview…
                </div>
              ) : activeVideoPreviewUrls[0] ? (
                <video
                  key={activeVideoPreviewUrls[0]}
                  src={activeVideoPreviewUrls[0]}
                  controls
                  preload="metadata"
                  className="h-[420px] w-full object-contain bg-black"
                />
              ) : (
                <div className="flex h-[420px] items-center justify-center text-sm text-slate-300">
                  {activeVideo?.status === "running"
                    ? "Still generating. Check back soon."
                    : "No preview available."}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">Details</div>
                {activeVideo?.videoId ? (
                  <Button asChild size="sm" variant="secondary" className="rounded-full">
                    <Link href={`/dashboard/projects/${project.id}/videos/${activeVideo.videoId}${activeVideo.versionId ? `?version=${activeVideo.versionId}` : ""}`}>
                      Open in library
                    </Link>
                  </Button>
                ) : null}
              </div>

              <div className="mt-3 space-y-2 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Model</span>
                  <span>Veo 3.1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className="capitalize">{activeVideo?.status ?? "running"}</span>
                </div>
                {activeVideo?.operationName ? (
                  <div className="pt-2 text-[10px] text-slate-500 break-all">
                    {activeVideo.operationName}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {activeVideoPreviewUrls[0] ? (
                  <a
                    href={activeVideoPreviewUrls[0]}
                    download
                    className="inline-flex items-center justify-center rounded-xl bg-white text-black px-3 py-2 text-sm font-semibold hover:bg-white/90"
                  >
                    Download
                  </a>
                ) : (
                  <div className="text-xs text-slate-400">
                    Download will appear when the video is ready.
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
