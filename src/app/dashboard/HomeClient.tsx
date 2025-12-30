"use client";

import Link from "next/link";
import {
    ArrowLeft,
    Folder,
    Home,
    LayoutTemplate,
    Palette,
    PanelLeftClose,
    PanelLeftOpen,
    Plus,
    Sparkles,
    User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useLocalStorage } from "usehooks-ts";
import { DefaultChatTransport } from "ai";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signStoragePaths } from "@/lib/supabase/signing-client";
import {
    Conversation,
    ConversationContent,
    ConversationEmptyState,
    ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { PromptInput } from "@/components/ai-elements/prompt-input";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { MultimodalInput, type ChatAttachment } from "@/components/chat/multimodal-input";

export function HomeClient() {
    const [navOpen, setNavOpen] = useState(true);

    const [input, setInput] = useState("");

    const chatHelpers = useChat({
        transport: new DefaultChatTransport({
            api: "/api/chat",
            body: {},
        }),
        messages: [],
    }) as any;

    const { messages, isLoading, stop, status } = chatHelpers;

    const [storedMessages, setStoredMessages] = useLocalStorage<any[]>("home-chat:messages", []);

    useEffect(() => {
        if (!chatHelpers?.setMessages) return;
        if ((messages?.length ?? 0) > 0) return;
        if (storedMessages.length === 0) return;
        (async () => {
            const storagePaths: string[] = [];
            for (const m of storedMessages) {
                for (const p of m?.parts ?? []) {
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
        if (Array.isArray(messages)) setStoredMessages(messages);
    }, [messages, setStoredMessages]);

    const sendMessage = (message: any, options?: any) => {
        if (chatHelpers.sendMessage) {
            chatHelpers.sendMessage(message, options);
        } else if (chatHelpers.append) {
            chatHelpers.append(message, options);
        } else {
            console.error("No send method found in useChat return values:", chatHelpers);
        }
    };

    const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
    const availableImages = (() => {
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
    })();

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#05060a] via-[#0b0c11] to-black text-slate-100">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(99,102,241,0.12),transparent_40%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.12),transparent_35%)]" />
            </div>

            <div className="relative flex w-full h-screen overflow-hidden py-6 gap-4">
                {/* SIDEBAR */}
                <aside
                    className={cn(
                        "fixed inset-y-0 left-0 z-50 flex flex-col justify-between border-r border-white/10 bg-black/80 backdrop-blur-xl transition-all duration-300 ease-in-out lg:static lg:bg-transparent lg:border-none lg:shadow-none",
                        navOpen ? "w-[260px] translate-x-0" : "w-0 -translate-x-full opacity-0 lg:w-0 lg:translate-x-0 lg:opacity-0"
                    )}
                >
                    <div className="flex h-full w-full flex-col gap-2 p-3 lg:rounded-3xl lg:border lg:border-white/10 lg:bg-black/50 lg:p-4 lg:shadow-[0_25px_70px_rgba(0,0,0,0.45)]">

                        <div className="flex items-center justify-between px-2 pb-4 pt-2">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
                                    <Sparkles className="h-5 w-5 text-white" />
                                </div>
                                <span className="text-lg font-bold tracking-tight text-white">VidNova</span>
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
                            <Link href="/avatars/create/video">
                                <Plus className="h-5 w-5" />
                                Create Video
                            </Link>
                        </Button>

                        <div className="flex-1 space-y-6 overflow-y-auto px-1 py-4 scrollbar-none">

                            <div className="space-y-1">
                                <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl px-3 py-2 bg-white/10 text-white" asChild>
                                    <Link href="/dashboard">
                                        <Home className="h-5 w-5" />
                                        Home
                                    </Link>
                                </Button>
                                <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl px-3 py-2 text-slate-400 hover:bg-white/10 hover:text-white" asChild>
                                    <Link href="/dashboard/projects">
                                        <Folder className="h-5 w-5" />
                                        Projects
                                    </Link>
                                </Button>
                                <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl px-3 py-2 text-slate-400 hover:bg-white/10 hover:text-white" disabled>
                                    <User className="h-5 w-5" />
                                    Video Agent <span className="ml-auto text-[10px] uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">Beta</span>
                                </Button>
                            </div>

                            <div>
                                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Assets</p>
                                <div className="space-y-1">
                                    <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl px-3 py-2 text-slate-400 hover:bg-white/10 hover:text-white" asChild>
                                        <Link href="/avatars">
                                            <User className="h-5 w-5" />
                                            Avatars
                                        </Link>
                                    </Button>
                                    <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl px-3 py-2 text-slate-400 hover:bg-white/10 hover:text-white" disabled>
                                        <LayoutTemplate className="h-5 w-5" />
                                        Templates
                                    </Button>
                                    <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl px-3 py-2 text-slate-400 hover:bg-white/10 hover:text-white" disabled>
                                        <Palette className="h-5 w-5" />
                                        Brand Kit
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-white/5">
                            <div className="px-1">
                                <Button className="w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/30 hover:text-white">
                                    Upgrade Plan
                                </Button>
                            </div>

                            <Button variant="ghost" className="flex w-full items-center justify-start gap-3 rounded-xl px-2 py-6 hover:bg-white/5">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400" />
                                <div className="flex flex-col items-start gap-0.5 overflow-hidden">
                                    <span className="text-sm font-semibold text-white">Adrian</span>
                                    <span className="text-xs text-slate-400">Free Plan</span>
                                </div>
                            </Button>
                        </div>
                    </div>
                </aside>

                {/* MAIN CONTENT */}
                <main className="relative flex-1 flex flex-col min-w-0 pr-4 sm:pr-6 lg:pr-10">

                    {/* Top Bar */}
                    <div className="flex items-center gap-3 mb-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                            onClick={() => setNavOpen((v) => !v)}
                        >
                            {navOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                        </Button>
                        <div className="ml-auto">
                            {/* Right side header items if needed */}
                        </div>
                    </div>

                    {/* Chat Container */}
                    <div className="flex-1 flex flex-col rounded-3xl border border-white/10 bg-black/40 backdrop-blur overflow-hidden">
                        <div className="flex-1 relative">
                            <Conversation className="absolute inset-0">
                                <ConversationContent>
                                    {messages.length === 0 ? (
                                        <ConversationEmptyState
                                            title="Bring any idea to life with Video Agent"
                                            description=""
                                            icon={null}
                                            className="h-full flex flex-col items-center justify-center p-0"
                                        >
                                            <h1 className="text-4xl font-bold tracking-tight text-white mb-20 drop-shadow-xl">
                                                Bring any idea to life with Video Agent
                                            </h1>
                                        </ConversationEmptyState>
                                    ) : (
                                        messages.map((message: any) => {
                                            const text =
                                                typeof message.content === "string"
                                                    ? message.content
                                                    : Array.isArray(message.parts)
                                                        ? message.parts
                                                            .filter((p: any) => p?.type === "text")
                                                            .map((p: any) =>
                                                                typeof p.text === "string" && !/^@image-\d+$/.test(p.text.trim()) ? p.text : "",
                                                            )
                                                            .join("")
                                                        : "";

                                            const fileParts = Array.isArray(message.parts)
                                                ? message.parts.filter((p: any) => p?.type === "file" && typeof p.url === "string")
                                                : [];

                                            const renderTextWithImageRefs = (t: string) =>
                                                t.split(/(@image-\d+)/g).map((part: string, idx: number) =>
                                                    /^@image-\d+$/.test(part) ? (
                                                        <span key={`${part}-${idx}`} className="rounded-md bg-indigo-500/20 px-1.5 py-0.5 font-semibold text-indigo-200">
                                                            {part}
                                                        </span>
                                                    ) : (
                                                        <span key={idx}>{part}</span>
                                                    ),
                                                );

                                            return (
                                                <Message
                                                    key={message.id}
                                                    from={message.role}
                                                    className={message.role === 'user' ? "ml-auto" : ""}
                                                >
                                                    <MessageContent>
                                                        {message.role === 'assistant' ? (
                                                            <MessageResponse>{text}</MessageResponse>
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
                                                                <p className="whitespace-pre-wrap">{renderTextWithImageRefs(text)}</p>
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

                        {/* Input Area */}
                        <div className="p-4 sm:p-6 lg:p-8 pt-0 z-10">
                            <div className="max-w-3xl mx-auto w-full relative">
                                <MultimodalInput
                                    chatId="home-chat"
                                    input={input}
                                    setInput={setInput}
                                    status={status}
                                    stop={stop}
                                    attachments={attachments}
                                    setAttachments={setAttachments}
                                    availableImages={availableImages}
                                    sendMessage={sendMessage}
                                />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
