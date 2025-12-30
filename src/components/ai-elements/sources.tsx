"use client";

import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { BookOpenIcon, ChevronDownIcon } from "lucide-react";
import { ComponentProps, useState } from "react";

export const Sources = ({ className, children, ...props }: ComponentProps<typeof Collapsible>) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className={cn("w-full space-y-2", className)}
            {...props}
        >
            {children}
        </Collapsible>
    );
};

export const SourcesTrigger = ({ count, className, ...props }: ComponentProps<typeof Button> & { count: number }) => {
    return (
        <CollapsibleTrigger asChild>
            <Button
                variant="outline"
                size="sm"
                className={cn("gap-2", className)}
                {...props}
            >
                <BookOpenIcon className="h-4 w-4" />
                <span>{count} Sources</span>
                <ChevronDownIcon className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
            </Button>
        </CollapsibleTrigger>
    );
};

export const SourcesContent = ({ className, children, ...props }: ComponentProps<typeof CollapsibleContent>) => {
    return (
        <CollapsibleContent
            className={cn("flex flex-col gap-2", className)}
            {...props}
        >
            {children}
        </CollapsibleContent>
    );
};

export const Source = ({ href, title, className, ...props }: ComponentProps<"a"> & { title: string }) => {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                "flex items-center gap-2 rounded-md border bg-muted/50 p-2 text-sm hover:bg-muted",
                className
            )}
            {...props}
        >
            <div className="flex-1 truncate font-medium">{title}</div>
        </a>
    );
};
