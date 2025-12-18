import { UserPlus, FileText, PlayCircle } from "lucide-react";

const steps = [
    {
        icon: UserPlus,
        title: "Select Avatar",
        description: "Choose from our premium stock avatars or create your own digital twin.",
        number: "01"
    },
    {
        icon: FileText,
        title: "Input Script",
        description: "Type your text or upload audio. Choose from over 100 premium AI voices.",
        number: "02"
    },
    {
        icon: PlayCircle,
        title: "Generate",
        description: "Click generate and watch as our AI renders your professional video in minutes.",
        number: "03"
    },
];

export function HowItWorks() {
    return (
        <section id="how-it-works" className="py-32 bg-slate-950 relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />

            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-end mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold text-white font-display max-w-xl">
                        From script to video in <span className="text-slate-500">three simple steps.</span>
                    </h2>
                    <p className="text-slate-400 max-w-xs mt-6 md:mt-0">
                        Our process is designed for speed and quality. No technical skills required.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {steps.map((step, index) => (
                        <div key={index} className="group relative p-8 rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex justify-between items-start mb-8">
                                <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                                    <step.icon className="h-5 w-5 text-white" />
                                </div>
                                <span className="text-4xl font-bold text-white/10 font-display group-hover:text-white/20 transition-colors">
                                    {step.number}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-4">{step.title}</h3>
                            <p className="text-slate-400 leading-relaxed">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
