import { tarihGoster } from "@/lib/lig";

export type Set = { set_no: number; t1: number; t2: number };
export type Oyuncu = { id: string; ad: string };

/**
 * `mac_gecmisi` görünümünün bir satırı.
 *
 * Takım bazlı: teklerde her takımda bir, çiftlerde iki oyuncu var.
 * Eskiden oyuncu1/oyuncu2 diye iki sütun vardı; çiftlerde o yapı tek maçı
 * dört satıra bölüyordu (2x2 join). Bkz. çiftler migration'ı.
 */
export type MacSatiri = {
  match_id: string;
  match_type: string;
  played_at: string;
  location: string | null;
  winner_team: number | null;
  takim1_oyuncular: unknown;
  takim2_oyuncular: unknown;
  /** Takımın Elo değişimi — üyelerin hepsi aynı miktarı alır. */
  takim1_elo_degisim: number | string | null;
  takim2_elo_degisim: number | string | null;
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

export function oyunculariOku(ham: unknown): Oyuncu[] {
  if (!Array.isArray(ham)) return [];
  return ham.filter(
    (o): o is Oyuncu =>
      typeof o === "object" &&
      o !== null &&
      typeof (o as Oyuncu).ad === "string",
  );
}

/** "Ali K." ya da çiftlerde "Ali K. & Veli T." */
export function takimAdi(oyuncular: Oyuncu[]): string {
  return oyuncular.map((o) => o.ad).join(" & ") || "—";
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
 *
 * Çiftlerde iki isim yan yana geliyor; yazı boyutu bir tık küçülüyor ki
 * "Ali K. & Veli T." tek satıra sığsın.
 */
export function MacKarti({ mac }: { mac: MacSatiri }) {
  const setler = setleriOku(mac.setler);
  const birinciKazandi = mac.winner_team === 1;
  const ciftler = mac.match_type === "doubles";

  const takim1 = oyunculariOku(mac.takim1_oyuncular);
  const takim2 = oyunculariOku(mac.takim2_oyuncular);

  const kazananAd = takimAdi(birinciKazandi ? takim1 : takim2);
  const kaybedenAd = takimAdi(birinciKazandi ? takim2 : takim1);
  const kazananDegisim = birinciKazandi
    ? mac.takim1_elo_degisim
    : mac.takim2_elo_degisim;

  // Set skorlarını da kazanan üstte olacak şekilde çeviriyoruz.
  const kazananSetler = setler.map((s) => (birinciKazandi ? s.t1 : s.t2));
  const kaybedenSetler = setler.map((s) => (birinciKazandi ? s.t2 : s.t1));

  const degisim =
    kazananDegisim === null ? null : Math.round(Number(kazananDegisim));

  const adSinifi = ciftler
    ? "font-baslik text-[17px] uppercase md:text-[19px]"
    : "font-baslik text-[22px] uppercase";

  return (
    <article className="border border-cizgi bg-yuzey-panel">
      {/* Kazanan */}
      <div className="flex h-12 items-stretch border-b border-cizgi">
        <div className="w-2 shrink-0 bg-kazanan" />
        <div
          className={`flex flex-1 items-center truncate bg-yuzey-yukseltilmis px-3 ${adSinifi}`}
        >
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
        <div
          className={`flex flex-1 items-center truncate px-3 text-murekkep-sonuk ${adSinifi}`}
        >
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
        <span className="flex items-center gap-2">
          {ciftler && (
            <span className="bg-kort px-1.5 py-0.5 text-[10px] tracking-wide text-tebesir">
              Çiftler
            </span>
          )}
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
