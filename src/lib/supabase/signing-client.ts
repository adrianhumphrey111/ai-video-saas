export async function signStoragePaths(storagePaths: string[]) {
  const unique = Array.from(
    new Set(storagePaths.filter((p) => typeof p === "string" && p.length > 0)),
  );
  if (unique.length === 0) return {} as Record<string, string>;

  const res = await fetch("/api/files/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ storagePaths: unique }),
  }).catch(() => null);

  const json = res ? await res.json().catch(() => null) : null;
  return (json?.signedUrls ?? {}) as Record<string, string>;
}

export async function signStoragePath(storagePath: string) {
  const signedUrls = await signStoragePaths([storagePath]);
  return signedUrls[storagePath] ?? null;
}

