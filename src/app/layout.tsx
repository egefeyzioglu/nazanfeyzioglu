import "src/styles/globals.css";

import { type Metadata } from "next";
import { Cormorant_Garamond, Geist, Hanken_Grotesk } from "next/font/google";

export const metadata: Metadata = {
  title: "Nazan Feyzioglu",
  description: "Selected works by Nazan Feyzioglu.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-hanken",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${hanken.variable} ${cormorant.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
