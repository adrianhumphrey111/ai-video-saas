"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UploadCloud, Loader2, X } from "lucide-react";
import { api } from "@/trpc/react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { nanoid } from "nanoid";

export interface UploadResult {
    url: string;
    storagePath: string;
    fileName: string;
    elementId?: string;
    versionId?: string;
}

interface UploadZoneProps {
    onUploadComplete?: (result: UploadResult) => void;
    className?: string;
    kind?: "character" | "object" | "other";
    nameHint?: string;
}

export function UploadZone({ onUploadComplete, className, kind = "character", nameHint }: UploadZoneProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    const supabase = createSupabaseBrowserClient();
    const saveUploadMutation = api.uploads.create.useMutation();
    const createElementVersion = api.elements.createVersionFromUpload.useMutation();

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Type check (image only)
        if (!file.type.startsWith("image/")) {
            toast.error("Please upload an image file");
            return;
        }

        // Size check (e.g. 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size must be less than 5MB");
            return;
        }

        setIsUploading(true);
        setPreview(URL.createObjectURL(file));

        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                throw new Error("You must be logged in to upload files.");
            }

            const fileExt = file.name.split(".").pop();
            const fileName = `${nanoid()}.${fileExt}`;
            const storagePath = `${user.id}/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from("user-uploads")
                .upload(storagePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // Save metadata to DB
            await saveUploadMutation.mutateAsync({
                userId: user.id,
                storagePath: storagePath,
                originalName: file.name,
                mimeType: file.type,
                size: file.size,
            });

            // Get public URL (or signed URL if private, assuming public for avatars for now)
            const { data: { publicUrl } } = supabase.storage
                .from("user-uploads")
                .getPublicUrl(storagePath);

            const elementName =
                nameHint ||
                file.name.replace(/\.[^/.]+$/, "") ||
                "Untitled element";

            const { elementId, versionId, imageUrl } = await createElementVersion.mutateAsync({
                elementId: undefined,
                userId: user.id,
                kind,
                name: elementName,
                source: "upload",
                asset: {
                    storagePath,
                    publicUrl,
                    mimeType: file.type,
                    sizeBytes: file.size,
                },
            });

            toast.success("Image uploaded successfully!");
            onUploadComplete?.({
                url: imageUrl ?? publicUrl,
                storagePath,
                fileName: file.name,
                elementId,
                versionId,
            });

        } catch (error) {
            console.error("Upload error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to upload image");
            setPreview(null);
        } finally {
            setIsUploading(false);
            // Reset input value to allow re-uploading same file if needed
            e.target.value = "";
        }
    };

    return (
        <div className={`w-full ${className}`}>
            <label
                className={`
          relative flex flex-col items-center justify-center w-full h-48 
          border-2 border-dashed rounded-lg cursor-pointer 
          bg-muted/5 hover:bg-muted/10 transition-colors
          ${isUploading ? "opacity-50 cursor-not-allowed" : "border-muted-foreground/25 hover:border-primary/50"}
        `}
            >
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                    {isUploading ? (
                        <>
                            <Loader2 className="w-8 h-8 mb-4 text-primary animate-spin" />
                            <p className="mb-2 text-sm text-foreground">Uploading...</p>
                        </>
                    ) : preview ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={preview} alt="Preview" className="max-h-36 rounded-md object-contain" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-md">
                                <p className="text-white text-sm font-medium">Click to change</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                            <p className="mb-2 text-sm font-medium text-foreground">
                                <span className="font-semibold">Click into upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground">
                                SVG, PNG, JPG or GIF (MAX. 5MB)
                            </p>
                        </>
                    )}
                </div>
                <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                />
            </label>
        </div>
    );
}
