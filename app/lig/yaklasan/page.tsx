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
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between border-b-4 border-kort pb-2">
        <h2 className="text-[32px] md:text-[44px]">Yaklaşan</h2>
        <span className="mb-1.5 font-veri text-[12px] uppercase tracking-wider text-murekkep-silik">
          {maclar.length} maç
        </span>
      </header>

      <p className="max-w-xl text-sm leading-6 text-murekkep-sonuk">
        Kesinleşmiş maçların. Oynadıktan sonra sonucu buradan gir — puanlar
        anında güncellenir.
      </p>

      {maclar.length === 0 ? (
        <div className="border border-dashed border-cizgi px-4 py-12 text-center">
          <p className="text-sm text-murekkep-silik">Kesinleşmiş maçın yok.</p>
          <Link
            href="/lig/onerilerim"
            className="mt-6 inline-block border border-kort bg-kort px-6 py-3 font-govde text-[14px] font-bold uppercase tracking-wider text-tebesir transition-colors hover:bg-kazanan hover:text-kort"
          >
            Önerilerine bak
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {maclar.map((mac) => {
            const gecmis = new Date(mac.dilim) < new Date();

            return (
              <li
                key={mac.macId}
                className="border border-cizgi bg-yuzey-panel"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-baslik text-[22px] uppercase">
                      {mac.rakipAd}
                    </p>
                    <p className="mt-0.5 font-veri text-[11px] uppercase tracking-wide text-murekkep-silik">
                      {dilimEtiketi(mac.dilim)}
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
                    <span className="border border-cizgi px-3 py-1.5 font-veri text-[11px] uppercase tracking-wide text-murekkep-silik">
                      Saati bekleniyor
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
