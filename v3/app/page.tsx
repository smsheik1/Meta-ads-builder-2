import type { Metadata } from "next";
import { WaitlistPage } from "./waitlist/WaitlistPage";

export const metadata: Metadata = {
  title: "Wiggly Early Access",
  description: "Turn one product page into a week of on-brand Meta ad creative.",
};

export default function HomePage() {
  return <WaitlistPage />;
}
