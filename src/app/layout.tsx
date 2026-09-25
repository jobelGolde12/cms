import type { Metadata, Viewport } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import "./globals.css";

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

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
    <html lang="en" className={`${firaSans.variable} ${firaCode.variable} h-full antialiased`}>
      <body className="min-h-full bg-brand-50 font-sans text-brand-950">
        {children}
      </body>
    </html>
  );
}
