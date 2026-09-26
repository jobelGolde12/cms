import { WelcomeHeader } from "./WelcomeHeader";
import { WelcomeHero } from "./WelcomeHero";
import { WelcomeHowItWorks } from "./WelcomeHowItWorks";
import { WelcomeFeatures } from "./WelcomeFeatures";
import { WelcomeAbout } from "./WelcomeAbout";
import { WelcomeCTA } from "./WelcomeCTA";
import { WelcomeFooter } from "./WelcomeFooter";

/**
 * Main Welcome / Landing Page for the Municipal Child Mapping System.
 *
 * Public-facing entry point: communicates the system's purpose and audience,
 * showcases the major features, and guides users to Sign In / Register.
 * All content is derived from the codebase (routes, constants, real features).
 *
 * Server Component — no client-side JavaScript is needed on this page.
 */
export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-brand-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-950 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <WelcomeHeader />
      <main id="main-content">
        <WelcomeHero />
        <WelcomeHowItWorks />
        <WelcomeFeatures />
        <WelcomeAbout />
        <WelcomeCTA />
      </main>
      <WelcomeFooter />
    </div>
  );
}
