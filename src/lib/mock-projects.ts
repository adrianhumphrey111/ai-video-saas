export type ProjectStatus = "In progress" | "Review" | "Draft";

export type MockProject = {
  id: string;
  name: string;
  summary: string;
  status: ProjectStatus;
  updated: string;
  owner: string;
  progress: number;
  tags: string[];
  accent: string;
  script: string;
  shots: { title: string; duration: string; type: string }[];
};

export const mockProjects: MockProject[] = [
  {
    id: "outfit-campaign",
    name: "Oh, this outfit? I",
    summary: "Street look teaser for fall launch with talking avatar.",
    status: "In progress",
    updated: "2h ago",
    owner: "Eli Winters",
    progress: 68,
    tags: ["Talking Actors", "Product", "Draft"],
    accent: "from-emerald-400/25 via-emerald-500/10 to-slate-900",
    script:
      "Hey there! Can you believe this fit? We wanted something that felt bold yet effortless. Let me show you how it moves.",
    shots: [
      { title: "Intro alley shot", duration: "0:08", type: "Video" },
      { title: "Close-up feature callouts", duration: "0:12", type: "Slides" },
      { title: "Voiceover hero line", duration: "0:06", type: "Audio" },
    ],
  },
  {
    id: "brand-reveal",
    name: "Hey, this is the",
    summary: "Brand reveal with kinetic typography and calm voiceover.",
    status: "Review",
    updated: "Yesterday",
    owner: "Morgan Lee",
    progress: 82,
    tags: ["Voice", "Animation"],
    accent: "from-sky-400/25 via-blue-500/10 to-slate-900",
    script: "Welcome to the new chapter. Clean lines, bold energy, and a story that centers the product.",
    shots: [
      { title: "Logo open", duration: "0:05", type: "Animation" },
      { title: "Narration track", duration: "0:18", type: "Audio" },
      { title: "Product sweep", duration: "0:09", type: "Video" },
    ],
  },
  {
    id: "street-style",
    name: "New Project",
    summary: "On-the-go street style test with quick avatar swaps.",
    status: "Draft",
    updated: "3d ago",
    owner: "Samir Patel",
    progress: 25,
    tags: ["Experiment", "Avatar"],
    accent: "from-amber-300/25 via-orange-400/10 to-slate-900",
    script: "Quick test of avatars in dynamic street lighting. Keep it casual, keep it moving.",
    shots: [
      { title: "Lighting pass", duration: "0:07", type: "Video" },
      { title: "Avatar swap A/B", duration: "0:11", type: "Video" },
    ],
  },
];

export function getProjectById(id: string) {
  return mockProjects.find((project) => project.id === id);
}
