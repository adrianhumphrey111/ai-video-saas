"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AvatarsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [navOpen, setNavOpen] = useState(true);

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#05060a] via-[#0b0c11] to-black text-slate-100">
            {/* Background Effects */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(99,102,241,0.12),transparent_40%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.12),transparent_35%)]" />
            </div>

            <div className="relative flex w-full h-screen overflow-hidden pt-0 pb-6 pr-6 gap-4">
                {/* SIDEBAR */}
                <Sidebar open={navOpen} setOpen={setNavOpen} />

                {/* MAIN CONTENT */}
                <main className="relative flex-1 flex flex-col min-w-0 pr-4 sm:pr-6 lg:pr-10 h-full min-h-0">
                    {/* Content Container */}
                    <div className="flex-1 min-h-0 flex flex-col rounded-3xl border border-white/10 bg-black/40 backdrop-blur overflow-y-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
