import { TwitterAPIError } from "./errors";

const API_BASE_URL = "https://api.x.com/2";

function getBasicAuthHeader() {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET env vars. Set them before using the Twitter client."
    );
  }

  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return `Basic ${encoded}`;
}

type RefreshResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope?: string;
};

export async function refreshTwitterAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(`${API_BASE_URL}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: getBasicAuthHeader(),
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await safeJson(response);
    throw new TwitterAPIError(
      `Failed to refresh access token (${response.status})`,
      errorBody ?? undefined
    );
  }

  const data = (await response.json()) as RefreshResponse;
  const expiresAt = data.expires_in
    ? new Date(Date.now() + (data.expires_in - 60) * 1000)
    : undefined;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt,
    scope: data.scope,
  };
}

type TweetResponse = {
  data?: { id: string; text: string };
  errors?: Array<{ detail?: string }>;
};

export async function postTweet(accessToken: string, text: string) {
  const response = await fetch(`${API_BASE_URL}/tweets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
    cache: "no-store",
  });

  const data = (await safeJson(response)) as TweetResponse | null;

  if (!response.ok || !data?.data) {
    throw new TwitterAPIError(
      `Failed to post tweet (${response.status})`,
      data ?? undefined
    );
  }

  return data.data;
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
