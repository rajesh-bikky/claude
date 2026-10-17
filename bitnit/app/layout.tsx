import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BITNIT — Build it or Nix it",
  description: "Ask the right users whether you should build it, then let the statistics decide.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
