import type { Metadata } from "next";
import { Inter, Caveat } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const hand = Caveat({ subsets: ["latin"], variable: "--font-hand", weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "Gerenciador de Tarefas",
  description: "Organize tarefas por prioridade, metas diárias e objetivos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${hand.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
