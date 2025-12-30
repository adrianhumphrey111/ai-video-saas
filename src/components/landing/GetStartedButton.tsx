"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";

export function GetStartedButton() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleGetStarted = async () => {
        setIsLoading(true);
        const supabase = createSupabaseBrowserClient();
        try {
            const { error } = await supabase.auth.signInAnonymously();
            if (error) {
                console.error("Error signing in anonymously:", error);
                setIsLoading(false);
            } else {
                router.push("/dashboard");
            }
        } catch (error) {
            console.error("Unexpected error:", error);
            setIsLoading(false);
        }
    };

    return (
        <Button
            onClick={handleGetStarted}
            disabled={isLoading}
            size="lg"
            className="w-full sm:w-auto h-14 px-8 text-lg bg-white text-slate-950 hover:bg-slate-200 rounded-full font-semibold shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all hover:scale-105 whitespace-nowrap"
        >
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Setting up...
                </>
            ) : (
                <>
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                </>
            )}
        </Button>
    );
}
