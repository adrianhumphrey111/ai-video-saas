"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Film,
  Laptop,
  Mic,
  Upload,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, label: "Introduction" },
  { id: 2, label: "Instruction" },
  { id: 3, label: "Upload" },
  { id: 4, label: "Verify" },
  { id: 5, label: "Review" },
];

const instructionTips = [
  {
    title: "Use the right equipment",
    description: "Shoot 2–5 min (≥30s) of unedited 4K/1080p footage using a pro camera or phone.",
  },
  {
    title: "Set the right environment",
    description: "Keep your head level, frame chest-up, and use a clean background with depth.",
  },
  {
    title: "Speak naturally and clearly",
    description: "Maintain an easy cadence, pausing briefly between sentences with lips closed.",
  },
  {
    title: "Expressive natural motion",
    description: "Sit or stand while gesturing naturally. Vary expressions to capture range.",
  },
];

const uploadTabs = [
  { id: "upload", label: "Upload footage" },
  { id: "webcam", label: "Record via webcam" },
  { id: "phone", label: "Record via phone" },
];

const existingAvatars = [
  {
    id: "new",
    name: "New Avatar",
    description: "Create a fresh persona",
    image: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=200&q=80",
    isNew: true,
  },
  {
    id: "lila",
    name: "Lila",
    description: "Lifestyle host",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "amir",
    name: "Amir",
    description: "Product narrator",
    image: "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=200&q=80",
  },
];

