
import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { userUploads } from "../../db/schema";
import { db } from "../../db";

export const uploadsRouter = router({
    create: publicProcedure
        .input(
            z.object({
                userId: z.string(),
                storagePath: z.string(),
                originalName: z.string().optional(),
                mimeType: z.string(),
                size: z.number().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const [upload] = await db.insert(userUploads).values({
                userId: input.userId,
                storagePath: input.storagePath,
                originalName: input.originalName,
                mimeType: input.mimeType,
                isAvatarReference: true,
            }).returning();

            return upload;
        }),
});
