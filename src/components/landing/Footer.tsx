import Image from "next/image";
import Link from "next/link";

export function Footer() {
    return (
        <footer className="bg-slate-950 border-t border-white/5 pt-16 pb-8">
            <div className="container mx-auto px-6">
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="relative h-8 w-8 rounded-md overflow-hidden">
                                <Image
                                    src="/vidnova-logo.jpg"
                                    alt="VidNova Logo"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <span className="text-lg font-bold text-white">VidNova</span>
                        </div>
                        <p className="text-slate-400 max-w-sm">
                            The fastest way to create professional AI videos. Scale your content production with digital avatars.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-6">Product</h4>
                        <ul className="space-y-4">
                            <li><Link href="#features" className="text-slate-400 hover:text-white transition-colors">Features</Link></li>
                            <li><Link href="#pricing" className="text-slate-400 hover:text-white transition-colors">Pricing</Link></li>
                            <li><Link href="#" className="text-slate-400 hover:text-white transition-colors">Showcase</Link></li>
                            <li><Link href="#" className="text-slate-400 hover:text-white transition-colors">Roadmap</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-6">Company</h4>
                        <ul className="space-y-4">
                            <li><Link href="#" className="text-slate-400 hover:text-white transition-colors">About</Link></li>
                            <li><Link href="#" className="text-slate-400 hover:text-white transition-colors">Blog</Link></li>
                            <li><Link href="#" className="text-slate-400 hover:text-white transition-colors">Careers</Link></li>
                            <li><Link href="#" className="text-slate-400 hover:text-white transition-colors">Contact</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-slate-500 text-sm">
                        © {new Date().getFullYear()} VidNova. All rights reserved.
                    </p>
                    <div className="flex gap-6">
                        <Link href="#" className="text-slate-500 hover:text-white text-sm transition-colors">Privacy Policy</Link>
                        <Link href="#" className="text-slate-500 hover:text-white text-sm transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