export default function CreateAvatarFromVideoPage() {
  const [activeStep, setActiveStep] = useState(1);
  const [uploadTab, setUploadTab] = useState("upload");
  const [selectedIdentity, setSelectedIdentity] = useState("new");

  const goNext = () => setActiveStep((prev) => Math.min(prev + 1, steps.length));
  const goPrev = () => setActiveStep((prev) => Math.max(prev - 1, 1));

  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return <IntroductionStep onGetStarted={goNext} />;
      case 2:
        return <InstructionStep />;
      case 3:
        return (
          <UploadStep
            uploadTab={uploadTab}
            onTabChange={setUploadTab}
          />
        );
      case 4:
        return (
          <VerifyStep
            selectedIdentity={selectedIdentity}
            onSelect={setSelectedIdentity}
          />
        );
      case 5:
      default:
        return <ReviewStep />;
    }
  };

  return (
    <div className="min-h-screen bg-[#040405] text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 lg:gap-12">
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 font-medium text-white transition hover:text-blue-200"
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
            Learn how to create a realistic digital version of yourself. Use it to generate videos in any
            language, any time — all from a single recording session.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[240px,1fr]">
          <nav className="rounded-[28px] border border-white/5 bg-[#0b0c0f] p-6">
            <ol className="space-y-4">
              {steps.map((step) => {
                const isActive = activeStep === step.id;
                const isComplete = activeStep > step.id;
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => setActiveStep(step.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                        isActive
                          ? "border-blue-500 bg-blue-600/20"
                          : "border-transparent hover:border-white/10"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold",
                          isComplete
                            ? "border-emerald-400 bg-emerald-500/15 text-emerald-200"
                            : isActive
                              ? "border-blue-400 bg-blue-500/20 text-blue-100"
                              : "border-white/10 text-slate-500"
                        )}
                      >
                        {isComplete ? <Check className="h-4 w-4" /> : step.id}
                      </span>
                      <span className="font-medium text-white">{step.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <section className="space-y-8">{renderStepContent()}</section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-6">
          <Button
            variant="outline"
            className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 disabled:opacity-40"
            disabled={activeStep === 1}
            onClick={goPrev}
          >
            Previous
          </Button>
          <div className="flex items-center gap-3">
            <Button
              className="rounded-full bg-blue-600 px-6 text-white hover:bg-blue-500"
              onClick={activeStep === steps.length ? () => setActiveStep(1) : goNext}
            >
              {activeStep === steps.length ? "Finish" : "Next"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function IntroductionStep({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="rounded-[36px] border border-white/5 bg-gradient-to-br from-white/10 via-[#0f1014] to-[#070708] p-8 shadow-[0_60px_120px_rgba(10,10,15,0.55)]">
      <div className="aspect-video overflow-hidden rounded-[28px] border border-white/15 bg-black">
        <video
          controls
          poster="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80"
          className="h-full w-full object-cover"
          preload="metadata"
        >
          <source src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" type="video/mp4" />
          Your browser does not support the video element.
        </video>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-white">Recording walkthrough</p>
          <p className="text-sm text-slate-400">A 3-minute guide that covers setup, delivery, and approvals.</p>
        </div>
        <div className="flex gap-3 text-sm text-slate-300">
          <div className="rounded-full border border-white/10 px-4 py-1">Runtime · 2:29</div>
          <div className="rounded-full border border-white/10 px-4 py-1">Language · EN</div>
        </div>
      </div>
      <div className="mt-6 flex justify-center">
        <Button className="rounded-full bg-blue-600 px-8 py-5 text-base font-semibold text-white hover:bg-blue-500" onClick={onGetStarted}>
          Get Started
        </Button>
      </div>
    </div>
  );
}

function InstructionStep() {
  return (
    <div className="grid gap-8 rounded-[32px] border border-white/5 bg-[#0a0b0f] p-8 lg:grid-cols-[1.2fr,0.8fr]">
      <div className="space-y-4">
        <h2 className="text-3xl font-semibold text-white">Footage Instructions</h2>
        <p className="text-slate-400">
          We craft your avatar from real footage. Follow these recording tips to capture the highest quality likeness.
        </p>
        <div className="space-y-4">
          {instructionTips.map((tip) => (
            <div key={tip.title} className="flex gap-4 rounded-2xl border border-white/5 bg-white/5 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/20 text-blue-200">
                <Mic className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-white">{tip.title}</p>
                <p className="text-sm text-slate-400">{tip.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-sm text-slate-400">
          View detailed instructions for{" "}
          <span className="cursor-pointer text-blue-200 underline underline-offset-4">still looks</span> and{" "}
          <span className="cursor-pointer text-blue-200 underline underline-offset-4">moving looks</span>.
        </div>
      </div>
      <div className="space-y-4">
        <div className="overflow-hidden rounded-[32px] border border-emerald-400/30 bg-[#0f1914] p-4">
          <img
            src="https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=900&q=80"
            alt="Ideal frame"
            className="h-64 w-full rounded-[24px] object-cover"
          />
          <div className="mt-3 flex items-center gap-2 text-emerald-200">
            <CheckCircle className="h-5 w-5" />
            Approved framing & lighting
          </div>
        </div>
        <div className="overflow-hidden rounded-[32px] border border-red-500/30 bg-[#180d0d] p-4 opacity-70">
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80"
            alt="Poor frame"
            className="h-64 w-full rounded-[24px] object-cover"
          />
          <div className="mt-3 flex items-center gap-2 text-red-200">
            <Video className="h-5 w-5" />
            Avoid harsh shadows & soft focus
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadStep({
  uploadTab,
  onTabChange,
}: {
  uploadTab: string;
  onTabChange: (tab: string) => void;
}) {
  return (
    <div className="space-y-6 rounded-[32px] border border-white/5 bg-[#090a0e] p-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold text-white">Upload your footage</h2>
        <p className="text-slate-400">
          For most realistic results we recommend 2 minutes of footage recorded with a DSLR or phone. Testing the product?
          A 30-second webcam recording works too.
        </p>
      </div>

      <Tabs value={uploadTab} onValueChange={onTabChange}>
        <TabsList className="w-full justify-start gap-2 rounded-full border border-white/10 bg-white/5 p-1">
          {uploadTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-full px-4 py-1 text-sm data-[state=active]:bg-white/10"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="upload" className="mt-6 space-y-6">
          <div className="rounded-[32px] border border-dashed border-white/20 bg-[#0d0e13] p-8 text-center">
            <Upload className="mx-auto h-10 w-10 text-blue-300" />
            <p className="mt-4 text-xl font-semibold text-white">Drag and drop video, or click to upload</p>
            <p className="text-sm text-slate-400">Landscape or portrait · MP4/MOV/WebM · 30s–10min · up to 10GB</p>
            <Button className="mt-6 rounded-full bg-blue-600 px-8 text-white hover:bg-blue-500">
              Browse local files
            </Button>
            <div className="mt-4 text-sm text-slate-400">Or upload via Google Drive</div>
            <div className="mx-auto mt-2 max-w-md rounded-full border border-white/10 bg-black/20 px-4 py-2 text-left text-sm text-slate-300">
              Paste video URL here (up to 50GB)
            </div>
          </div>
        </TabsContent>

        <TabsContent value="webcam" className="mt-6 space-y-6">
          <div className="rounded-[32px] border border-blue-500/30 bg-[#04060c] p-6">
            <div className="aspect-video rounded-[24px] border border-blue-500/40 bg-black p-4">
              <video
                controls
                poster="https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=1200&q=80"
                className="h-full w-full rounded-[16px] object-cover"
              >
                <source src="https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" type="video/mp4" />
              </video>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-sm text-slate-300">Remove background noise</span>
              <input type="checkbox" defaultChecked className="h-4 w-4" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="phone" className="mt-6 space-y-6">
          <div className="rounded-[32px] border border-white/5 bg-[#0f1016] p-6 text-center">
            <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-3xl border border-dashed border-white/15 bg-black/20">
              <Camera className="h-12 w-12 text-blue-200" />
            </div>
            <p className="mt-4 text-lg font-semibold">Record on your phone</p>
            <p className="text-sm text-slate-400">
              Scan the QR code sent to your email or open the VidNova mobile app to capture footage with guides.
            </p>
            <Button className="mt-6 rounded-full bg-white/10 text-white hover:bg-white/20">Send instructions</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VerifyStep({
  selectedIdentity,
  onSelect,
}: {
  selectedIdentity: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-6 rounded-[32px] border border-white/5 bg-[#0a0a0e] p-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold text-white">Verify identity</h2>
        <p className="text-slate-400">
          To prevent misuse we make sure you own the likeness. Confirm if this footage matches an existing avatar or
          create a new one.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {existingAvatars.map((avatar) => {
          const isSelected = selectedIdentity === avatar.id;
          return (
            <button
              type="button"
              key={avatar.id}
              onClick={() => onSelect(avatar.id)}
              className={cn(
                "flex flex-col items-center gap-3 rounded-[28px] border p-5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                isSelected ? "border-blue-500 bg-blue-600/20" : "border-white/5 bg-[#0f0f15]"
              )}
            >
              <div className="h-24 w-24 overflow-hidden rounded-full border border-white/10">
                <img src={avatar.image} alt={avatar.name} className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{avatar.name}</p>
                <p className="text-sm text-slate-400">{avatar.description}</p>
              </div>
              {avatar.isNew ? (
                <span className="rounded-full border border-dashed border-white/20 px-4 py-1 text-xs uppercase tracking-wide text-slate-300">
                  New Avatar
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReviewStep() {
  return (
    <div className="rounded-[32px] border border-amber-500/20 bg-gradient-to-br from-[#1c1206] via-[#0a0806] to-[#050505] p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-200">
            Upgrade to Creator to unlock this feature
          </p>
          <h2 className="text-3xl font-semibold text-white">Your Avatar, Reimagined</h2>
          <p className="text-slate-300">
            Generate multiple poses, outfits, and scenes with Nano Banana’s next-gen models. Train on photos, mix with
            text prompts, and export unlimited HD talking videos.
          </p>
          <ul className="space-y-2 text-sm text-slate-200">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-300" />
              Train AI model on your photos
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-300" />
              Look packs with 20+ poses
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-300" />
              Unlimited avatar videos in HD
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-300" />
              1080p export, enterprise consent tools
            </li>
          </ul>
          <Button className="rounded-full bg-blue-600 px-8 text-white hover:bg-blue-500">
            Upgrade to Creator
          </Button>
        </div>
        <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-4">
          <img
            src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80"
            alt="Avatar preview"
            className="h-80 w-full rounded-[24px] object-cover"
          />
          <div className="absolute bottom-6 left-1/2 w-4/5 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-center text-sm text-white">
            Holding the camera, on a beach at golden hour
          </div>
        </div>
      </div>
    </div>
  );
}
