import { getGcpAccessToken } from "./auth";

export type VeoGenerateParams = {
  projectId: string;
  location: string;
  prompt: string;
  storageUri: string;
  aspectRatio?: "16:9" | "9:16";
  durationSeconds: 4 | 6 | 8;
  resolution?: "720p" | "1080p";
  sampleCount: number;
  generateAudio: boolean;
  negativePrompt?: string;
  image?: { gcsUri: string; mimeType: string };
  lastFrame?: { gcsUri: string; mimeType: string };
  video?: { gcsUri: string; mimeType: string };
  mask?: { gcsUri: string; mimeType: string; maskMode?: string };
  referenceImages?: Array<{ gcsUri: string; mimeType: string; referenceType: "asset" }>;
};

const veoModelId = "veo-3.1-generate-preview";

export async function startVeoOperation(params: VeoGenerateParams) {
  const token = await getGcpAccessToken();
  const url = `https://${params.location}-aiplatform.googleapis.com/v1/projects/${params.projectId}/locations/${params.location}/publishers/google/models/${veoModelId}:predictLongRunning`;

  const instance: any = {
    prompt: params.prompt,
  };

  if (params.image) {
    instance.image = { gcsUri: params.image.gcsUri, mimeType: params.image.mimeType };
  }
  if (params.lastFrame) {
    instance.lastFrame = { gcsUri: params.lastFrame.gcsUri, mimeType: params.lastFrame.mimeType };
  }
  if (params.video) {
    instance.video = { gcsUri: params.video.gcsUri, mimeType: params.video.mimeType };
  }
  if (params.mask) {
    instance.mask = {
      gcsUri: params.mask.gcsUri,
      mimeType: params.mask.mimeType,
      ...(params.mask.maskMode ? { maskMode: params.mask.maskMode } : {}),
    };
  }
  if (params.referenceImages && params.referenceImages.length > 0) {
    instance.referenceImages = params.referenceImages.map((r) => ({
      image: { gcsUri: r.gcsUri, mimeType: r.mimeType },
      referenceType: r.referenceType,
    }));
  }

  const body: any = {
    instances: [instance],
    parameters: {
      storageUri: params.storageUri,
      sampleCount: params.sampleCount,
      durationSeconds: params.durationSeconds,
      generateAudio: params.generateAudio,
      ...(params.aspectRatio ? { aspectRatio: params.aspectRatio } : {}),
      ...(params.resolution ? { resolution: params.resolution } : {}),
      ...(params.negativePrompt ? { negativePrompt: params.negativePrompt } : {}),
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Veo predictLongRunning failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { name: string };
  if (!json?.name) throw new Error("Veo response missing operation name");
  return json.name;
}

export async function fetchVeoOperation(params: {
  projectId: string;
  location: string;
  operationName: string;
}) {
  const token = await getGcpAccessToken();
  const url = `https://${params.location}-aiplatform.googleapis.com/v1/projects/${params.projectId}/locations/${params.location}/publishers/google/models/${veoModelId}:fetchPredictOperation`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ operationName: params.operationName }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Veo fetchPredictOperation failed: ${res.status} ${text}`);
  }

  return (await res.json()) as any;
}

