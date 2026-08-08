import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wiggly v3",
  description: "Clean Wiggly rebuild: URL to brand-matched video ads.",
  icons: {
    icon: [
      { url: "/wiggly-app-icon-v1-32.png", sizes: "32x32", type: "image/png" },
      { url: "/wiggly-app-icon-v1-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/wiggly-app-icon-v1-32.png",
    apple: [
      { url: "/wiggly-app-icon-v1-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
