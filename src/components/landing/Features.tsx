import { Video, Users, Globe, Zap, Layers, Wand2, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
    {
        title: "Text-to-Video Magic",
        description: "Transform scripts into professional videos instantly. No cameras needed.",
        icon: Video,
        className: "md:col-span-2 md:row-span-2",
        gradient: "from-blue-500/20 to-purple-500/20",
    },
    {
        title: "Custom Avatars",
        description: "Create your digital twin.",
        icon: Users,
        className: "md:col-span-1 md:row-span-1",
        gradient: "from-emerald-500/20 to-teal-500/20",
    },
    {
        title: "Global Reach",
        description: "40+ languages supported.",
        icon: Globe,
        className: "md:col-span-1 md:row-span-1",
        gradient: "from-orange-500/20 to-red-500/20",
    },
    {
        title: "Lightning Fast",
        description: "Render in minutes.",
        icon: Zap,
        className: "md:col-span-1 md:row-span-1",
        gradient: "from-yellow-500/20 to-amber-500/20",
    },
    {
        title: "Brand Kits",
        description: "Consistent branding.",
        icon: Layers,
        className: "md:col-span-1 md:row-span-1",
        gradient: "from-pink-500/20 to-rose-500/20",
    },
    {
        title: "AI Script Writer",
        description: "Never run out of ideas.",
        icon: Wand2,
        className: "md:col-span-2 md:row-span-1",
        gradient: "from-indigo-500/20 to-cyan-500/20",
    },
];

export function Features() {
    return (
        <section id="features" className="py-32 bg-slate-950 relative">
            <div className="container mx-auto px-6">
                <div className="mb-20 max-w-2xl">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-display">
                        Everything you need to <br />
                        <span className="text-slate-400">scale production.</span>
                    </h2>
                    <p className="text-lg text-slate-400">
                        Powerful tools designed for modern marketers.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[200px]">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className={cn(
                                "group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 hover:border-white/20 transition-all duration-500",
                                feature.className
                            )}
                        >
                            {/* Hover Gradient Background */}
                            <div className={cn(
                                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                                feature.gradient
                            )} />

                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform duration-500">
                                        <feature.icon className="h-6 w-6 text-white" />
                                    </div>
                                    <ArrowUpRight className="h-5 w-5 text-slate-500 group-hover:text-white transition-colors" />
                                </div>

                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-200 transition-colors">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
