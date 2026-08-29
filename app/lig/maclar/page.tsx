import Link from "next/link";

import { ligBilgisi } from "@/lib/lig";
import { createClient } from "@/lib/supabase/server";

import { type MacSatiri } from "../mac-karti";
import { MacGecmisiSatiri } from "./mac-satiri";

/** İlk açılışta gösterilecek maç sayısı; "daha fazla" bu kadar ekliyor. */
const SAYFA = 20;

/** "24 Mart Pazar" — CSS uppercase ile büyütülüyor (Türkçe i/İ için şart). */
function gunBasligi(isoTarih: string): string {
  return new Date(isoTarih).toLocaleDateString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    weekday: "long",
  });
}

/** Gruplama anahtarı: İstanbul takvimine göre gün. */
function gunAnahtari(isoTarih: string): string {
  return new Date(isoTarih).toLocaleDateString("sv-SE", {
    timeZone: "Europe/Istanbul",
  });
}

export default async function MacGecmisi(props: PageProps<"/lig/maclar">) {
  const lig = await ligBilgisi();
  if (!lig) return null;

  const parametreler = await props.searchParams;
  const hamAdet = parametreler.adet;
  const istenen = Number(Array.isArray(hamAdet) ? hamAdet[0] : hamAdet);
  // Adres çubuğundan gelen sayıya güvenmiyoruz: geçersizse varsayılana,
  // aşırı büyükse üst sınıra düşüyor.
  const adet =
    Number.isFinite(istenen) && istenen > 0
      ? Math.min(Math.ceil(istenen / SAYFA) * SAYFA, 500)
      : SAYFA;

  const supabase = await createClient();

  const [{ data: maclar }, { count: toplam }] = await Promise.all([
    supabase
      .from("mac_gecmisi")
      .select("*")
      .eq("league_id", lig.ligId)
      .order("played_at", { ascending: false })
      .limit(adet),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("league_id", lig.ligId)
      .eq("status", "played"),
  ]);

  const satirlar = (maclar ?? []) as MacSatiri[];
  const toplamMac = toplam ?? satirlar.length;
  const dahaVar = satirlar.length < toplamMac;

  // Güne göre grupla. Sıralama zaten tarihe göre geldiği için tek geçiş yeter.
  const gruplar: { anahtar: string; baslik: string; maclar: MacSatiri[] }[] = [];
  for (const mac of satirlar) {
    const anahtar = gunAnahtari(mac.played_at);
    const son = gruplar[gruplar.length - 1];
    if (son && son.anahtar === anahtar) {
      son.maclar.push(mac);
    } else {
      gruplar.push({
        anahtar,
        baslik: gunBasligi(mac.played_at),
        maclar: [mac],
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between border-b-4 border-kort pb-2">
        <h2 className="text-[32px] md:text-[44px]">Maçlar</h2>
        <span className="mb-1.5 font-veri text-[12px] uppercase tracking-wider text-murekkep-silik">
          {satirlar.length} / {toplamMac} maç
        </span>
      </header>

      {satirlar.length === 0 ? (
        <p className="border border-dashed border-cizgi px-4 py-12 text-center text-sm text-murekkep-silik">
          Henüz maç kaydedilmemiş.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {gruplar.map((grup) => (
            <section key={grup.anahtar} className="flex flex-col gap-3">
              <h3 className="border-b border-cizgi pb-1 text-[18px] text-murekkep-sonuk">
                {grup.baslik}
              </h3>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {grup.maclar.map((mac) => (
                  <MacGecmisiSatiri key={mac.match_id} mac={mac} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {dahaVar && (
        <Link
          href={`/lig/maclar?adet=${adet + SAYFA}`}
          className="w-full border-2 border-kort py-3 text-center font-govde text-[14px] font-bold uppercase tracking-wider transition-colors hover:bg-kort hover:text-tebesir"
        >
          Daha fazla yükle
        </Link>
      )}

      <p className="max-w-xl text-xs leading-5 text-murekkep-silik">
        Kazanan ne kadar puan aldıysa kaybeden o kadar kaybeder. Çiftlerde
        takımdaki iki oyuncu da aynı puanı alır.
      </p>
    </div>
  );
}
