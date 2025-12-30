"use client";

import equal from "fast-deep-equal";
import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import {
    type ChangeEvent,
    type Dispatch,
    memo,
    type SetStateAction,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import type { ChatStatus } from "ai";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signStoragePaths } from "@/lib/supabase/signing-client";
import {
    PromptInput,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputToolbar,
    PromptInputTools,
} from "./prompt-input";

export type ChatAttachment = {
    url: string;
    name: string;
    contentType?: string;
    storagePath?: string;
    uploadId?: string;
    imageId: string;
};

export type ChatAssetSuggestion = {
    label: string; // without "@"
    name: string;
    elementId: string;
    elementKind: string;
    previewUrl: string;
};

function normalizeImageList(images: ChatAttachment[]) {
    const map = new Map<string, ChatAttachment>();
    for (const img of images) {
        if (!img?.imageId) continue;
        if (!map.has(img.imageId)) map.set(img.imageId, img);
    }
    return Array.from(map.values());
}

function PureMultimodalInput({
    chatId,
    input,
    setInput,
    status,
    stop,
    attachments,
    setAttachments,
    availableImages,
    assetSuggestions,
    sendMessage,
    sendOptions,
    className,
}: {
    chatId: string;
    input: string;
    setInput: Dispatch<SetStateAction<string>>;
    status: ChatStatus;
    stop: () => void;
    attachments: ChatAttachment[];
    setAttachments: Dispatch<SetStateAction<ChatAttachment[]>>;
    availableImages?: ChatAttachment[];
    assetSuggestions?: ChatAssetSuggestion[];
    sendMessage: (message: unknown, options?: unknown) => void;
    sendOptions?: unknown;
    className?: string;
}) {
    const safeInput = input ?? "";
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { width } = useWindowSize();

    const allImages = useMemo(() => {
        const merged = normalizeImageList([...(availableImages ?? []), ...attachments]);
        // Ensure stable ordering by numeric suffix when present.
        return merged.sort((a, b) => {
            const na = Number(a.imageId.replace(/^image-/, ""));
            const nb = Number(b.imageId.replace(/^image-/, ""));
            if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
            return a.imageId.localeCompare(b.imageId);
        });
    }, [availableImages, attachments]);

    const [pendingAssets, setPendingAssets] = useLocalStorage<ChatAssetSuggestion[]>(
        `pending-assets:${chatId}`,
        [],
    );

    const [mentionOpen, setMentionOpen] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionStart, setMentionStart] = useState<number | null>(null);
    const [mentionActiveIndex, setMentionActiveIndex] = useState(0);

    const adjustHeight = useCallback(() => {
        if (textareaRef.current) {
            // Simple auto-height logic handled by PromptInputTextarea ideally,
            // but explicit height adjustment can be useful.
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, []);

    const closeMentions = useCallback(() => {
        setMentionOpen(false);
        setMentionQuery("");
        setMentionStart(null);
        setMentionActiveIndex(0);
    }, []);

    const getMentionSuggestions = useCallback(() => {
        const q = mentionQuery.trim().toLowerCase();
        const images = allImages.map((a) => ({
            kind: "image" as const,
            key: `image:${a.imageId}`,
            label: a.imageId,
            name: a.name,
            previewUrl: a.url,
            image: a,
        }));
        const assets = (assetSuggestions ?? []).map((a) => ({
            kind: "asset" as const,
            key: `asset:${a.elementId}`,
            label: a.label,
            name: a.name,
            previewUrl: a.previewUrl,
            asset: a,
        }));
        const all = [...images, ...assets];
        if (!q) return all;
        return all.filter((item) => item.label.toLowerCase().includes(q) || item.name.toLowerCase().includes(q));
    }, [allImages, assetSuggestions, mentionQuery]);

    const updateMentionsFromCaret = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        const caret = el.selectionStart ?? 0;
        const before = safeInput.slice(0, caret);
        const match = before.match(/(^|\s)@([a-zA-Z0-9-]*)$/);
        if (!match || (allImages.length === 0 && (assetSuggestions?.length ?? 0) === 0)) {
            closeMentions();
            return;
        }
        const query = match[2] ?? "";
        const atIndex = caret - query.length - 1;
        setMentionOpen(true);
        setMentionQuery(query);
        setMentionStart(atIndex);
        setMentionActiveIndex(0);
    }, [allImages.length, closeMentions, safeInput]);

    useEffect(() => {
        if (textareaRef.current) {
            adjustHeight();
        }
    }, [adjustHeight, input]);

    const [localStorageInput, setLocalStorageInput] = useLocalStorage(
        `input:${chatId}`,
        ""
    );

    useEffect(() => {
        if (textareaRef.current) {
            const domValue = textareaRef.current.value;
            const finalValue = domValue || localStorageInput || "";
            setInput(finalValue);
            adjustHeight();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setLocalStorageInput(safeInput);
    }, [safeInput, setLocalStorageInput]);

    const [localStorageAttachments, setLocalStorageAttachments] = useLocalStorage<ChatAttachment[]>(
        `attachments:${chatId}`,
        [],
    );

    const [nextImageIndex, setNextImageIndex] = useLocalStorage<number>(
        `image-index:${chatId}`,
        1,
    );

    useEffect(() => {
        const initial = attachments.length > 0 ? attachments : localStorageAttachments;
        if (initial.length === 0) return;

        (async () => {
            let ensured = initial;
            if (ensured.some((a) => !a.imageId)) {
                let idx = nextImageIndex;
                ensured = ensured.map((a) => {
                    if (a.imageId) return a;
                    const imageId = `image-${idx}`;
                    idx += 1;
                    return { ...a, imageId };
                });
                setNextImageIndex(idx);
            }

            const storagePaths = ensured
                .map((a) => a.storagePath)
                .filter((p): p is string => typeof p === "string" && p.length > 0);

            if (storagePaths.length === 0) {
                if (attachments.length === 0) setAttachments(ensured);
                return;
            }

            const signedUrls = await signStoragePaths(storagePaths);

            const refreshed = ensured.map((a) =>
                a.storagePath && signedUrls[a.storagePath] ? { ...a, url: signedUrls[a.storagePath] } : a,
            );
            setAttachments(refreshed);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setLocalStorageAttachments(attachments);
    }, [attachments, setLocalStorageAttachments]);

    const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(event.target.value);
        adjustHeight();
        requestAnimationFrame(() => updateMentionsFromCaret());
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadQueue, setUploadQueue] = useState<string[]>([]);

    const applyMention = useCallback(
        (label: string) => {
            const el = textareaRef.current;
            if (!el) return;
            const caret = el.selectionStart ?? safeInput.length;
            const start = mentionStart ?? Math.max(0, caret - 1);
            const before = safeInput.slice(0, start);
            const after = safeInput.slice(caret);
            const insertion = `@${label} `;
            const next = `${before}${insertion}${after}`;
            setInput(next);
            requestAnimationFrame(() => {
                const nextCaret = before.length + insertion.length;
                el.focus();
                el.setSelectionRange(nextCaret, nextCaret);
            });
            closeMentions();
        },
        [closeMentions, mentionStart, safeInput, setInput],
    );

    const submitForm = useCallback(() => {
        sendMessage(
            {
                role: "user",
                parts: [
                    ...attachments.flatMap((a) => [
                        { type: "text" as const, text: `@${a.imageId}` },
                        {
                            type: "file" as const,
                            url: a.url,
                            name: a.name,
                            mediaType: a.contentType,
                            storagePath: a.storagePath,
                            uploadId: a.uploadId,
                            imageId: a.imageId,
                        },
                    ]),
                    ...pendingAssets.flatMap((a) => [
                        { type: "text" as const, text: `@${a.label}` },
                        {
                            type: "asset" as const,
                            label: a.label,
                            name: a.name,
                            elementId: a.elementId,
                            elementKind: a.elementKind,
                            previewUrl: a.previewUrl,
                        },
                    ]),
                    { type: "text" as const, text: safeInput },
                ],
            },
            typeof sendOptions === "function" ? sendOptions() : sendOptions,
        );

        setAttachments([]);
        setPendingAssets([]);
        setLocalStorageInput("");
        setInput("");

        if (width && width > 768) {
            textareaRef.current?.focus();
        }
    }, [
        safeInput,
        setInput,
        attachments,
        pendingAssets,
        sendMessage,
        sendOptions,
        setAttachments,
        setPendingAssets,
        setLocalStorageInput,
        width,
    ]);

    const uploadFile = useCallback(async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("/api/files/upload", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                const { url, pathname, contentType, storagePath } = data as {
                    url: string;
                    pathname: string;
                    contentType: string;
                    storagePath: string;
                    uploadId: string | null;
                };

                return {
                    url,
                    name: pathname,
                    contentType,
                    storagePath,
                    uploadId: data.uploadId ?? undefined,
                } satisfies Omit<ChatAttachment, "imageId">;
            }

            const { error } = (await response.json().catch(() => ({ error: "Upload failed" }))) as {
                error?: string;
            };
            toast.error(error || "Upload failed");
        } catch {
            toast.error("Failed to upload file, please try again!");
        }
    }, []);

    const handleFileChange = useCallback(
        async (event: ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files || []);
            setUploadQueue(files.map((file) => file.name));

            try {
                const uploaded = await Promise.all(files.map((f) => uploadFile(f)));
                const ok = uploaded.filter(Boolean) as Omit<ChatAttachment, "imageId">[];
                const withIds = ok.map((a, idx) => ({
                    ...a,
                    imageId: `image-${nextImageIndex + idx}`,
                }));
                setAttachments((curr) => [...curr, ...withIds]);
                setNextImageIndex(nextImageIndex + withIds.length);
            } finally {
                setUploadQueue([]);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        },
        [setAttachments, uploadFile, nextImageIndex, setNextImageIndex],
    );

    const handlePaste = useCallback(
        async (event: ClipboardEvent) => {
            const items = event.clipboardData?.items;
            if (!items) return;

            const imageItems = Array.from(items).filter((item) => item.type.startsWith("image/"));
            if (imageItems.length === 0) return;

            event.preventDefault();
            setUploadQueue((prev) => [...prev, "Pasted image"]);

            try {
                const uploaded = await Promise.all(
                    imageItems
                        .map((item) => item.getAsFile())
                        .filter((f): f is File => f !== null)
                        .map((f) => uploadFile(f)),
                );
                const ok = uploaded.filter(Boolean) as Omit<ChatAttachment, "imageId">[];
                const withIds = ok.map((a, idx) => ({
                    ...a,
                    imageId: `image-${nextImageIndex + idx}`,
                }));
                setAttachments((curr) => [...curr, ...withIds]);
                setNextImageIndex(nextImageIndex + withIds.length);
            } finally {
                setUploadQueue([]);
            }
        },
        [setAttachments, uploadFile, nextImageIndex, setNextImageIndex],
    );

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.addEventListener("paste", handlePaste);
        return () => textarea.removeEventListener("paste", handlePaste);
    }, [handlePaste]);

    return (
        <div className={cn("relative flex w-full flex-col gap-4", className)}>
            <input
                className="hidden"
                multiple
                onChange={handleFileChange}
                ref={fileInputRef}
                type="file"
                accept="image/*,video/mp4"
            />

            <PromptInput
                onSubmit={(event) => {
                    event.preventDefault();
                    if (status !== "ready" && status !== "error") {
                        // stop(); allow stopping?
                        return;
                    }
                    if (!safeInput.trim() && attachments.length === 0 && pendingAssets.length === 0) {
                        return;
                    }
                    submitForm(); // Need to ensure parent handles this or we call append directly.
                    // Wait, `submitForm` calls `sendMessage`. PROPS mismatch risk.
                    // I will update the prop type to `append` later if needed.
                }}
            >
                {(attachments.length > 0 || pendingAssets.length > 0 || uploadQueue.length > 0) && (
                    <div className="flex flex-row items-end gap-2 overflow-x-auto px-3 pt-3">
                        {attachments.map((a) => (
                            <div
                                key={a.url}
                                className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5"
                                title={`Reference as @${a.imageId}`}
                            >
                                <button
                                    type="button"
                                    className="absolute inset-0"
                                    onClick={() =>
                                        setInput((prev) =>
                                            `${prev}${prev.endsWith(" ") || prev.length === 0 ? "" : " "}@${a.imageId}`,
                                        )
                                    }
                                />
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                {a.contentType?.startsWith("video/") ? (
                                    <div className="flex h-full w-full items-center justify-center bg-black/50 text-[10px] font-semibold text-slate-200">
                                        VIDEO
                                    </div>
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                                )}
                                <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                    {a.imageId}
                                </span>
                                <button
                                    type="button"
                                    className="absolute right-1 top-1 rounded bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setAttachments((curr) => curr.filter((x) => x.url !== a.url));
                                    }}
                                    aria-label={`Remove ${a.imageId}`}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}

                        {pendingAssets.map((a) => (
                            <div
                                key={a.elementId}
                                className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5"
                                title={`Reference as @${a.label}`}
                            >
                                <button
                                    type="button"
                                    className="absolute inset-0"
                                    onClick={() =>
                                        setInput((prev) =>
                                            `${prev}${prev.endsWith(" ") || prev.length === 0 ? "" : " "}@${a.label}`,
                                        )
                                    }
                                />
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={a.previewUrl} alt={a.name} className="h-full w-full object-cover" />
                                <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                    {a.label}
                                </span>
                                <button
                                    type="button"
                                    className="absolute right-1 top-1 rounded bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setPendingAssets((curr) => curr.filter((x) => x.elementId !== a.elementId));
                                    }}
                                    aria-label={`Remove ${a.label}`}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}

                        {uploadQueue.map((filename) => (
                            <div
                                key={filename}
                                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[10px] text-slate-400"
                            >
                                Uploading…
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex flex-row items-start gap-1 sm:gap-2">
                    <PromptInputTextarea
                        onChange={handleInput}
                        value={safeInput}
                        ref={textareaRef}
                        onKeyDown={(e) => {
                            if (mentionOpen) {
                                const suggestions = getMentionSuggestions();
                                if (e.key === "Escape") {
                                    e.preventDefault();
                                    closeMentions();
                                    return;
                                }
                                if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    setMentionActiveIndex((i) =>
                                        suggestions.length === 0 ? 0 : (i + 1) % suggestions.length,
                                    );
                                    return;
                                }
                                if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    setMentionActiveIndex((i) =>
                                        suggestions.length === 0 ? 0 : (i - 1 + suggestions.length) % suggestions.length,
                                    );
                                    return;
                                }
                                if (e.key === "Enter" || e.key === "Tab") {
                                    if (suggestions.length > 0) {
                                        e.preventDefault();
                                        const selected = suggestions[Math.max(0, Math.min(mentionActiveIndex, suggestions.length - 1))];
                                        if (selected.kind === "image") {
                                            applyMention(selected.label);
                                        } else if (selected.kind === "asset") {
                                            applyMention(selected.label);
                                            setPendingAssets((curr) =>
                                                curr.some((x) => x.elementId === selected.asset.elementId) ? curr : [...curr, selected.asset],
                                            );
                                        }
                                        return;
                                    }
                                }
                            }

                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                if (status === 'ready' || status === 'error') {
                                    if (!safeInput.trim() && attachments.length === 0 && pendingAssets.length === 0) return;
                                    submitForm();
                                }
                            }
                        }}
                        onKeyUp={() => updateMentionsFromCaret()}
                        onClick={() => updateMentionsFromCaret()}
                    />
                </div>
                {mentionOpen && getMentionSuggestions().length > 0 && (
                    <div className="relative px-3">
                        <div className="absolute bottom-2 left-3 right-3 z-50 w-[min(420px,100%)] rounded-xl border border-white/10 bg-black/90 backdrop-blur-md shadow-2xl">
                            <div className="px-3 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Mentions
                            </div>
                            <div className="max-h-44 overflow-auto p-2">
                                {getMentionSuggestions().map((a, idx) => (
                                    <button
                                        key={a.key}
                                        type="button"
                                        className={cn(
                                            "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors",
                                            idx === mentionActiveIndex
                                                ? "bg-white/10 text-white"
                                                : "text-slate-200 hover:bg-white/5",
                                        )}
                                        onMouseEnter={() => setMentionActiveIndex(idx)}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            if (a.kind === "image") {
                                                applyMention(a.label);
                                                return;
                                            }
                                            applyMention(a.label);
                                            setPendingAssets((curr) =>
                                                curr.some((x) => x.elementId === a.asset.elementId) ? curr : [...curr, a.asset],
                                            );
                                        }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        {a.kind === "image" && a.image.contentType?.startsWith("video/") ? (
                                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10 text-[10px] font-semibold text-slate-200">
                                                VID
                                            </div>
                                        ) : (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={a.previewUrl}
                                                alt={a.name}
                                                className="h-9 w-9 rounded-md object-cover ring-1 ring-white/10"
                                            />
                                        )}
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold leading-tight">{`@${a.label}`}</div>
                                            <div className="truncate text-[11px] text-slate-400">
                                                {a.kind === "asset" ? `Asset · ${a.name}` : a.name}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                <PromptInputToolbar>
                    <PromptInputTools>
                        <Button
                            className="h-8 w-8 rounded-lg p-0 hover:bg-white/10 text-slate-400 hover:text-white"
                            onClick={(e) => {
                                e.preventDefault();
                                fileInputRef.current?.click();
                            }}
                            variant="ghost"
                            type="button"
                        >
                            <Paperclip className="h-4 w-4" />
                        </Button>
                    </PromptInputTools>

                    {status === "streaming" ? (
                        <Button
                            className="h-8 w-8 rounded-full bg-slate-100 text-slate-900 hover:bg-slate-200"
                            onClick={(e) => {
                                e.preventDefault();
                                stop();
                            }}
                            type="button"
                        >
                            <Square className="h-3 w-3 fill-current" />
                        </Button>
                    ) : (
                        <PromptInputSubmit
                            disabled={(!safeInput.trim() && attachments.length === 0 && pendingAssets.length === 0) || status !== 'ready' || uploadQueue.length > 0}
                            status={status}
                        >
                            <ArrowUp className="h-4 w-4" />
                        </PromptInputSubmit>
                    )}
                </PromptInputToolbar>
            </PromptInput>
        </div>
    );
}

export const MultimodalInput = memo(
    PureMultimodalInput,
    (prevProps, nextProps) => {
        if (prevProps.input !== nextProps.input) return false;
        if (prevProps.status !== nextProps.status) return false;
        if (!equal(prevProps.attachments, nextProps.attachments)) return false;
        return true;
    }
);
