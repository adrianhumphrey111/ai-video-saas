import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

export const Loader = ({ className }: { className?: string }) => {
    return (
        <div className={cn("flex items-center justify-center p-4", className)}>
            <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
    );
};
