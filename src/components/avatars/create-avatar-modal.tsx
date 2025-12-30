"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Camera, Clapperboard, Sparkles, Upload, Video } from "lucide-react";
import { UploadResult, UploadZone } from "@/components/shared/upload-zone";

interface CreateAvatarModalProps {
    children: React.ReactNode;
    kind?: "character" | "object" | "other";
}

export function CreateAvatarModal({ children, kind = "character" }: CreateAvatarModalProps) {
    const [open, setOpen] = useState(false);
    const [lastUpload, setLastUpload] = useState<UploadResult | null>(null);
    const router = useRouter();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-4xl border-white/10 bg-[#0b0c11] p-0 text-slate-100 sm:rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />
                <DialogHeader className="relative p-8 pb-4">
                    <DialogTitle className="font-serif text-3xl font-medium tracking-tight text-white mb-2">
                        Create Your Avatar
                    </DialogTitle>
                    <p className="text-slate-400 text-base max-w-lg">
                        Use a video or photo to create your avatar&apos;s first look. You can add more looks of either type later.
                    </p>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 pt-2">
                    {/* START FROM VIDEO */}
                    <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#121316] p-1 transition-all hover:border-white/10 hover:bg-[#16171b] hover:shadow-2xl hover:shadow-indigo-500/5">
                        <div className="h-full rounded-xl bg-[#0b0c0f] p-6 border border-white/5">
                            <div className="mb-4 flex items-center gap-3">
                                <h3 className="font-serif text-xl font-medium text-white">Start from a video</h3>
                                <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.2)]">
                                    Most realistic
                                </span>
                            </div>
                            <p className="mb-8 text-sm text-slate-400 leading-relaxed">
                                Use a single video to create an avatar that moves and acts just like you.
                            </p>

                            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900/10 via-[#1e1e24] to-black border border-white/5 group-hover:border-white/10 transition-all">
                                {/* Abstract Visual */}
                                <div className="absolute inset-0 opacity-50">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-indigo-500/20 blur-[50px] rounded-full" />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 border border-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform duration-500">
                                        <Video className="h-6 w-6 text-indigo-200" />
                                    </div>
                                </div>

                                {/* Hover Action */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/60 backdrop-blur-[2px]">
                                    <Button
                                        className="h-10 rounded-full bg-white px-6 text-black hover:bg-slate-200 gap-2 font-medium"
                                        onClick={() => {
                                            setOpen(false);
                                            router.push("/avatars/create/video");
                                        }}
                                    >
                                        Start recording <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* START FROM PHOTO */}
                    <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#121316] p-1 transition-all hover:border-white/10 hover:bg-[#16171b] hover:shadow-2xl hover:shadow-purple-500/5">
                        <div className="h-full rounded-xl bg-[#0b0c0f] p-6 border border-white/5">
                            <div className="mb-4 flex items-center gap-3">
                                <h3 className="font-serif text-xl font-medium text-white">Start from a photo</h3>
                            </div>
                            <p className="mb-8 text-sm text-slate-400 leading-relaxed">
                                Bring a photo to life with natural motion - no video footage needed.
                            </p>

                            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-purple-900/10 via-[#1e1e24] to-black border border-white/5 group-hover:border-white/10 transition-all">
                                {/* Abstract Visual */}
                                <div className="absolute inset-0 opacity-50">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-purple-500/20 blur-[50px] rounded-full" />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 border border-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform duration-500">
                                        <Camera className="h-6 w-6 text-purple-200" />
                                    </div>
                                </div>

                                {/* Hover Action Layer */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/80 backdrop-blur-[2px] px-8">
                                    <UploadZone
                                        kind={kind}
                                        onUploadComplete={(result) => {
                                            setLastUpload(result);
                                            setOpen(false);
                                            const params = new URLSearchParams();
                                            if (result.elementId) params.set("id", result.elementId);
                                            if (result.url) params.set("image", result.url);
                                            params.set("name", result.fileName);
                                            params.set("kind", kind);
                                            router.push(`/avatars/design?${params.toString()}`);
                                        }}
                                    />
                                    <Button
                                        className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white gap-2 shadow-lg shadow-purple-500/20 font-medium transition-all"
                                        onClick={() => {
                                            setOpen(false);
                                            router.push("/avatars/design");
                                        }}
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        Design with AI
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {lastUpload && (
                    <div className="px-8 pb-8">
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6">
                            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(124,58,237,0.12),transparent_35%)]" />
                            <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
                                <div className="relative h-40 w-full max-w-[160px] overflow-hidden rounded-xl border border-white/10 bg-black/40">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={lastUpload.url}
                                        alt={lastUpload.fileName}
                                        className="h-full w-full object-cover"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-3 py-2 text-xs text-white">
                                        {lastUpload.fileName}
                                    </div>
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                                        Upload complete
                                    </div>
                                    <h3 className="text-xl font-semibold text-white">Reference saved</h3>
                                    <p className="text-sm text-slate-300">
                                        We&apos;ll use this to shape your avatar. Pick your next move to keep momentum.
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        <Button
                                            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-purple-500/20"
                                        onClick={() => {
                                            setOpen(false);
                                            const params = new URLSearchParams();
                                            if (lastUpload?.elementId) params.set("id", lastUpload.elementId);
                                            if (lastUpload?.url) params.set("image", lastUpload.url);
                                            params.set("kind", kind);
                                            router.push(`/avatars/design?${params.toString()}`);
                                        }}
                                    >
                                        Describe with AI
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                                        onClick={() => {
                                            setOpen(false);
                                            const params = new URLSearchParams();
                                            if (lastUpload?.elementId) params.set("id", lastUpload.elementId);
                                            if (lastUpload?.url) params.set("image", lastUpload.url);
                                            params.set("kind", kind);
                                            router.push(`/avatars/design?${params.toString()}`);
                                        }}
                                    >
                                        Generate now
                                    </Button>
                                        <Button
                                            variant="ghost"
                                            className="text-slate-300 hover:text-white"
                                            onClick={() => setLastUpload(null)}
                                        >
                                            Upload another
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
