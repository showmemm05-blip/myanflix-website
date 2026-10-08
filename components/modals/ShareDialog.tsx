"use client";

import { useState } from "react";
import { Link2, MessageCircle, Send, X as XIcon } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/system/Modal";
import { CheckIcon } from "@/components/system/icons";
import { fieldClass } from "@/components/system/Field";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";

const SHARE_TARGETS = [
  { icon: Link2, label: "Facebook" },
  { icon: XIcon, label: "Twitter" },
  { icon: MessageCircle, label: "Messenger" },
  { icon: Send, label: "Telegram" },
];

/**
 * Share a title: the four share targets (still stubs — each says so in a
 * toast, as before) and the link with a Copy button. Board dialog frame,
 * bottom sheet on phones.
 */
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
    <Modal open={open} onOpenChange={onOpenChange} title={t.dialogs.shareTitle} subtitle={title} size="sm">
      <div className="grid grid-cols-4 gap-2">
        {SHARE_TARGETS.map((target) => (
          <button
            key={target.label}
            type="button"
            onClick={() => toast.info(t.dialogs.shareStub(target.label))}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-[12px] border-0 bg-transparent py-3 text-[13px] font-semibold text-fg-muted transition-colors duration-150 outline-none hover:bg-tonal-ghost hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-tonal-soft text-fg">
              <target.icon className="size-5" strokeWidth={1.75} />
            </span>
            {target.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          aria-label={t.dialogs.copyLink}
          onFocus={(event) => event.currentTarget.select()}
          className={cn(fieldClass(), "text-fg-muted")}
        />
        <Button variant="tonal" size="cta" className="h-[52px] shrink-0" onClick={handleCopy}>
          {copied && <CheckIcon size={18} className="text-money" />}
          {t.dialogs.copyLink}
        </Button>
      </div>
    </Modal>
  );
}
