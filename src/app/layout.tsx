import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cakelio — Design your cake. Find your baker.",
  description: "Design custom cakes, discover suitable bakers, compare quotes and manage your order in one place.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
