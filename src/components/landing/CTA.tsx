import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTA() {
    return (
        <section className="py-32 bg-slate-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-blue-950/20 pointer-events-none" />

            <div className="container mx-auto px-6 relative z-10">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 font-display tracking-tight">
                        Ready to create?
                    </h2>
                    <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto font-light">
                        Join thousands of marketers and creators who are saving time and money with AI avatars.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button asChild size="lg" className="h-14 px-10 text-lg bg-white hover:bg-slate-200 text-slate-950 rounded-full font-semibold">
                            <Link href="/signup">
                                Get Started for Free
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
