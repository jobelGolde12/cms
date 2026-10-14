"use client";

import { Printer } from "lucide-react";
import { Button } from "./button";

/** Triggers the browser print dialog (documents never auto-print). */
export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button
      type="button"
      size="sm"
      onClick={() => window.print()}
      className="print:hidden"
    >
      <Printer aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
