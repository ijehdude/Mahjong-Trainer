import type { Metadata, Viewport } from "next";
import { Noto_Serif_SC, Noto_Sans_SC, DM_Sans } from "next/font/google";
import "./globals.css";

const notoSerifSC = Noto_Serif_SC({
  variable: "--font-noto-serif-sc",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mahjong Strategy Trainer",
  description:
    "Learn Singapore Mahjong with real-time AI strategy coaching on every discard.",
};

export const viewport: Viewport = {
  themeColor: "#0f1e17",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${notoSerifSC.variable} ${notoSansSC.variable} ${dmSans.variable} h-full`}
    >
      <body className="min-h-full font-body">{children}</body>
    </html>
  );
}
