import { GoogleAuth } from "google-auth-library";

export async function getGcpAccessToken() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  const scopes = ["https://www.googleapis.com/auth/cloud-platform"];

  const auth =
    clientEmail && privateKey
      ? new GoogleAuth({
          credentials: {
            client_email: clientEmail,
            private_key: privateKey,
          },
          scopes,
        })
      : new GoogleAuth({ scopes });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse?.token;
  if (!token) throw new Error("Failed to obtain GCP access token.");
  return token;
}
