import { createClient } from "@supabase/supabase-js";

const uploadBucket = process.env.NEXT_PUBLIC_SUPABASE_UPLOAD_BUCKET ?? "user-uploads";

function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, serviceKey);
}

export async function downloadSupabaseObject(storagePath: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.storage.from(uploadBucket).download(storagePath);
  if (error || !data) {
    throw new Error(`Failed to download Supabase object: ${error?.message ?? "unknown error"}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

