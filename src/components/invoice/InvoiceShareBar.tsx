import { useState } from "react";
import { Check, Copy, Download, Facebook, Link2, Mail, MessageCircle, Share2 } from "lucide-react";
import { invoiceShareText, invoiceShareUrl } from "@/lib/invoice";

const shareButton =
  "inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:border-gold/60 hover:text-gold";

/** Print / download plus one-tap social sharing for a branded invoice. */
export function InvoiceShareBar({
  invoiceId,
  invoiceNumber,
  amountLabel,
}: {
  invoiceId: string;
  invoiceNumber: string;
  amountLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = invoiceShareUrl(invoiceId);
  const text = invoiceShareText(invoiceNumber, amountLabel);
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const open = (href: string) => window.open(href, "_blank", "noopener,noreferrer");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) return void copy();
    try {
      await navigator.share({ title: `Invoice ${invoiceNumber}`, text, url });
    } catch {
      /* user dismissed */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button type="button" className={shareButton} onClick={() => window.print()}>
        <Download className="size-3.5" /> Download PDF
      </button>
      <button
        type="button"
        className={shareButton}
        onClick={() => open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`)}
      >
        <MessageCircle className="size-3.5" /> WhatsApp
      </button>
      <button
        type="button"
        className={shareButton}
        onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
      >
        <Facebook className="size-3.5" /> Facebook
      </button>
      <button
        type="button"
        className={shareButton}
        onClick={() => open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`)}
      >
        <Link2 className="size-3.5" /> X
      </button>
      <button
        type="button"
        className={shareButton}
        onClick={() =>
          open(`mailto:?subject=${encodeURIComponent(`Invoice ${invoiceNumber}`)}&body=${encodedText}%20${encodedUrl}`)
        }
      >
        <Mail className="size-3.5" /> Email
      </button>
      <button type="button" className={shareButton} onClick={() => void copy()}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy link"}
      </button>
      <button type="button" className={shareButton} onClick={() => void nativeShare()}>
        <Share2 className="size-3.5" /> Share
      </button>
    </div>
  );
}
