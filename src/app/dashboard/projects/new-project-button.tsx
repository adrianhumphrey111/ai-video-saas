"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function NewProjectButton({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("New Project");
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) requestAnimationFrame(() => inputRef.current?.focus());
      }}
    >
      <DialogTrigger asChild>
        <Button className="rounded-full bg-white text-black hover:bg-white/90" type="button">
          <Plus className="mr-2 h-4 w-4" />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-white/10 bg-black/95 text-white">
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-3">
          <Input
            ref={inputRef}
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-white/10 bg-white/5 text-white"
            maxLength={60}
            placeholder="Project name"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              className="text-slate-200 hover:bg-white/10"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-white text-black hover:bg-white/90">
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

