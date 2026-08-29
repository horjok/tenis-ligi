import Link from "next/link";

import { eloDegisimGoster, eloGoster, gunGoster, ligBilgisi } from "@/lib/lig";
import { createClient } from "@/lib/supabase/server";

import { MacKarti, type MacSatiri } from "./mac-karti";
import {
  SezonSecici,
  TurSecici,
  type MacTuru,
  type SezonOzeti,
} from "./sezon-secici";

/** Tabloda gösterilecek tek satır — hem tüm zamanlar hem sezon için aynı biçim. */
type TabloSatiri = {
  user_id: string;
  display_name: string;
  galibiyet: number;
  maglubiyet: number;
  elo: number | string | null;
  /** Sezon seçiliyse o sezondaki Elo kazancı; tüm zamanlarda null. */
  kazanc: number | string | null;
};

export default async function Anasayfa(props: PageProps<"/lig">) {
  const lig = await ligBilgisi();
  if (!lig) return null;

  const aramaParametreleri = await props.searchParams;
  const tek = (ad: string) => {
    const v = aramaParametreleri[ad];
    return Array.isArray(v) ? v[0] : v;
  };
  const istenenSezon = tek("sezon");
  // Bilinmeyen değer teklere düşüyor; adres çubuğundan gelen metne güven yok.
  const tur: MacTuru = tek("tur") === "doubles" ? "doubles" : "singles";
  const ciftler = tur === "doubles";

  const supabase = await createClient();

  const [{ data: sezonlar }, { data: tumZamanlar }, { data: sonMaclar }] =
    await Promise.all([
      supabase
        .from("seasons")
        .select("id, name, starts_on, ends_on")
        .eq("league_id", lig.ligId)
        .order("starts_on", { ascending: false }),
      supabase
        .from("puan_tablosu")
        .select("user_id, display_name, rating, matches_played, galibiyet, maglubiyet")
        .eq("league_id", lig.ligId)
        // Çiftler tablosunda yalnızca çiftler oynamış oyuncular çıkar:
        // ratings satırı ancak ilk maçta açılıyor, ayrı bir süzgeç gerekmiyor.
        .eq("match_type", tur)
        .order("rating", { ascending: false }),
      supabase
        .from("mac_gecmisi")
        .select("*")
        .eq("league_id", lig.ligId)
        .order("played_at", { ascending: false })
        .limit(3),
    ]);

  // Adres çubuğundan gelen değere güvenmiyoruz: bilinmeyen bir kimlik
  // gelirse sessizce "tüm zamanlar"a düşüyoruz. Hata sayfası göstermek,
  // eski bir bağlantıyı tıklayan için gereksiz sert olurdu.
  const sezonListesi = (sezonlar ?? []) as SezonOzeti[];
  const seciliSezon =
    sezonListesi.find((s) => s.id === istenenSezon) ?? null;

  // Sezon seçiliyse o sezonun kazanç sıralamasını da çek.
  const { data: sezonSatirlari } = seciliSezon
    ? await supabase
        .from("sezon_puanlari")
        .select("user_id, display_name, kazanc, mac, galibiyet")
        .eq("season_id", seciliSezon.id)
        // match_type ŞART: görünüm tekler ve çiftler için ayrı satır
        // döndürüyor. Süzmezsek ikisini de oynayan oyuncu tabloda iki kez
        // görünür.
        .eq("match_type", tur)
        .order("kazanc", { ascending: false })
    : { data: null };

  // Güncel Elo'yu sezon tablosunda ikincil sütun olarak göstereceğiz.
  const eloHaritasi = new Map(
    (tumZamanlar ?? []).map((s) => [s.user_id as string, s.rating]),
  );

  const satirlar: TabloSatiri[] = seciliSezon
    ? (sezonSatirlari ?? []).map((s) => ({
        user_id: s.user_id as string,
        display_name: s.display_name ?? "—",
        galibiyet: s.galibiyet ?? 0,
        maglubiyet: (s.mac ?? 0) - (s.galibiyet ?? 0),
        elo: eloHaritasi.get(s.user_id as string) ?? null,
        kazanc: s.kazanc,
      }))
    : (tumZamanlar ?? []).map((s) => ({
        user_id: s.user_id as string,
        display_name: s.display_name ?? "—",
        galibiyet: s.galibiyet ?? 0,
        maglubiyet: s.maglubiyet ?? 0,
        elo: s.rating,
        kazanc: null,
      }));

  const bosTablo = satirlar.length === 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-6">
      {/* ---------- Liderlik tablosu ---------- */}
      <section className="flex flex-col gap-5 lg:col-span-8">
        <header className="flex items-end justify-between border-b-4 border-kort pb-2">
          <h2 className="text-[32px] md:text-[44px]">Liderlik Tablosu</h2>
          <span className="mb-1.5 font-veri text-[12px] uppercase tracking-wider text-murekkep-silik">
            {ciftler ? "Çiftler" : "Tekler"}
          </span>
        </header>

        <div className="flex flex-col gap-2">
          <TurSecici tur={tur} sezonId={seciliSezon?.id ?? null} />
          <SezonSecici
            sezonlar={sezonListesi}
            seciliId={seciliSezon?.id ?? null}
            tur={tur}
          />
        </div>

        {seciliSezon && (
          <p className="text-xs leading-5 text-murekkep-silik">
            {gunGoster(seciliSezon.starts_on)} —{" "}
            {seciliSezon.ends_on ? gunGoster(seciliSezon.ends_on) : "sürüyor"}.
            Sıralama <strong>o sezonda kazanılan puana</strong> göre; en yüksek
            Elo&apos;ya sahip olan değil, en çok ilerleyen önde.
          </p>
        )}

        {bosTablo ? (
          <div className="border border-cizgi bg-yuzey-panel px-6 py-12 text-center">
            <p className="text-sm text-murekkep-sonuk">
              {seciliSezon
                ? ciftler
                  ? "Bu sezon aralığında çiftler maçı oynanmamış."
                  : "Bu sezon aralığında oynanmış maç yok."
                : ciftler
                  ? "Henüz çiftler maçı kaydedilmemiş. Maç ekle ekranından çiftler maçı girebilirsin."
                  : "Henüz maç kaydedilmemiş. İlk maç girildiğinde tablo burada oluşur."}
            </p>
            {!seciliSezon && (
              <Link
                href="/lig/mac-ekle"
                className="mt-6 inline-block border border-kort bg-kort px-6 py-3 font-govde text-[14px] font-bold uppercase tracking-wider text-tebesir transition-colors hover:bg-kazanan hover:text-kort"
              >
                Maç ekle
              </Link>
            )}
          </div>
        ) : (
          <div className="border border-cizgi bg-yuzey-panel">
            {/* Başlık satırı */}
            <div className="grid grid-cols-12 gap-2 border-b border-cizgi bg-yuzey-yukseltilmis px-3 py-2.5 font-baslik text-[15px] uppercase tracking-wider text-murekkep-silik">
              <div className="col-span-2 sm:col-span-1">#</div>
              <div className="col-span-6 sm:col-span-5">Oyuncu</div>
              <div className="col-span-2 text-right sm:col-span-3">G/M</div>
              <div className="col-span-2 text-right sm:col-span-3">
                {seciliSezon ? "Kazanç" : "Elo"}
              </div>
            </div>

            {satirlar.map((satir, sira) => {
              const benMiyim = satir.user_id === lig.kullaniciId;
              const sonSatir = sira === satirlar.length - 1;
              const kazandi = Number(satir.kazanc ?? 0) >= 0;

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

                  <div className="col-span-2 text-right sm:col-span-3">
                    {seciliSezon ? (
                      <>
                        <span
                          className={`veri text-[18px] sm:text-[22px] ${
                            kazandi ? "text-murekkep" : "text-toprak"
                          } ${benMiyim ? "font-bold" : ""}`}
                        >
                          {eloDegisimGoster(satir.kazanc)}
                        </span>
                        {/* Güncel Elo ikincil: sezon sıralamasını okurken
                            "bu kişi genelde nerede" sorusu hemen çıkıyor. */}
                        <span className="block font-veri text-[11px] text-murekkep-silik">
                          {eloGoster(satir.elo)}
                        </span>
                      </>
                    ) : (
                      <span
                        className={`veri text-[18px] sm:text-[22px] ${
                          benMiyim ? "font-bold" : ""
                        }`}
                      >
                        {eloGoster(satir.elo)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="max-w-xl text-xs leading-5 text-murekkep-silik">
          {seciliSezon
            ? "Elo sezon başında sıfırlanmaz, kesintisiz akar. Sezon yalnızca bir tarih aralığıdır."
            : ciftler
              ? "Çiftler puanı teklerden tamamen ayrı bir havuz. Takımın gücü iki oyuncunun ortalaması; kazanılan puan ikisine de aynı miktarda yazılır."
              : "Herkes 1000 puanla başlar. Güçlü rakibi yenmek çok, zayıf rakibi yenmek az kazandırır."}
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
