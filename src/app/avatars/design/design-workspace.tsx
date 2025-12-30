"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import {
  ArrowLeft,
  CopyIcon,
  Menu,
  Share2,
  Sparkles,
  User,
  Bot,
  Loader2,
  Maximize2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalStorage } from "usehooks-ts";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { DefaultChatTransport } from 'ai';
import { api } from "@/trpc/react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MultimodalInput, type ChatAttachment } from "@/components/chat/multimodal-input";
import { signStoragePath, signStoragePaths } from "@/lib/supabase/signing-client";

export default function AvatarDesignWorkspaceClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialId = searchParams.get("id") || searchParams.get("elementId");
  const initialImage = searchParams.get("image") || "";
  const initialVersionId = searchParams.get("version");
  const fallbackImage = "/images/placeholder-avatar.svg";
  const [elementId, setElementId] = useState<string | null>(initialId);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(initialVersionId);
  const [currentImage, setCurrentImage] = useState(initialImage || fallbackImage);
  const [model, setModel] = useState("nano-banana-2.5");
  const [userId, setUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const chatId = useMemo(() => `avatar-design:${initialId ?? elementId ?? "new"}`, [initialId, elementId]);
  const [storedMessages, setStoredMessages] = useLocalStorage<any[]>(
    `${chatId}:messages`,
    [],
  );

  const updateImageMapOperations = ['tool-generate_avatar', 'tool-edit_generated_avatar']

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  const elementQuery = api.elements.getById.useQuery(
    { id: elementId ?? "", userId: userId ?? "" },
    {
      enabled: Boolean(elementId && userId),
    },
  );
  const isFetchingElement = elementQuery.isFetching;

  const versionsQuery = api.elements.listVersions.useQuery(
    { elementId: elementId ?? "", userId: userId ?? "" },
    { enabled: Boolean(elementId && userId) },
  );

  const selectedVersion = useMemo(() => {
    const versions = versionsQuery.data ?? [];
    if (selectedVersionId) {
      return versions.find((v: any) => v.id === selectedVersionId) ?? null;
    }
    return versions[0] ?? null; // latest
  }, [selectedVersionId, versionsQuery.data]);

  useEffect(() => {
    const latestId = elementQuery.data?.latestVersion?.id ?? null;
    if (!selectedVersionId && latestId) {
      setSelectedVersionId(latestId);
    }
  }, [elementQuery.data?.latestVersion?.id, selectedVersionId]);

  useEffect(() => {
    if (!selectedVersion?.id) return;
    if (!selectedVersion.imageUrl) return;
    if (selectedVersion.imageUrl !== currentImage) setCurrentImage(selectedVersion.imageUrl);
  }, [selectedVersion?.id, selectedVersion?.imageUrl]);

  const lastSignedStoragePathRef = useRef<string | null>(null);
  useEffect(() => {
    const data = elementQuery.data;
    const storagePath = data?.asset?.storagePath ?? null;
    const publicUrl = data?.asset?.publicUrl ?? null;
    const latestVersionId = data?.latestVersion?.id ?? null;
    if (selectedVersionId && latestVersionId && selectedVersionId !== latestVersionId) {
      // User is viewing a historical version; avoid overwriting preview with latest asset.
      return;
    }
    if (storagePath && storagePath !== lastSignedStoragePathRef.current) {
      lastSignedStoragePathRef.current = storagePath;
      (async () => {
        const signed = await signStoragePath(storagePath);
        if (signed && signed !== currentImage) {
          setCurrentImage(signed);
          return;
        }
        if (publicUrl && publicUrl !== currentImage) {
          setCurrentImage(publicUrl);
        }
      })();
    } else if (publicUrl && publicUrl !== currentImage && !storagePath) {
      setCurrentImage(publicUrl);
    }
    if (data?.id && !elementId) {
      setElementId(data.id);
    }
  }, [currentImage, elementId, elementQuery.data, selectedVersionId]);

  const currentPrompt = useMemo(() => {
    const versions = versionsQuery.data ?? [];
    const selected = selectedVersionId ? versions.find((v: any) => v.id === selectedVersionId) : null;
    const prompt = selected?.prompt ?? elementQuery.data?.latestVersion?.prompt ?? null;
    return prompt || null;
  }, [elementQuery.data?.latestVersion?.prompt, selectedVersionId, versionsQuery.data]);
  const elementData = elementQuery.data;
  const hasBaseImage = Boolean(currentImage);

  const chatHelpers = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat/avatar-design',
      body: {}
    }),
    messages: [],
  }) as any;

  const { messages, sendMessage, append, isLoading } = chatHelpers ?? {};
  const safeAppend = (sendMessage ?? append) as any;
  const safeInput = input;
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
            imageId: p.imageId,
          });
        }
      }
    }
    return out;
  }, [messages]);

  useEffect(() => {
    if (!chatHelpers?.setMessages) return;
    if ((messages?.length ?? 0) > 0) return;
    if ((storedMessages?.length ?? 0) === 0) return;
    (async () => {
      const storagePaths: string[] = [];
      for (const m of storedMessages) {
        for (const p of (m as any)?.parts ?? []) {
          if (p?.type === "file" && typeof p.storagePath === "string") {
            storagePaths.push(p.storagePath);
          }
        }
      }

      if (storagePaths.length === 0) {
        chatHelpers.setMessages(storedMessages);
        return;
      }

      const signedUrls = await signStoragePaths(storagePaths);

      const refreshed = storedMessages.map((m: any) => ({
        ...m,
        parts: Array.isArray(m.parts)
          ? m.parts.map((p: any) =>
            p?.type === "file" && typeof p.storagePath === "string" && signedUrls[p.storagePath]
              ? { ...p, url: signedUrls[p.storagePath] }
              : p,
          )
          : m.parts,
      }));

      chatHelpers.setMessages(refreshed);
      setStoredMessages(refreshed);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!Array.isArray(messages)) return;
    setStoredMessages(messages);
  }, [messages, setStoredMessages]);

  const renderTextWithImageRefs = (text: string) => {
    const parts = text.split(/(@image-\d+)/g);
    return parts.map((part, idx) =>
      /^@image-\d+$/.test(part) ? (
        <span
          key={`${part}-${idx}`}
          className="rounded-md bg-indigo-500/20 px-1.5 py-0.5 font-semibold text-indigo-200"
        >
          {part}
        </span>
      ) : (
        <span key={`${idx}`}>{part}</span>
      ),
    );
  };

  const lastAutoSelectedVersionRef = useRef<string | null>(null);
  useEffect(() => {
    const assistantMessages = (messages ?? []).filter((m: any) => m.role === "assistant");
    assistantMessages.forEach((message: any) => {
      const parts = message.parts || [];
      let imageResultPart: any = null;
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const t = parts[i];
        if (updateImageMapOperations.includes(t.type) && t.state === "output-available") {
          imageResultPart = t;
          break;
        }
      }
      if (imageResultPart) {
        const { elementId: newElementId, avatarId: newAvatarId, imageUrl } = imageResultPart.output;
        const newVersionId = imageResultPart.output?.versionId ?? null;
        setCurrentImage(imageUrl);
        const fallbackId = newElementId || newAvatarId;
        if (fallbackId && !elementId) {
          setElementId(fallbackId);
        }
        if (newVersionId) {
          // Only auto-select a version when a NEW generation/edit produces a new version.
          if (lastAutoSelectedVersionRef.current === newVersionId) return;
          lastAutoSelectedVersionRef.current = newVersionId;
          setSelectedVersionId(newVersionId);

          const next = new URLSearchParams(window.location.search);
          next.set("version", newVersionId);
          router.replace(`/avatars/design?${next.toString()}`);
        }
      }
    });
  }, [messages, elementId, router]);

  return (
    <div className="h-screen bg-[#030304] text-white flex flex-col font-sans overflow-hidden">
      {/* HEADER */}
      <header className="flex items-center justify-between border-b border-white/5 px-8 py-5 shrink-0 bg-black/40 backdrop-blur-md z-20">
        <div className="flex items-center gap-5">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-slate-400 hover:text-white hover:bg-white/10"
            onClick={() => router.push("/avatars")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.4em] text-indigo-400/80 font-bold mb-0.5">Studio Lab</span>
            <h1 className="text-xl font-serif tracking-tight text-white flex items-center gap-2">
              Design with AI
              <Sparkles className="h-4 w-4 text-indigo-400" />
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center mr-4 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
            <span className="text-xs font-medium text-slate-300">Live Editor</span>
            {isFetchingElement && (
              <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-400">
                Syncing
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white">
              <CopyIcon className="h-4 w-4" />
            </Button>
            <div className="w-[1px] h-4 bg-white/10 mx-1" />
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT: CANVAS AREA */}
        <section className="flex-1 p-8 flex flex-col items-center justify-center bg-[#08080a] relative overflow-hidden">
          {/* BACKGROUND FILL (Premium blur look) */}
          <div className="absolute inset-0 z-0">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImage}
                src={currentImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="w-full h-full object-cover blur-[100px] scale-110"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-b from-[#030304]/80 via-transparent to-[#030304]/80" />
          </div>

          {/* MAIN IMAGE CONTAINER */}
          <div className="relative z-10 w-full max-w-2xl md:h-full max-h-[85vh] flex items-center justify-center group">
            <div className="absolute -inset-4 bg-indigo-500/10 blur-3xl rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

            <motion.div
              layout
              className="relative h-full w-auto max-w-full overflow-hidden rounded-[32px] border border-white/10 shadow-2xl shadow-black/80 ring-1 ring-white/5 flex items-center justify-center bg-black/20"
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImage}
                  src={currentImage}
                  alt="Avatar Preview"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="h-full w-full object-contain"
                />
              </AnimatePresence>

              {/* OVERLAYS */}
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold">Current Version</p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="text-left hover:opacity-90 transition-opacity"
                        >
                          <h4 className="text-sm font-medium text-white/90">
                            {selectedVersion?.versionNumber
                              ? `v${selectedVersion.versionNumber}`
                              : elementQuery.data?.latestVersion?.versionNumber
                                ? `v${elementQuery.data.latestVersion.versionNumber}`
                                : "v1"}
                          </h4>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg border-white/10 bg-black/95 text-white">
                        <DialogHeader>
                          <DialogTitle>Versions</DialogTitle>
                        </DialogHeader>
                        <Command className="rounded-xl border border-white/10 bg-black">
                          <CommandInput placeholder="Search versions…" />
                          <CommandList>
                            <CommandEmpty>No versions found.</CommandEmpty>
                            <CommandGroup heading="Element versions">
                              {(versionsQuery.data ?? []).map((v: any) => (
                                <CommandItem
                                  key={v.id}
                                  value={`${v.versionNumber} ${v.source ?? ""}`}
                                  onSelect={() => {
                                    if (selectedVersionId === v.id) return;
                                    setSelectedVersionId(v.id);
                                    const next = new URLSearchParams(searchParams.toString());
                                    next.set("version", v.id);
                                    router.replace(`/avatars/design?${next.toString()}`);
                                  }}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={v.imageUrl}
                                    alt={`v${v.versionNumber}`}
                                    className="mr-2 h-10 w-10 rounded-md object-cover ring-1 ring-white/10"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold">
                                      {`v${v.versionNumber}`}{" "}
                                      {v.id === (elementQuery.data?.latestVersion?.id ?? null) ? (
                                        <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 ring-1 ring-inset ring-emerald-500/30">
                                          Latest
                                        </span>
                                      ) : null}
                                      {v.id === selectedVersionId ? (
                                        <span className="ml-2 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold text-indigo-200 ring-1 ring-inset ring-indigo-500/30">
                                          Selected
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="truncate text-[11px] text-slate-400">
                                      {(v.source ?? "unknown").toString()}
                                      {v.diffInstruction ? ` · ${v.diffInstruction}` : ""}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Button size="icon" variant="ghost" className="rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 h-10 w-10">
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {isLoading && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-xl transition-all duration-500">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse" />
                      <Loader2 className="h-10 w-10 text-indigo-400 animate-spin relative z-10" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-medium text-white tracking-tight">AI is working...</span>
                      <span className="text-[10px] uppercase tracking-widest text-slate-400">Rendering details</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {/* RIGHT: CHAT SIDEBAR */}
        <aside className="w-[440px] flex flex-col border-l border-white/5 bg-[#030304]/50 backdrop-blur-sm z-20 h-full overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-black/20 flex items-center justify-between gap-4 shrink-0">
            <div>
              <h3 className="text-xs font-bold tracking-[0.2em] text-indigo-400 uppercase mb-1">Design Assistant</h3>
              <p className="text-[11px] text-slate-500 leading-tight">Describe adjustments and I'll regenerate the look.</p>
            </div>
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold px-1">Engine</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 text-xs text-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '14px' }}
              >
                <option value="nano-banana-2.5">Nano Banana 2.5</option>
                <option value="nano-banana-3">Nano Banana 3.0</option>
              </select>
            </div>
          </div>

          <ScrollArea className="flex-1 px-6 py-4 min-h-0">
            <div className="flex flex-col gap-6 py-4">
              {messages?.map((m: any, idx: number) => {
                const contentText =
                  typeof m.content === "string"
                    ? m.content
                    : Array.isArray(m.content)
                      ? (m.content as any[]).map((p: any) => p?.text ?? "").join("")
                      : "";
                const partsText = Array.isArray(m.parts)
                  ? (m.parts as any[])
                    .map((p: any) =>
                      p?.type === "text" && typeof p.text === "string" && !/^@image-\d+$/.test(p.text.trim())
                        ? p.text
                        : "",
                    )
                    .join("")
                  : "";
                const displayText = contentText || partsText || "";
                const fileParts = Array.isArray(m.parts)
                  ? (m.parts as any[]).filter((p: any) => p?.type === "file" && typeof p.url === "string")
                  : [];

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    key={m.id ?? idx}
                    className={cn("flex gap-3 max-w-[92%]", m.role === 'user' ? "ml-auto flex-row-reverse" : "")}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                      m.role === 'user' ? "bg-white/5 border-white/10" : "bg-indigo-600/20 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                    )}>
                      {m.role === 'user' ? <User className="h-4 w-4 text-slate-400" /> : <Bot className="h-4 w-4 text-indigo-400" />}
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed",
                      m.role === 'user'
                        ? "bg-white/10 text-white border border-white/10 rounded-tr-none"
                        : "bg-indigo-600/10 text-indigo-50 border border-indigo-500/20 rounded-tl-none ring-1 ring-white/5"
                    )}>
                      {fileParts.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
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
                      <span className="whitespace-pre-wrap">{renderTextWithImageRefs(displayText)}</span>
                      {m.toolInvocations?.map((tool: any) => (
                        <div key={tool.toolCallId} className="mt-3 text-[10px] uppercase tracking-widest font-bold text-indigo-400/80 border-t border-white/5 pt-3 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          {'result' in tool ? "SUCCESS: Refined look generated" : "REFINING: Processing visual request..."}
                        </div>
                      ))}
                      {(m.parts || [])
                        .filter((p: any) => typeof p.type === "string" && p.type.startsWith("tool-"))
                        .map((part: any, partIdx: number) => {
                          const stateLabel =
                            part.state === "output-available"
                              ? "Completed"
                              : part.state === "input-available"
                                ? "Running"
                                : "Pending";
                          const toolLabel = part.type.replace("tool-", "").replace(/_/g, " ");
                          return (
                            <div
                              key={`${part.type}-${partIdx}`}
                              className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-[11px] text-slate-200 max-w-[360px]"
                            >
                              <div className="flex items-center gap-2 font-semibold uppercase tracking-wide">
                                <div
                                  className={cn(
                                    "h-2 w-2 rounded-full",
                                    part.state === "output-available"
                                      ? "bg-emerald-400"
                                      : part.state === "input-available"
                                        ? "bg-indigo-400 animate-pulse"
                                        : "bg-slate-400",
                                  )}
                                />
                                <span>{toolLabel}</span>
                                <span className="text-[10px] text-slate-400 lowercase">({stateLabel})</span>
                              </div>
                              {part.errorText && (
                                <div className="text-rose-300 mt-1">{part.errorText}</div>
                              )}
                              {/* Minimal info only */}
                            </div>
                          );
                        })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="p-6 bg-black/30 backdrop-blur-xl border-t border-white/5 shrink-0">
            <MultimodalInput
              chatId={chatId}
              input={safeInput}
              setInput={setInput}
              status={chatHelpers?.status ?? (isLoading ? "streaming" : "ready")}
              stop={chatHelpers?.stop ?? (() => {})}
              attachments={attachments}
              setAttachments={setAttachments}
              availableImages={availableImages}
              sendMessage={safeAppend}
              sendOptions={() => ({
                body: {
                  elementId,
                  currentVersionId: selectedVersionId,
                  currentImage,
                  currentPrompt,
                  elementName: elementData?.name,
                  elementKind: elementData?.kind,
                  model,
                  mode: elementId || hasBaseImage ? "edit" : "new",
                  hasBaseImage,
                },
              })}
              className="rounded-2xl"
            />
            <p className="mt-3 text-[10px] text-center text-slate-500 uppercase tracking-widest font-bold">
              Press enter to send
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
