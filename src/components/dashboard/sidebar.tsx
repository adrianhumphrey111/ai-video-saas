"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

export function Sidebar({ open, setOpen }: SidebarProps) {
    const pathname = usePathname();

    return (
        <>
            {/* FLOATING OPEN BUTTON (When sidebar is closed) */}
            {!open && (
                <div className="fixed left-6 top-6 z-[60]">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full border border-white/10 bg-black/40 text-slate-200 backdrop-blur-md hover:bg-white/10 shadow-xl"
                        onClick={() => setOpen(true)}
                    >
                        <PanelLeftOpen className="h-5 w-5" />
                    </Button>
                </div>
            )}

            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex flex-col justify-between border-r border-white/10 bg-black/80 backdrop-blur-xl transition-all duration-300 ease-in-out lg:static lg:bg-transparent lg:border-none lg:shadow-none",
                    open ? "w-[260px] translate-x-0" : "w-0 -translate-x-full opacity-0 lg:w-0 lg:translate-x-0 lg:opacity-0"
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
                            className="h-8 w-8 text-slate-400 hover:text-white"
                            onClick={() => setOpen(false)}
                        >
                            <PanelLeftClose className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button
                        className="w-full justify-start gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-6 text-base font-semibold text-white shadow-lg shadow-blue-900/20 hover:from-cyan-400 hover:to-blue-500 hover:shadow-blue-500/20"
                        asChild
                    >
                        <Link href="/dashboard">
                            <Plus className="h-5 w-5" />
                            Create Video
                        </Link>
                    </Button>

                    <div className="flex-1 space-y-6 overflow-y-auto px-1 py-4 scrollbar-none">

                        <div className="space-y-1">
                            <Button
                                variant="ghost"
                                className={cn("w-full justify-start gap-3 rounded-xl px-3 py-2", pathname === "/dashboard" ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/10 hover:text-white")}
                                asChild
                            >
                                <Link href="/dashboard">
                                    <Home className="h-5 w-5" />
                                    Home
                                </Link>
                            </Button>
                            <Button
                                variant="ghost"
                                className={cn("w-full justify-start gap-3 rounded-xl px-3 py-2", pathname.startsWith("/dashboard/projects") ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/10 hover:text-white")}
                                asChild
                            >
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
                                <Button
                                    variant="ghost"
                                    className={cn("w-full justify-start gap-3 rounded-xl px-3 py-2", pathname.startsWith("/avatars") ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/10 hover:text-white")}
                                    asChild
                                >
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
        </>
    );
}
