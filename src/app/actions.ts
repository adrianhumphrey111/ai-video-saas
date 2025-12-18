"use server";

import { db } from "@/server/db";
import { waitlist } from "@/server/db/schema";

export async function addToWaitlist(formData: FormData) {
    const email = formData.get("email") as string;

    if (!email) {
        return { error: "Email is required" };
    }

    try {
        await db.insert(waitlist).values({ email });
        return { success: true };
    } catch (error) {
        console.error("Failed to add to waitlist:", error);
        return { error: "Something went wrong. You might already be on the list." };
    }
}
