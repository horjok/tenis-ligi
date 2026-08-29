import type { Metadata } from "next";
import { Archivo, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";

import { TEMA_BETIGI } from "@/lib/tema";

import "./globals.css";

/*
 * Üç yazı tipi, üç ayrı iş:
 *   Barlow Condensed — başlıklar ve menü. Sıkışık, büyük harf, tabela gibi.
 *   Archivo          — okunacak her şey.
 *   IBM Plex Mono    — sayılar. Eşit genişlikli olduğu için puanlar ve
 *                      skorlar sütun sütun hizalı duruyor.
 *
 * `latin-ext` alt kümesi Türkçe karakterler (ş, ğ, ı, İ) için gerekli.
 */
const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Tenis Ligi",
  description: "Hobi tenis ligi — maç kaydı ve Elo puan tablosu",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    /*
     * lang="tr" sadece erişilebilirlik için değil: CSS `uppercase` dönüşümü
     * dile bakıyor. Bu olmadan "işaretle" -> "ISARETLE" olurdu, "İŞARETLE"
     * değil.
     */
    <html
      lang="tr"
      className={`${barlow.variable} ${archivo.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/*
         * Tema betiği: sayfa BOYANMADAN önce çalışmalı.
         *
         * Tercih localStorage'da, sunucu onu göremiyor. Bu betik olmasaydı
         * sunucu hep açık temayı gönderir, JavaScript yüklendikten sonra
         * koyuya dönerdi — koyu tema seçen kullanıcı her açılışta beyaz bir
         * parlama görürdü.
         *
         * suppressHydrationWarning yukarıda: betik <html>'in özniteliğini
         * sunucunun gönderdiğinden farklı hale getiriyor, React bunu
         * uyuşmazlık sanmasın.
         */}
        <script dangerouslySetInnerHTML={{ __html: TEMA_BETIGI }} />
      </head>
      <body className="flex min-h-full flex-col bg-yuzey text-murekkep">
        {children}
      </body>
    </html>
  );
}
