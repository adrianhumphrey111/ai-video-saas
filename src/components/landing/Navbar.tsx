import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
    return (
        <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-6">
            <div className="flex items-center justify-between w-full max-w-5xl h-14 px-6 rounded-full border border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-xl shadow-black/20">

                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div className="relative h-8 w-8 rounded-md overflow-hidden">
                        <Image
                            src="/vidnova-logo.jpg"
                            alt="VidNova Logo"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <span className="text-sm font-bold text-white tracking-wide">VidNova</span>
                </div>

                {/* Links */}
                <div className="hidden md:flex items-center gap-8">
                    <Link href="#features" className="text-xs font-medium text-slate-300 hover:text-white transition-colors uppercase tracking-wider">
                        Features
                    </Link>
                    <Link href="#how-it-works" className="text-xs font-medium text-slate-300 hover:text-white transition-colors uppercase tracking-wider">
                        Process
                    </Link>
                    <Link href="#pricing" className="text-xs font-medium text-slate-300 hover:text-white transition-colors uppercase tracking-wider">
                        Pricing
                    </Link>
                </div>

                {/* CTA */}
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-xs font-medium text-slate-300 hover:text-white transition-colors">
                        Login
                    </Link>
                    <Button asChild size="sm" className="h-8 px-4 text-xs bg-white text-slate-950 hover:bg-slate-200 rounded-full font-semibold">
                        <Link href="/signup">Get Started</Link>
                    </Button>
                </div>
            </div>
        </nav>
    );
}
