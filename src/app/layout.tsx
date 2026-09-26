import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Child Mapping System — Sta. Magdalena",
    template: "%s — Child Mapping System",
  },
  description:
    "Municipal child-mapping information management platform for the Municipality of Sta. Magdalena, Sorsogon.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-brand-50 font-sans text-brand-950">
        {children}
      </body>
    </html>
  );
}
