import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tarkov Price Checker",
  description: "Real-time pricing for Escape from Tarkov items",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
