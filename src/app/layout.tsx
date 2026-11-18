import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FoodSync AI - Smart Restaurant Inventory & Food Rescue",
  description: "AI-powered inventory management, FEFO batch tracking, and FSSAI-compliant surplus food redistribution network.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
