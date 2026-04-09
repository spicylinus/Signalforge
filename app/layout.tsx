import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContentForge — AI Content Agent for Your Business",
  description:
    "Get weekly blog posts, daily social captions, and monthly newsletters written automatically by AI — tailored to your brand voice.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
