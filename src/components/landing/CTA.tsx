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
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mx-auto">
                        <form action={async (formData) => {
                            "use server";
                            const { addToWaitlist } = await import("@/app/actions");
                            await addToWaitlist(formData);
                        }} className="flex flex-col sm:flex-row items-center gap-4 w-full">
                            <input
                                type="email"
                                name="email"
                                placeholder="Enter your email"
                                required
                                className="w-full h-14 px-6 rounded-full bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                            />
                            <Button type="submit" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg bg-white hover:bg-slate-200 text-slate-950 rounded-full font-semibold whitespace-nowrap">
                                Join Waitlist
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}
