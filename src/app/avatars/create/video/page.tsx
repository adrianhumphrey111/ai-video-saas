"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const steps = [
  {
    id: 1,
    title: "Introduction",
    description: "What makes the most realistic avatars and how the process works.",
  },
  {
    id: 2,
    title: "Instruction",
    description: "Recording guidelines for tone, framing, and lighting.",
  },
  {
    id: 3,
    title: "Upload",
    description: "Send us your best take and we’ll handle the training.",
  },
  {
    id: 4,
    title: "Verify",
    description: "Confirm pronunciation, likeness, and metadata.",
  },
  {
    id: 5,
    title: "Review",
    description: "Ship-ready avatar delivered directly to your library.",
  },
];

const trainingVideoSrc =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";

const trainingVideoPoster =
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80";

export default function CreateAvatarVideoPage() {
  return (
    <div className="min-h-screen bg-[#050506] text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 lg:gap-12">
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-white transition hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Avatars
          </Link>
          <span className="hidden text-slate-600 lg:inline">/</span>
          <span className="hidden text-slate-400 lg:inline">Create Avatar</span>
        </div>

        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.55em] text-slate-600">Create Avatar</p>
          <h1 className="text-4xl font-semibold text-white">Create your digital twin in minutes</h1>
          <p className="max-w-2xl text-lg text-slate-300">
            Learn how to create a realistic digital version of yourself. Use it to create videos with
            any content and in any language — all from a single recording session.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[240px,1fr]">
          <aside className="rounded-[28px] border border-white/5 bg-[#0b0c0f] p-6">
            <div className="space-y-4">
              {steps.map((step, idx) => {
                const isActive = idx === 0;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex gap-4 rounded-2xl p-4 transition",
                      isActive
                        ? "bg-blue-600/15 border border-blue-500/30"
                        : "border border-transparent hover:border-white/10"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold",
                        isActive
                          ? "border-blue-400 bg-blue-500/20 text-blue-100"
                          : "border-white/10 text-slate-400"
                      )}
                    >
                      {step.id}
                    </div>
                    <div>
                      <p className="font-medium text-white">{step.title}</p>
                      <p className="text-sm text-slate-400">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="space-y-8">
            <div className="rounded-[36px] border border-white/5 bg-gradient-to-br from-white/10 via-[#0f1014] to-[#070708] p-8 shadow-[0_60px_120px_rgba(10,10,15,0.55)]">
              <div className="aspect-video overflow-hidden rounded-[28px] border border-white/15 bg-black">
                <video
                  controls
                  poster={trainingVideoPoster}
                  className="h-full w-full object-cover"
                  preload="metadata"
                >
                  <source src={trainingVideoSrc} type="video/mp4" />
                  Your browser does not support the video element.
                </video>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-white">Recording walkthrough</p>
                  <p className="text-sm text-slate-400">
                    A 3-minute guide that covers setup, delivery, and approvals.
                  </p>
                </div>
                <div className="flex gap-3 text-sm text-slate-300">
                  <div className="rounded-full border border-white/10 px-4 py-1">Runtime · 2:29</div>
                  <div className="rounded-full border border-white/10 px-4 py-1">Language · EN</div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/5 bg-[#0b0c0f] p-8">
              <h2 className="text-2xl font-semibold text-white">What you&apos;ll need</h2>
              <ul className="mt-4 grid gap-4 text-slate-300 md:grid-cols-2">
                <li className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">A short video</p>
                  <p className="text-sm text-slate-400">
                    30–120 seconds, shot in 4K or 1080p, with frontal framing.
                  </p>
                </li>
                <li className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">Neutral background</p>
                  <p className="text-sm text-slate-400">
                    Solid backdrop or shallow depth-of-field to keep you in focus.
                  </p>
                </li>
                <li className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">Consistent lighting</p>
                  <p className="text-sm text-slate-400">
                    Soft, even lighting with no harsh shadows across the face.
                  </p>
                </li>
                <li className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">Clear audio</p>
                  <p className="text-sm text-slate-400">High-quality mic capture or lapel audio.</p>
                </li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button className="rounded-full bg-blue-600 px-8 py-5 text-base font-semibold text-white hover:bg-blue-500">
                Get Started
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
