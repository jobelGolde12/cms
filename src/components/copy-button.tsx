"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silently fail — clipboard may be unavailable
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy child code"}
      title={copied ? "Copied!" : "Copy child code"}
      className="inline-flex h-6 items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-1.5 text-[10px] font-medium text-brand-600 transition-all duration-150 hover:bg-brand-100 hover:border-brand-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
    >
      {copied ? (
        <>
          <Check aria-hidden="true" className="h-3 w-3 text-emerald-600" />
          <span className="text-emerald-600">Copied</span>
        </>
      ) : (
        <>
          <Copy aria-hidden="true" className="h-3 w-3" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}
