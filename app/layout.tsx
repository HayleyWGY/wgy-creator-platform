import type { Metadata } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

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
