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
    <div>
      <h1 className="text-xl font-semibold">Önerilerim</h1>
      <p className="mt-1 mb-6 max-w-xl text-sm leading-6 text-zinc-500">
        Aynı saati işaretlediğin oyuncularla otomatik oluşan maç önerileri.
        İkiniz de kabul edince maç kesinleşir.
      </p>

      {gruplar.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">
            Şu an bekleyen önerin yok.
          </p>
          <Link
            href="/lig/takvim"
            className="mt-4 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Takvimde müsait saatlerini işaretle
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {gruplar.map(([dilim, grupOnerileri]) => (
            <OneriKarti
              key={dilim}
              baslik={dilimEtiketi(dilim)}
              oneriler={grupOnerileri}
            />
          ))}
        </ul>
      )}

      <p className="mt-6 max-w-xl text-xs leading-5 text-zinc-500">
        Kabul ettiğinde o saatteki diğer önerilerin iptal olmaz — rakibin
        reddederse elin boş kalmasın diye. Maç ancak iki taraf da kabul edince
        kesinleşir; o an diğer önerilerin kapanır.
      </p>
    </div>
  );
}
