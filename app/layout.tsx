import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simulador SIMPLE para freelancers",
  description:
    "Compara Régimen Ordinario vs. Régimen SIMPLE para freelancers colombianos que facturan servicios al exterior.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
