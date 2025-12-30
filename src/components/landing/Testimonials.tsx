import { Star } from "lucide-react";

const testimonials = [
    {
        quote: "This tool has completely revolutionized our content strategy. We're producing 10x more video ads with the same budget.",
        author: "Sarah J.",
        role: "Marketing Director",
        company: "TechFlow",
    },
    {
        quote: "The quality of the avatars is mind-blowing. People can't tell they're AI generated. Absolutely game-changing for UGC.",
        author: "Michael C.",
        role: "E-commerce Founder",
        company: "Shopify Store",
    },
    {
        quote: "I was skeptical at first, but the lip-sync accuracy and voice quality are unmatched. Highly recommended.",
        author: "Elena R.",
        role: "Content Creator",
        company: "Freelance",
    },
];

export function Testimonials() {
    return (
        <section className="py-32 bg-slate-950 border-t border-white/5">
            <div className="container mx-auto px-6">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-20 text-center font-display">
                    Trusted by modern <span className="text-slate-500">creators</span>
                </h2>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((t, index) => (
                        <div key={index} className="p-10 rounded-3xl bg-slate-900/50 border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex gap-1 mb-8">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="h-4 w-4 fill-white text-white" />
                                ))}
                            </div>
                            <p className="text-lg text-slate-300 mb-8 leading-relaxed font-light">
                                &ldquo;{t.quote}&rdquo;
                            </p>
                            <div>
                                <p className="font-semibold text-white">{t.author}</p>
                                <p className="text-sm text-slate-500">{t.role}, {t.company}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
