import Link from "next/link";

import { ligBilgisi } from "@/lib/lig";
import { benimAcimdan, dilimeGoreGrupla, type OneriSatiri } from "@/lib/oneri";
import { createClient } from "@/lib/supabase/server";
import { dilimEtiketi } from "@/lib/takvim";

import { OneriKarti } from "./oneri-karti";

export default async function Onerilerim() {
  const lig = await ligBilgisi();
  if (!lig) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("oneri_listesi")
    .select("*")
    .eq("league_id", lig.ligId)
    .eq("status", "proposed")
    .or(`oyuncu1_id.eq.${lig.kullaniciId},oyuncu2_id.eq.${lig.kullaniciId}`)
    .order("played_at");

  const oneriler = ((data ?? []) as OneriSatiri[]).map((satir) =>
    benimAcimdan(satir, lig.kullaniciId),
  );
  const gruplar = dilimeGoreGrupla(oneriler);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between border-b-4 border-kort pb-2">
        <h2 className="text-[32px] md:text-[44px]">Öneriler</h2>
        <span className="mb-1.5 font-veri text-[12px] uppercase tracking-wider text-murekkep-silik">
          {gruplar.length} saat
        </span>
      </header>

      <p className="max-w-xl text-sm leading-6 text-murekkep-sonuk">
        Aynı saati işaretlediğin oyuncularla otomatik oluşan maç önerileri.
        İkiniz de kabul edince maç kesinleşir.
      </p>

      {gruplar.length === 0 ? (
        <div className="border border-dashed border-cizgi px-4 py-12 text-center">
          <p className="text-sm text-murekkep-silik">
            Şu an bekleyen önerin yok.
          </p>
          <Link
            href="/lig/takvim"
            className="mt-6 inline-block border border-kort bg-kort px-6 py-3 font-govde text-[14px] font-bold uppercase tracking-wider text-tebesir transition-colors hover:bg-kazanan hover:text-kort"
          >
            Takvimde saat işaretle
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {gruplar.map(([dilim, grupOnerileri]) => (
            <OneriKarti
              key={dilim}
              baslik={dilimEtiketi(dilim)}
              oneriler={grupOnerileri}
            />
          ))}
        </ul>
      )}

      <p className="max-w-xl text-xs leading-5 text-murekkep-silik">
        Kabul ettiğinde o saatteki diğer önerilerin iptal olmaz — rakibin
        reddederse elin boş kalmasın diye. Maç ancak iki taraf da kabul edince
        kesinleşir; o an diğer önerilerin kapanır.
      </p>
    </div>
  );
}
