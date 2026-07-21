"use client";

import { useState } from "react";
import { Check, Copy, Link2, MessageCircle, Send, X as XIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SHARE_TARGETS = [
  { icon: Link2, label: "Facebook" },
  { icon: XIcon, label: "Twitter" },
  { icon: MessageCircle, label: "Messenger" },
  { icon: Send, label: "Telegram" },
];

export function ShareDialog({
  open,
  onOpenChange,
  title,
  url,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  url: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share &ldquo;{title}&rdquo;</DialogTitle>
        </DialogHeader>

        <div className="flex justify-between gap-2">
          {SHARE_TARGETS.map((target) => (
            <button
              key={target.label}
              type="button"
              onClick={() => toast.info(`Sharing to ${target.label} isn't wired up yet.`)}
              className="flex flex-1 flex-col items-center gap-2 rounded-lg border border-white/[0.08] bg-secondary/40 py-3 text-xs text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
            >
              <target.icon className="size-5" />
              {target.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Input readOnly value={url} className="bg-secondary/40" />
          <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copy link">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
