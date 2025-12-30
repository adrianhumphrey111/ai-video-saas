"use client";

import type { ChatStatus } from "ai";
import { Loader2Icon, SendIcon, SquareIcon, XIcon } from "lucide-react";
import type {
    ComponentProps,
    HTMLAttributes,
    KeyboardEventHandler,
} from "react";
import { Children } from "react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type PromptInputProps = HTMLAttributes<HTMLFormElement>;

export const PromptInput = ({ className, ...props }: PromptInputProps) => (
    <form
        className={cn(
            "w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl transition-all duration-200 focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/20",
            className
        )}
        {...props}
    />
);

export type PromptInputTextareaProps = ComponentProps<typeof Textarea> & {
    minHeight?: number;
    maxHeight?: number;
    disableAutoResize?: boolean;
    resizeOnNewLinesOnly?: boolean;
};

export const PromptInputTextarea = ({
    onChange,
    className,
    placeholder = "What would you like to know?",
    minHeight = 48,
    maxHeight = 164,
    disableAutoResize = false,
    resizeOnNewLinesOnly = false,
    ...props
}: PromptInputTextareaProps) => {
    const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
        if (e.key === "Enter") {
            // Don't submit if IME composition is in progress
            if (e.nativeEvent.isComposing) {
                return;
            }

            if (e.shiftKey) {
                // Allow newline
                return;
            }

            // Submit on Enter (without Shift)
            e.preventDefault();
            const form = e.currentTarget.form;
            if (form) {
                form.requestSubmit();
            }
        }
    };

    return (
        <Textarea
            className={cn(
                "w-full resize-none rounded-none border-none p-4 text-base shadow-none outline-none ring-0 placeholder:text-slate-400",
                disableAutoResize
                    ? "field-sizing-fixed"
                    : resizeOnNewLinesOnly
                        ? "field-sizing-fixed"
                        : "field-sizing-content max-h-[200px]",
                "bg-transparent focus-visible:ring-0 text-slate-100",
                className
            )}
            name="message"
            onChange={(e) => {
                onChange?.(e);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            {...props}
        />
    );
};

export type PromptInputToolbarProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputToolbar = ({
    className,
    ...props
}: PromptInputToolbarProps) => (
    <div
        className={cn("flex items-center justify-between p-2 pt-0", className)}
        {...props}
    />
);

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputTools = ({
    className,
    ...props
}: PromptInputToolsProps) => (
    <div
        className={cn(
            "flex items-center gap-1",
            className
        )}
        {...props}
    />
);

export type PromptInputButtonProps = ComponentProps<typeof Button>;

export const PromptInputButton = ({
    variant = "ghost",
    className,
    size,
    ...props
}: PromptInputButtonProps) => {
    const newSize =
        (size ?? Children.count(props.children) > 1) ? "default" : "icon";

    return (
        <Button
            className={cn(
                "shrink-0 gap-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10",
                newSize === "default" && "px-3",
                className
            )}
            size={newSize}
            type="button"
            variant={variant}
            {...props}
        />
    );
};

export type PromptInputSubmitProps = ComponentProps<typeof Button> & {
    status?: ChatStatus;
};

export const PromptInputSubmit = ({
    className,
    variant = "default",
    size = "icon",
    status,
    children,
    ...props
}: PromptInputSubmitProps) => {
    let Icon = <SendIcon className="size-4" />;

    if (status === "submitted") {
        Icon = <Loader2Icon className="size-4 animate-spin" />;
    } else if (status === "streaming") {
        Icon = <SquareIcon className="size-4" />;
    } else if (status === "error") {
        Icon = <XIcon className="size-4" />;
    }

    return (
        <Button
            className={cn("gap-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20", className)}
            size={size}
            type="submit"
            variant={variant}
            {...props}
        >
            {children ?? Icon}
        </Button>
    );
};
