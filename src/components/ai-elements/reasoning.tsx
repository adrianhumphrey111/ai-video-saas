"use client";

import {
    ChainOfThought,
    ChainOfThoughtContent,
    ChainOfThoughtHeader,
} from "@/components/ai-elements/chain-of-thought";
import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

export const Reasoning = ({
    className,
    children,
    isStreaming,
    ...props
}: ComponentProps<typeof ChainOfThought> & { isStreaming?: boolean }) => {
    return (
        <ChainOfThought
            className={cn("w-full", className)}
            defaultOpen={isStreaming}
            {...props}
        >
            {children}
        </ChainOfThought>
    );
};

export const ReasoningTrigger = ({ className, ...props }: ComponentProps<typeof ChainOfThoughtHeader>) => {
    return <ChainOfThoughtHeader className={className} {...props} />;
};

export const ReasoningContent = ({ className, children, ...props }: ComponentProps<typeof ChainOfThoughtContent>) => {
    return (
        <ChainOfThoughtContent className={className} {...props}>
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                {children}
            </div>
        </ChainOfThoughtContent>
    );
};
