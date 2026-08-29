"use client";

import { useState } from "react";

/**
 * Paylaşım düğmeleri.
 *
 * WhatsApp'a OTOMATİK GÖNDERİM YOK ve olmayacak. `wa.me` bağlantısı yalnızca
 * uygulamayı metin hazır hâlde açıyor; hangi gruba gideceğine ve gidip
 * gitmeyeceğine kullanıcı karar veriyor. Resmî WhatsApp API'si için işletme
 * hesabı ve mesaj başına ücret gerekiyor, gayriresmî kütüphaneler ise
 * hesabın kapanma riskini taşıyor.
 */
export function PaylasimDugmeleri({ metin }: { metin: string }) {
  const [kopyalandi, setKopyalandi] = useState(false);

  // encodeURIComponent satır sonlarını da kodluyor; WhatsApp bunları
  // gerçek satır sonu olarak açıyor.
  const whatsappBaglantisi = `https://wa.me/?text=${encodeURIComponent(metin)}`;

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(metin);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      // Pano izni yoksa sessiz kal — metin zaten ekranda, elle seçilebilir.
      setKopyalandi(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={whatsappBaglantisi}
        target="_blank"
        rel="noopener noreferrer"
        className="border border-kort bg-kort px-6 py-3 font-govde text-[14px] font-bold uppercase tracking-wider text-tebesir transition-colors hover:bg-kazanan hover:text-kort"
      >
        WhatsApp&apos;ta paylaş
      </a>

      <button
        type="button"
        onClick={kopyala}
        className="border-2 border-kort px-6 py-3 font-govde text-[14px] font-bold uppercase tracking-wider transition-colors hover:bg-kort hover:text-tebesir"
      >
        {kopyalandi ? "Kopyalandı" : "Metni kopyala"}
      </button>
    </div>
  );
}
