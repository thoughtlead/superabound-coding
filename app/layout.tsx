import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Supabase Library App",
  description: "Next.js app with Supabase email magic-link auth",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
