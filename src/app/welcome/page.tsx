import type { Metadata } from "next";
import WelcomePage from "@/components/welcome/WelcomePage";

export const metadata: Metadata = {
  title: "Records Management System — Sta. Magdalena NHS",
  description:
    "Student records, enrollment, performance analytics, and student development platform for Sta. Magdalena National High School, Sorsogon. For authorized school personnel.",
};

export default function Page() {
  return <WelcomePage />;
}
