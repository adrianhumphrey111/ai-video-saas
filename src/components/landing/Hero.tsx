import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Star } from "lucide-react";

export function Hero() {
    return (
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
            {/* Background Effects: "Container-sized grid lines" & Beams */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col items-center text-center max-w-5xl mx-auto">

                    {/* Craft Signal: Pill Label */}
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-slate-300 mb-8 backdrop-blur-md shadow-lg shadow-black/20 hover:border-white/20 transition-colors cursor-default">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="tracking-wide">v2.0 Now Available</span>
                    </div>

                    {/* Headline: "Superhero" Style */}
                    <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-white mb-8 leading-[1.1] font-display">
                        Create AI Avatars <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-purple-300 to-indigo-300 animate-gradient-x">
                            That Actually Sell
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-2xl leading-relaxed font-light">
                        Generate studio-quality UGC videos with AI avatars in minutes.
                        No camera, no actors, no hassle. Just type and publish.
                    </p>

                    {/* Waitlist Form */}
                    <form action={async (formData) => {
                        "use server";
                        const { addToWaitlist } = await import("@/app/actions");
                        await addToWaitlist(formData);
                    }} className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md mx-auto mb-20">
                        <input
                            type="email"
                            name="email"
                            placeholder="Enter your email"
                            required
                            className="w-full h-14 px-6 rounded-full bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                        />
                        <Button type="submit" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg bg-white text-slate-950 hover:bg-slate-200 rounded-full font-semibold shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all hover:scale-105 whitespace-nowrap">
                            Join Waitlist
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </form>

                    {/* Social Proof / "Craft" Signal */}
                    <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center text-xs text-white">
                                    <span className="sr-only">User {i}</span>
                                    <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-700 to-slate-800" />
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col items-start">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                                    Beta Open
                                </span>
                            </div>
                            <span>Join the exclusive early access</span>
                        </div>
                    </div>

                    {/* Hero Visual: "Screenshot" Style Container */}
                    <div className="mt-24 relative w-full max-w-6xl aspect-[16/9] rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur-sm shadow-2xl shadow-blue-900/20 overflow-hidden group perspective-1000">
                        {/* Inner Glow */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />

                        {/* Mock UI Content */}
                        <div className="absolute inset-0 flex items-center justify-center z-0">
                            <div className="text-center space-y-6 transform group-hover:scale-105 transition-transform duration-700 ease-out">
                                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto backdrop-blur-md border border-white/20 shadow-xl">
                                    <Play className="h-10 w-10 text-white fill-white" />
                                </div>
                                <p className="text-slate-400 font-medium tracking-widest uppercase text-sm">Watch the product tour</p>
                            </div>
                        </div>

                        {/* Grid overlay */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] opacity-50"></div>
                    </div>
                </div>
            </div>
        </section>
    );
}
