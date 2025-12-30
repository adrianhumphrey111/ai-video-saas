import { Storage } from "@google-cloud/storage";
import { nanoid } from "nanoid";

const bucketName = process.env.GOOGLE_GCS_BUCKET_NAME ?? "vidnova_generated_videos";

function getStorageClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    return new Storage({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
  }

  return new Storage();
}

export type UploadToGcsArgs = {
  destinationPath: string;
  contentType: string;
  data: Uint8Array | Buffer;
  cacheControl?: string;
};

export async function uploadToGcs({
  destinationPath,
  contentType,
  data,
  cacheControl,
}: UploadToGcsArgs) {
  const storage = getStorageClient();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(destinationPath);

  await file.save(data, {
    resumable: false,
    contentType,
    metadata: {
      cacheControl: cacheControl ?? "private, max-age=3600",
    },
  });

  return `gs://${bucketName}/${destinationPath}`;
}

export async function signGcsUrl(gcsUri: string, expiresSeconds = 60 * 60) {
  const storage = getStorageClient();
  const match = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) throw new Error(`Invalid gcsUri: ${gcsUri}`);
  const [, bucket, path] = match;

  const [url] = await storage
    .bucket(bucket)
    .file(path)
    .getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + expiresSeconds * 1000,
    });

  return url;
}

export function buildGcsInputPath(args: {
  userId: string;
  projectId: string;
  sourceId: string;
  ext: string;
}) {
  const safeExt = args.ext.startsWith(".") ? args.ext.slice(1) : args.ext;
  return `inputs/${args.userId}/${args.projectId}/${args.sourceId}/${nanoid()}.${safeExt || "bin"}`;
}
