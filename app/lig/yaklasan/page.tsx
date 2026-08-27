import Link from "next/link";

import { ligBilgisi } from "@/lib/lig";
import { benimAcimdan, type OneriSatiri } from "@/lib/oneri";
import { createClient } from "@/lib/supabase/server";
import { dilimEtiketi } from "@/lib/takvim";

import { SonucFormu } from "./sonuc-formu";

export default async function YaklasanMaclar() {
  const lig = await ligBilgisi();
  if (!lig) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("oneri_listesi")
    .select("*")
    .eq("league_id", lig.ligId)
    .eq("status", "accepted")
    .or(`oyuncu1_id.eq.${lig.kullaniciId},oyuncu2_id.eq.${lig.kullaniciId}`)
    .order("played_at");

  const maclar = ((data ?? []) as OneriSatiri[]).map((satir) =>
    benimAcimdan(satir, lig.kullaniciId),
  );

  return (
    <div>
      <h1 className="text-xl font-semibold">Yaklaşan maçlar</h1>
      <p className="mt-1 mb-6 max-w-xl text-sm leading-6 text-zinc-500">
        Kesinleşmiş maçların. Oynadıktan sonra sonucu buradan gir — puanlar
        anında güncellenir.
      </p>

      {maclar.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">Kesinleşmiş maçın yok.</p>
          <Link
            href="/lig/onerilerim"
            className="mt-4 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Önerilerine bak
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {maclar.map((mac) => {
            const gecmis = new Date(mac.dilim) < new Date();

            return (
              <li
                key={mac.macId}
                className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
              >
                <div>
                  <p className="text-sm font-medium capitalize">
                    {dilimEtiketi(mac.dilim)}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    Rakip: {mac.rakipAd}
                    {!gecmis && " · henüz oynanmadı"}
                  </p>
                </div>

                {gecmis ? (
                  <SonucFormu
                    macId={mac.macId}
                    benimId={lig.kullaniciId}
                    rakipId={mac.rakipId}
                    rakipAd={mac.rakipAd}
                  />
                ) : (
                  <span className="text-xs text-zinc-500">
                    saati gelince sonuç girebilirsin
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
