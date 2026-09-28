import type { Metadata, Viewport } from "next";
import { Fira_Sans, Fira_Code } from "next/font/google";
import { BRAND_NAME, logoImage } from "@/components/logo";
import "./globals.css";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-fira-sans",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-fira-code",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * Site-wide metadata.
 *
 * BRAND NOTE: all logo usage must flow through <Logo /> (src/components/logo.tsx)
 * to keep the brand consistent. The favicon / apple-touch-icon are generated
 * from the same canonical asset via file conventions (src/app/icon.png and
 * src/app/apple-icon.png — see scripts/generate-brand-icons.mts), so Next.js
 * emits the <link rel="icon"> tags automatically; they are intentionally NOT
 * duplicated here. Social previews reuse the logoImage export below.
 */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Child Mapping System — Sta. Magdalena",
    template: "%s — Child Mapping System",
  },
  description:
    "Municipal child-mapping information management platform for the Municipality of Sta. Magdalena, Sorsogon.",
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    locale: "en_PH",
    title: "Child Mapping System — Sta. Magdalena",
    description:
      "Municipal child-mapping information management platform for the Municipality of Sta. Magdalena, Sorsogon.",
    images: [
      {
        url: logoImage.src,
        width: logoImage.width,
        height: logoImage.height,
        alt: BRAND_NAME,
      },
    ],
  },
  twitter: {
    // Square brand mark → "summary" card.
    card: "summary",
    title: "Child Mapping System — Sta. Magdalena",
    description:
      "Municipal child-mapping information management platform for the Municipality of Sta. Magdalena, Sorsogon.",
    images: [logoImage.src],
  },
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
