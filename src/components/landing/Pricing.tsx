import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
    {
        name: "Starter",
        price: "Free",
        description: "Perfect for trying out the platform.",
        features: [
            "5 minutes of video per month",
            "10+ Stock Avatars",
            "Standard Voices",
            "720p Export Quality",
            "Watermarked videos"
        ],
        cta: "Start for Free",
        popular: false,
    },
    {
        name: "Pro",
        price: "$29",
        period: "/month",
        description: "For creators scaling their content.",
        features: [
            "30 minutes of video per month",
            "All Stock Avatars",
            "Premium Voices",
            "1080p Export Quality",
            "No Watermark",
            "Commercial License"
        ],
        cta: "Get Started",
        popular: true,
    },
    {
        name: "Agency",
        price: "$99",
        period: "/month",
        description: "For teams and high-volume needs.",
        features: [
            "120 minutes of video per month",
            "Custom Avatar Generation",
            "API Access",
            "4K Export Quality",
            "Priority Support",
            "Team Collaboration"
        ],
        cta: "Contact Sales",
        popular: false,
    },
];

export function Pricing() {
    return (
        <section id="pricing" className="py-32 bg-slate-950 border-t border-white/5">
            <div className="container mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-display">
                        Simple, transparent <span className="text-slate-500">pricing.</span>
                    </h2>
                    <p className="text-lg text-slate-400">
                        Start for free and scale as you grow. No hidden fees.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className={`relative p-10 rounded-3xl border transition-all duration-300 ${plan.popular
                                ? "bg-white/5 border-white/20 shadow-2xl shadow-white/5 scale-105 z-10"
                                : "bg-transparent border-white/10 hover:bg-white/5"
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-slate-950 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                    Most Popular
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1 mb-4">
                                    <span className="text-5xl font-bold text-white font-display">{plan.price}</span>
                                    {plan.period && <span className="text-slate-500">{plan.period}</span>}
                                </div>
                                <p className="text-slate-400 text-sm">{plan.description}</p>
                            </div>

                            <ul className="space-y-4 mb-10">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3 text-slate-300 text-sm">
                                        <Check className="h-5 w-5 text-white shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Button
                                asChild
                                className={`w-full h-12 rounded-full font-semibold ${plan.popular
                                    ? "bg-white hover:bg-slate-200 text-slate-950"
                                    : "bg-white/10 text-white hover:bg-white/20"
                                    }`}
                            >
                                <Link href="#">Join Waitlist</Link>
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
