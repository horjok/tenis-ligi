import { ligBilgisi } from "@/lib/lig";
import { createClient } from "@/lib/supabase/server";

import { MacKarti, type MacSatiri } from "../mac-karti";

export default async function MacGecmisi() {
  const lig = await ligBilgisi();
  if (!lig) return null;

  const supabase = await createClient();
  const { data: maclar } = await supabase
    .from("mac_gecmisi")
    .select("*")
    .eq("league_id", lig.ligId)
    .order("played_at", { ascending: false });

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between border-b-4 border-kort pb-2">
        <h2 className="text-[32px] md:text-[44px]">Maçlar</h2>
        <span className="mb-1.5 font-veri text-[12px] uppercase tracking-wider text-murekkep-silik">
          {maclar?.length ?? 0} maç
        </span>
      </header>

      {!maclar || maclar.length === 0 ? (
        <p className="border border-dashed border-cizgi px-4 py-12 text-center text-sm text-murekkep-silik">
          Henüz maç kaydedilmemiş.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {(maclar as MacSatiri[]).map((mac) => (
            <MacKarti key={mac.match_id} mac={mac} />
          ))}
        </div>
      )}

      <p className="max-w-xl text-xs leading-5 text-murekkep-silik">
        Elo değişimi kazananın kazandığı puanı gösterir; kaybeden aynı miktarı
        kaybeder. Sistem önerisinden doğan maçlarda kaydeden kişi yazmaz.
      </p>
    </div>
  );
}
