import Link from "next/link";

import { eloGoster, ligBilgisi } from "@/lib/lig";
import { createClient } from "@/lib/supabase/server";

import { MacKarti, type MacSatiri } from "./mac-karti";

export default async function Anasayfa() {
  const lig = await ligBilgisi();
  if (!lig) return null;

  const supabase = await createClient();

  const [{ data: siralama }, { data: sonMaclar }] = await Promise.all([
    supabase
      .from("puan_tablosu")
      .select("user_id, display_name, rating, matches_played, galibiyet, maglubiyet")
      .eq("league_id", lig.ligId)
      .eq("match_type", "singles")
      .order("rating", { ascending: false }),
    supabase
      .from("mac_gecmisi")
      .select("*")
      .eq("league_id", lig.ligId)
      .order("played_at", { ascending: false })
      .limit(3),
  ]);

  const bosTablo = !siralama || siralama.length === 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-6">
      {/* ---------- Liderlik tablosu ---------- */}
      <section className="flex flex-col gap-5 lg:col-span-8">
        <header className="flex items-end justify-between border-b-4 border-kort pb-2">
          <h2 className="text-[32px] md:text-[44px]">Liderlik Tablosu</h2>
          <span className="mb-1.5 font-veri text-[12px] uppercase tracking-wider text-murekkep-silik">
            Tekler
          </span>
        </header>

        {bosTablo ? (
          <div className="border border-cizgi bg-yuzey-panel px-6 py-12 text-center">
            <p className="text-sm text-murekkep-sonuk">
              Henüz maç kaydedilmemiş. İlk maç girildiğinde tablo burada oluşur.
            </p>
            <Link
              href="/lig/mac-ekle"
              className="mt-6 inline-block border border-kort bg-kort px-6 py-3 font-govde text-[14px] font-bold uppercase tracking-wider text-tebesir transition-colors hover:bg-kazanan hover:text-kort"
            >
              Maç ekle
            </Link>
          </div>
        ) : (
          <div className="border border-cizgi bg-yuzey-panel">
            {/* Başlık satırı */}
            <div className="grid grid-cols-12 gap-2 border-b border-cizgi bg-yuzey-yukseltilmis px-3 py-2.5 font-baslik text-[15px] uppercase tracking-wider text-murekkep-silik">
              <div className="col-span-2 sm:col-span-1">#</div>
              <div className="col-span-6 sm:col-span-5">Oyuncu</div>
              <div className="col-span-2 text-right sm:col-span-3">G/M</div>
              <div className="col-span-2 text-right sm:col-span-3">Elo</div>
            </div>

            {siralama.map((satir, sira) => {
              const benMiyim = satir.user_id === lig.kullaniciId;
              const sonSatir = sira === siralama.length - 1;

              return (
                <div
                  key={satir.user_id}
                  className={[
                    "grid grid-cols-12 items-center gap-2 border-l-4 px-3 py-2.5",
                    sonSatir ? "" : "border-b border-b-cizgi",
                    benMiyim
                      ? "border-l-kort bg-yuzey-yukseltilmis"
                      : "border-l-transparent",
                  ].join(" ")}
                >
                  <div
                    className={`col-span-2 veri text-[20px] sm:col-span-1 ${
                      sira < 3 ? "text-murekkep" : "text-murekkep-silik"
                    }`}
                  >
                    {sira + 1}
                  </div>

                  <div className="col-span-6 flex min-w-0 items-center gap-2 sm:col-span-5">
                    <span
                      className={`truncate font-baslik text-[20px] uppercase md:text-[26px] ${
                        benMiyim ? "font-bold" : ""
                      }`}
                    >
                      {satir.display_name}
                    </span>
                    {benMiyim && (
                      <span className="shrink-0 bg-kort px-1.5 py-0.5 font-veri text-[10px] uppercase tracking-wide text-tebesir">
                        Sen
                      </span>
                    )}
                  </div>

                  <div className="col-span-2 veri text-right text-[15px] text-murekkep-sonuk sm:col-span-3 sm:text-[18px]">
                    {satir.galibiyet}-{satir.maglubiyet}
                  </div>

                  <div
                    className={`col-span-2 veri text-right text-[18px] sm:col-span-3 sm:text-[22px] ${
                      benMiyim ? "font-bold" : ""
                    }`}
                  >
                    {eloGoster(satir.rating)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="max-w-xl text-xs leading-5 text-murekkep-silik">
          Herkes 1000 puanla başlar. Güçlü rakibi yenmek çok, zayıf rakibi
          yenmek az kazandırır.
        </p>
      </section>

      {/* ---------- Son maçlar ---------- */}
      <section className="flex flex-col gap-5 lg:col-span-4">
        <header className="flex items-end justify-between border-b-4 border-kort pb-2">
          <h2 className="text-[24px] md:text-[30px]">Son Maçlar</h2>
        </header>

        {!sonMaclar || sonMaclar.length === 0 ? (
          <p className="border border-dashed border-cizgi px-4 py-8 text-center text-sm text-murekkep-silik">
            Henüz maç yok.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {(sonMaclar as MacSatiri[]).map((mac) => (
              <MacKarti key={mac.match_id} mac={mac} />
            ))}
            <Link
              href="/lig/maclar"
              className="mt-1 w-full border-2 border-kort py-3 text-center font-govde text-[14px] font-bold uppercase tracking-wider transition-colors hover:bg-kort hover:text-tebesir"
            >
              Tüm maçlar
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
