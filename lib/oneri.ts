/**
 * Öneri satırlarını "benim açımdan" okunabilir hale getirir.
 *
 * Veritabanı maçı simetrik tutuyor: oyuncu1 ve oyuncu2. Ekranda ise
 * "ben ve rakip" diye görmek istiyoruz. Bu dönüşümü tek yerde yapıyoruz ki
 * her sayfada team_no hesabı tekrarlanmasın.
 */

export type OneriSatiri = {
  match_id: string;
  played_at: string;
  status: string;
  oyuncu1_id: string;
  oyuncu1_ad: string | null;
  oyuncu1_kabul: string | null;
  oyuncu2_id: string;
  oyuncu2_ad: string | null;
  oyuncu2_kabul: string | null;
};

export type Oneri = {
  macId: string;
  dilim: string;
  durum: string;
  rakipAd: string;
  rakipId: string;
  benKabulEttim: boolean;
  rakipKabulEtti: boolean;
};

export function benimAcimdan(satir: OneriSatiri, benimId: string): Oneri {
  const birinciBenim = satir.oyuncu1_id === benimId;

  return {
    macId: satir.match_id,
    dilim: satir.played_at,
    durum: satir.status,
    rakipId: birinciBenim ? satir.oyuncu2_id : satir.oyuncu1_id,
    rakipAd: (birinciBenim ? satir.oyuncu2_ad : satir.oyuncu1_ad) ?? "—",
    benKabulEttim: Boolean(birinciBenim ? satir.oyuncu1_kabul : satir.oyuncu2_kabul),
    rakipKabulEtti: Boolean(birinciBenim ? satir.oyuncu2_kabul : satir.oyuncu1_kabul),
  };
}

/**
 * Önerileri saat dilimine göre gruplar.
 *
 * Neden: bir saat için beş ayrı kart göstermek istemiyoruz. Aynı saatteki
 * öneriler tek kart altında toplanır — "Cmt 10:00, müsait olanlar: ...".
 * Faz 3'te e-posta da bu gruplamayı kullanacak: dilim başına tek mail.
 */
export function dilimeGoreGrupla(oneriler: Oneri[]): [string, Oneri[]][] {
  const gruplar = new Map<string, Oneri[]>();

  for (const oneri of oneriler) {
    const anahtar = new Date(oneri.dilim).toISOString();
    const mevcut = gruplar.get(anahtar);
    if (mevcut) {
      mevcut.push(oneri);
    } else {
      gruplar.set(anahtar, [oneri]);
    }
  }

  return [...gruplar.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}
