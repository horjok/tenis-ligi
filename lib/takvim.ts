/**
 * Takvim ızgarası için saat/dilim yardımcıları.
 *
 * Saat dilimi: lig Türkiye'de. Türkiye 2016'dan beri kalıcı UTC+3 kullanıyor,
 * yaz saati uygulaması yok. Offset sabit olduğu için tarihleri elle
 * kurabiliyoruz — Intl'in tam saat dilimi makinesine gerek yok.
 *
 * Eğer bir gün yaz saati geri gelirse burası kırılır: o zaman offset'i
 * sabit kabul etmeyi bırakıp Intl.DateTimeFormat ile hesaplamak gerekir.
 */

export const LIG_OFFSET = "+03:00";

/** 08:00'de başlayan ilk dilim; 21:00'de başlayan son dilim 22:00'de biter. */
export const ILK_SAAT = 8;
export const SON_SAAT = 21;
export const GUN_SAYISI = 14;

export const SAATLER: number[] = Array.from(
  { length: SON_SAAT - ILK_SAAT + 1 },
  (_, i) => ILK_SAAT + i,
);

/** Sunucu UTC'de çalışıyor; İstanbul'daki bugünün tarihi. */
function istanbulBugun(): string {
  return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Bugünden başlayarak 14 günlük "YYYY-MM-DD" listesi. */
export function gunListesi(): string[] {
  const [yil, ay, gun] = istanbulBugun().split("-").map(Number);
  return Array.from({ length: GUN_SAYISI }, (_, i) =>
    // Date.UTC gün taşmasını kendisi çözüyor (31 Ağustos + 1 = 1 Eylül).
    new Date(Date.UTC(yil, ay - 1, gun + i)).toISOString().slice(0, 10),
  );
}

/**
 * Bir gün + saat için kanonik anahtar.
 *
 * Neden kanonik biçim: veritabanı timestamptz'yi "2026-08-27T06:00:00+00:00"
 * diye döndürüyor, biz "+03:00" ile kuruyoruz. Aynı anı gösteriyorlar ama
 * metin olarak farklılar. İkisini de toISOString()'den geçirip
 * karşılaştırıyoruz.
 */
export function slotAnahtari(gun: string, saat: number): string {
  const ss = String(saat).padStart(2, "0");
  return new Date(`${gun}T${ss}:00:00${LIG_OFFSET}`).toISOString();
}

/** Veritabanından gelen timestamptz'yi aynı kanonik biçime çevirir. */
export function anahtarla(zamanDamgasi: string): string {
  return new Date(zamanDamgasi).toISOString();
}

export function gunEtiketi(gun: string): { gunAdi: string; tarih: string } {
  const t = new Date(`${gun}T12:00:00${LIG_OFFSET}`);
  return {
    gunAdi: t.toLocaleDateString("tr-TR", {
      weekday: "short",
      timeZone: "Europe/Istanbul",
    }),
    tarih: t.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "Europe/Istanbul",
    }),
  };
}

/** "Perşembe, 03 Eylül 19:00" — öneri ve yaklaşan maç ekranları için. */
export function dilimEtiketi(zamanDamgasi: string): string {
  return new Date(zamanDamgasi).toLocaleString("tr-TR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });
}
