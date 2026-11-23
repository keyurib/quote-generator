import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/8bit/tooltip";

import "./globals.css";

const pixel = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
});

const terminal = VT323({
  variable: "--font-sans",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Life Quest",
  description: "An 8-bit daily quest for a better life: 45 lessons, each with a small action and a reflection.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-palette="parchment"
      className={`${pixel.variable} ${terminal.variable} h-full antialiased`}
    >
      <body className="crt min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
