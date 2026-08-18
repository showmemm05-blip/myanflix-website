"use client";

import { useState } from "react";
import { Check, Copy, Link2, MessageCircle, Send, X as XIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/context/language-context";
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
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t.dialogs.linkCopied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t.common.somethingWentWrong);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 rounded-3xl p-5 ring-white/10 sm:max-w-md sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-section-title">{t.dialogs.shareTitle}</DialogTitle>
          {/* The thing being shared, named right under the question. */}
          <p className="truncate text-sm text-muted-foreground" title={title}>
            {title}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2">
          {SHARE_TARGETS.map((target) => (
            <button
              key={target.label}
              type="button"
              onClick={() => toast.info(t.dialogs.shareStub(target.label))}
              className="flex flex-col items-center gap-2 rounded-2xl bg-white/[0.04] py-3.5 text-xs text-muted-foreground ring-1 ring-white/10 transition-[background-color,box-shadow,transform] duration-200 ease-out outline-none ring-inset hover:bg-white/8 hover:text-foreground hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/25 ring-inset">
                <target.icon className="size-4.5" />
              </span>
              {target.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={url}
            aria-label={t.dialogs.copyLink}
            className="h-11 rounded-full border-white/10 bg-white/[0.04] px-4 text-muted-foreground dark:bg-white/[0.04]"
          />
          <Button variant="outline" className="h-11 shrink-0 rounded-full px-5" onClick={handleCopy}>
            {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
            {t.dialogs.copyLink}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
