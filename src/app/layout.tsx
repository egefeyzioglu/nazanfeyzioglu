import "src/styles/globals.css";

import { type Metadata } from "next";
import { Spectral, Space_Mono } from "next/font/google";

export const metadata: Metadata = {
  title: "Nazan Feyzioğlu — Painter",
  description:
    "Selected series, originals and prints by Nazan Feyzioğlu, a self-taught visual artist based in Toronto.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spectral.variable} ${spaceMono.variable}`}>
      <body className="bg-paper font-spectral text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
