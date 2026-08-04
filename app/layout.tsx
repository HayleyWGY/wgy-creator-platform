import type { Metadata } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// The CSP nonce is generated per request in middleware, so pages can't be
// statically prerendered (a build-time HTML can't carry a per-request nonce).
// Forcing dynamic rendering app-wide is the required trade for nonce-based CSP
// in Next 14. Cost is small here: pages are client-rendered shells behind auth
// that weren't CDN-cacheable anyway.
export const dynamic = "force-dynamic";

// Playfair Display is used ITALIC ONLY (accent words), weights 400–600.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["italic"],
  variable: "--font-playfair",
  display: "swap",
});

// Montserrat is the structural workhorse, weights 400–900.
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WGY Creator Platform",
  description: "WeGotYou creator community platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${montserrat.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased font-montserrat bg-bg text-text">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
