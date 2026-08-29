import { tarihGoster } from "@/lib/lig";

export type Set = { set_no: number; t1: number; t2: number };

export type MacSatiri = {
  match_id: string;
  played_at: string;
  location: string | null;
  winner_team: number | null;
  oyuncu1_id: string | null;
  oyuncu1_ad: string | null;
  oyuncu2_id: string | null;
  oyuncu2_ad: string | null;
  oyuncu1_elo_degisim: number | string | null;
  oyuncu2_elo_degisim: number | string | null;
  kaydeden_ad: string | null;
  setler: unknown;
};

export function setleriOku(ham: unknown): Set[] {
  if (!Array.isArray(ham)) return [];
  return ham.filter(
    (s): s is Set =>
      typeof s === "object" &&
      s !== null &&
      typeof (s as Set).t1 === "number" &&
      typeof (s as Set).t2 === "number",
  );
}

/** Skor hücresi — 40px sabit genişlik, sayılar mono ve hizalı. */
function SkorHucresi({
  deger,
  kazanan,
}: {
  deger: number | null;
  kazanan: boolean;
}) {
  return (
    <div
      className={[
        "flex h-full w-10 items-center justify-center border-l border-cizgi",
        "veri text-[18px]",
        deger === null
          ? "bg-yuzey-yukseltilmis text-murekkep-silik"
          : kazanan
            ? "text-murekkep"
            : "text-murekkep-sonuk",
      ].join(" ")}
    >
      {deger === null ? "–" : deger}
    </div>
  );
}

/**
 * Maç kartı: kazanan üstte, sarı şerit onda.
 *
 * Bir maça bakan kişinin ilk sorusu "kim kazandı". Kartı ona göre kuruyoruz:
 * sıralama sonucu anlatıyor, renk değil. Sarı şerit sadece pekiştiriyor.
 */
export function MacKarti({ mac }: { mac: MacSatiri }) {
  const setler = setleriOku(mac.setler);
  const birinciKazandi = mac.winner_team === 1;

  const kazananAd = birinciKazandi ? mac.oyuncu1_ad : mac.oyuncu2_ad;
  const kaybedenAd = birinciKazandi ? mac.oyuncu2_ad : mac.oyuncu1_ad;
  const kazananDegisim = birinciKazandi
    ? mac.oyuncu1_elo_degisim
    : mac.oyuncu2_elo_degisim;

  // Set skorlarını da kazanan üstte olacak şekilde çeviriyoruz.
  const kazananSetler = setler.map((s) => (birinciKazandi ? s.t1 : s.t2));
  const kaybedenSetler = setler.map((s) => (birinciKazandi ? s.t2 : s.t1));

  const degisim =
    kazananDegisim === null ? null : Math.round(Number(kazananDegisim));

  return (
    <article className="border border-cizgi bg-yuzey-panel">
      {/* Kazanan */}
      <div className="flex h-12 items-stretch border-b border-cizgi">
        <div className="w-2 shrink-0 bg-kazanan" />
        <div className="flex flex-1 items-center truncate bg-yuzey-yukseltilmis px-3 font-baslik text-[22px] uppercase">
          {kazananAd}
        </div>
        <div className="flex shrink-0">
          {kazananSetler.map((oyun, i) => (
            <SkorHucresi key={i} deger={oyun} kazanan />
          ))}
        </div>
      </div>

      {/* Kaybeden */}
      <div className="flex h-12 items-stretch">
        <div className="w-2 shrink-0" />
        <div className="flex flex-1 items-center truncate px-3 font-baslik text-[22px] uppercase text-murekkep-sonuk">
          {kaybedenAd}
        </div>
        <div className="flex shrink-0">
          {kaybedenSetler.map((oyun, i) => (
            <SkorHucresi key={i} deger={oyun} kazanan={false} />
          ))}
        </div>
      </div>

      {/* Alt bilgi */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 border-t border-cizgi bg-yuzey-yukseltilmis px-3 py-1.5 font-veri text-[12px] uppercase text-murekkep-silik">
        <span>
          {tarihGoster(mac.played_at)}
          {mac.location ? ` · ${mac.location}` : ""}
        </span>
        {degisim !== null && (
          <span className="text-murekkep">
            {degisim > 0 ? `+${degisim}` : degisim} ELO
          </span>
        )}
      </div>
    </article>
  );
}
