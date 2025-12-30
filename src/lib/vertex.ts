import { createVertex } from "@ai-sdk/google-vertex";

export const vertex = createVertex({
  location: "global",
  googleAuthOptions: {
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY,
    },
  },
});