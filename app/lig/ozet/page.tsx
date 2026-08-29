import { headers } from "next/headers";

import { gunGoster, ligBilgisi } from "@/lib/lig";
import { ozetMetni, skorYaz, type OzetMaci } from "@/lib/ozet";
import { createClient } from "@/lib/supabase/server";

import { setleriOku, type MacSatiri } from "../mac-karti";
import { PaylasimDugmeleri } from "./paylas";

const HAFTA_GUN = 7;

/** Sitenin adresini istekten öğren — ortam değişkeni ayarlamaya gerek kalmasın. */
async function siteAdresi(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protokol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protokol}://${host}/lig`;
}

export default async function HaftalikOzet() {
  const lig = await ligBilgisi();
  if (!lig) return null;

  const supabase = await createClient();

  const simdi = new Date();
  const basiIso = new Date(
    simdi.getTime() - HAFTA_GUN * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [{ data: haftaninMaclari }, { data: siralama }, { count: bekleyen }] =
    await Promise.all([
      supabase
        .from("mac_gecmisi")
        .select("*")
        .eq("league_id", lig.ligId)
        .gte("played_at", basiIso)
        .order("played_at", { ascending: false }),
      supabase
        .from("puan_tablosu")
        .select("display_name, rating")
        .eq("league_id", lig.ligId)
        .eq("match_type", "singles")
        .order("rating", { ascending: false })
        .limit(3),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("league_id", lig.ligId)
        .eq("status", "proposed")
        .gt("played_at", simdi.toISOString()),
    ]);

  const maclar = (haftaninMaclari ?? []) as MacSatiri[];

  // Haftanın oyuncusu: mac_gecmisi zaten maç başına Elo değişimini taşıyor,
  // o yüzden ayrı bir sorgu gerekmiyor — aynı satırları toplamak yeterli.
  const kazanclar = new Map<string, { ad: string; kazanc: number; mac: number }>();
  for (const m of maclar) {
    const taraflar: [string | null, string | null, number | string | null][] = [
      [m.oyuncu1_id, m.oyuncu1_ad, m.oyuncu1_elo_degisim],
      [m.oyuncu2_id, m.oyuncu2_ad, m.oyuncu2_elo_degisim],
    ];
    for (const [id, ad, degisim] of taraflar) {
      if (!id) continue;
      const onceki = kazanclar.get(id) ?? { ad: ad ?? "—", kazanc: 0, mac: 0 };
      kazanclar.set(id, {
        ad: ad ?? onceki.ad,
        kazanc: onceki.kazanc + Number(degisim ?? 0),
        mac: onceki.mac + 1,
      });
    }
  }

  const haftaninOyuncusu =
    [...kazanclar.values()].sort((a, b) => b.kazanc - a.kazanc)[0] ?? null;

  const ozetMaclari: OzetMaci[] = maclar.map((m) => {
    const kazananTakim = m.winner_team;
    const kazanan =
      (kazananTakim === 2 ? m.oyuncu2_ad : m.oyuncu1_ad) ?? "—";
    const kaybeden =
      (kazananTakim === 2 ? m.oyuncu1_ad : m.oyuncu2_ad) ?? "—";
    return {
      kazanan,
      kaybeden,
      skor: skorYaz(setleriOku(m.setler), kazananTakim),
    };
  });

  const metin = ozetMetni({
    baslangic: gunGoster(basiIso.slice(0, 10)),
    bitis: gunGoster(simdi.toISOString().slice(0, 10)),
    maclar: ozetMaclari,
    // Kimse puan kazanmadıysa "haftanın oyuncusu" demek yanlış olur.
    haftaninOyuncusu:
      haftaninOyuncusu && haftaninOyuncusu.kazanc > 0 ? haftaninOyuncusu : null,
    ilkUc: (siralama ?? []).map((s) => ({
      ad: s.display_name ?? "—",
      elo: Number(s.rating ?? 0),
    })),
    bekleyenOneri: bekleyen ?? 0,
    siteAdresi: await siteAdresi(),
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between border-b-4 border-kort pb-2">
        <h2 className="text-[32px] md:text-[44px]">Haftalık Özet</h2>
        <span className="mb-1.5 font-veri text-[12px] uppercase tracking-wider text-murekkep-silik">
          Son {HAFTA_GUN} gün
        </span>
      </header>

      <p className="max-w-xl text-sm leading-6 text-murekkep-sonuk">
        Gruba yapıştırmak için hazır metin. Otomatik gönderim yok —
        &quot;WhatsApp&apos;ta paylaş&quot; sadece uygulamayı metin hazır
        hâlde açar, hangi gruba gideceğine sen karar verirsin.
      </p>

      <PaylasimDugmeleri metin={metin} />

      {/* Metnin kendisi ekranda: paylaşmadan önce ne göndereceğini gör. */}
      <pre className="overflow-x-auto whitespace-pre-wrap break-words border border-cizgi bg-yuzey-panel px-4 py-4 font-veri text-[13px] leading-6 text-murekkep">
        {metin}
      </pre>

      {maclar.length === 0 && (
        <p className="text-xs leading-5 text-murekkep-silik">
          Bu hafta maç oynanmamış. Takvimi doldurmak eşleştirmeyi tetikler.
        </p>
      )}
    </div>
  );
}
