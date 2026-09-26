import type { Metadata } from "next";
import WelcomePage from "@/components/welcome/WelcomePage";

export const metadata: Metadata = {
  title: "Child Mapping System — Sta. Magdalena",
  description:
    "Official child census, DepEd Form 1 verification, and monitoring platform for the Municipality of Sta. Magdalena, Sorsogon. For authorized barangay, LGU, and administrator personnel.",
};

export default function Page() {
  return <WelcomePage />;
}
