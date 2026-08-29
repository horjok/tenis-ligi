import {
  oyunculariOku,
  setleriOku,
  takimAdi,
  type MacSatiri,
} from "../mac-karti";

/**
 * Maç geçmişi satırı — anasayfadaki karttan BİLEREK farklı.
 *
 * Mockup'lar iki bağlam için iki ayrı yoğunluk veriyor:
 *   - Anasayfa "Son Maçlar": üç maç, geniş nefes alan kart (40px skor hücresi,
 *     ayrı alt bilgi şeridi).
 *   - Maç geçmişi: uzun liste, sıkı satır (32px hücre, Elo skorun yanında
 *     kendi hücresinde, kazanan satırın TAMAMI sarı).
 *
 * Uzun listede her karta ayrı bir alt şerit koymak sayfayı okunmaz yapardı;
 * Elo'yu skorun yanına almak satırı tek bakışta okunur bırakıyor.
 */

/** Skor hücresi — 32px, mono, hizalı. */
function Hucre({ deger, sonuk }: { deger: number | null; sonuk: boolean }) {
  return (
    <div
      className={`flex w-8 items-center justify-center border-r border-cizgi veri text-[16px] ${
        sonuk ? "opacity-70" : ""
      }`}
    >
      {deger ?? ""}
    </div>
  );
}

function Satir({
  ad,
  setler,
  degisim,
  kazanan,
}: {
  ad: string;
  setler: (number | null)[];
  degisim: number | null;
  kazanan: boolean;
}) {
  return (
    <div
      className={`grid h-[42px] grid-cols-[1fr_auto] ${
        kazanan
          ? "bg-kazanan text-kort"
          : "bg-yuzey-panel text-murekkep-sonuk"
      }`}
    >
      <div className="flex items-center truncate px-2 font-baslik text-[20px] uppercase">
        {ad}
      </div>

      <div className="flex h-full border-l border-cizgi">
        {setler.map((oyun, i) => (
          <Hucre key={i} deger={oyun} sonuk={!kazanan} />
        ))}
        {/* Elo hücresi: kazanan sarı zeminde kalır, kaybeden toprakta.
            Renk sonucu tekrar söylüyor ama tek başına anlatmıyor —
            satır sırası ve işaret zaten anlatıyor. */}
        <div
          className={`flex w-12 items-center justify-center border-l border-cizgi font-veri text-[14px] ${
            kazanan ? "text-kort" : "bg-toprak text-tebesir"
          }`}
        >
          {degisim === null ? "—" : degisim > 0 ? `+${degisim}` : degisim}
        </div>
      </div>
    </div>
  );
}

export function MacGecmisiSatiri({ mac }: { mac: MacSatiri }) {
  const setler = setleriOku(mac.setler);
  const birinciKazandi = mac.winner_team === 1;
  const ciftler = mac.match_type === "doubles";

  const t1 = oyunculariOku(mac.takim1_oyuncular);
  const t2 = oyunculariOku(mac.takim2_oyuncular);

  const yuvarla = (d: number | string | null) =>
    d === null ? null : Math.round(Number(d));

  const kazananAd = takimAdi(birinciKazandi ? t1 : t2);
  const kaybedenAd = takimAdi(birinciKazandi ? t2 : t1);
  const kazananDegisim = yuvarla(
    birinciKazandi ? mac.takim1_elo_degisim : mac.takim2_elo_degisim,
  );
  const kaybedenDegisim = yuvarla(
    birinciKazandi ? mac.takim2_elo_degisim : mac.takim1_elo_degisim,
  );

  const kazananSetler = setler.map((s) => (birinciKazandi ? s.t1 : s.t2));
  const kaybedenSetler = setler.map((s) => (birinciKazandi ? s.t2 : s.t1));

  // Künye: nerede oynandı, kim girdi. Sistem önerisinden doğan maçlarda
  // created_by boş kalıyor — o zaman "sistem önerisinden" yazıyoruz.
  const kunye = [
    mac.location,
    mac.kaydeden_ad ? `${mac.kaydeden_ad} tarafından girildi` : "sistem önerisinden",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col border border-cizgi">
        <Satir
          ad={kazananAd}
          setler={kazananSetler}
          degisim={kazananDegisim}
          kazanan
        />
        <Satir
          ad={kaybedenAd}
          setler={kaybedenSetler}
          degisim={kaybedenDegisim}
          kazanan={false}
        />
      </div>

      <div className="flex items-center justify-between gap-2 font-veri text-[11px] uppercase text-murekkep-silik">
        {ciftler ? (
          <span className="bg-kort px-1.5 py-0.5 text-[10px] tracking-wide text-tebesir">
            Çiftler
          </span>
        ) : (
          <span />
        )}
        <span className="truncate text-right">{kunye}</span>
      </div>
    </div>
  );
}
