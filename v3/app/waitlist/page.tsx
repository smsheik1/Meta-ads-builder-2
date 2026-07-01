import type { Metadata } from "next";
import { WaitlistPage } from "./WaitlistPage";

export const metadata: Metadata = {
  title: "Wiggly Early Access",
  description: "One URL. Eight ad formats. Sixty seconds.",
};

export default function Page() {
  return <WaitlistPage />;
}

