/**
 * Haftalık özet metni.
 *
 * Veri çekme burada yok — girdi verilir, metin döner. Böylece metnin
 * doğruluğunu veritabanına dokunmadan kontrol edebiliyoruz.
 *
 * Metin WhatsApp'a yapıştırılacak. İki kural:
 *   1. Emoji yok.
 *   2. Markdown yok — ve bu sadece "yazmıyoruz" demek değil, aşağıdaki
 *      `duz()` ile veriden GELEN işaretleri de temizliyoruz.
 */

export type OzetMaci = {
  kazanan: string;
  kaybeden: string;
  /** "6-4 6-2" — kazananın gözünden. Set girilmemişse boş. */
  skor: string;
};

export type OzetGirdisi = {
  baslangic: string; // gösterilecek hâliyle, örn. "22 Ağustos 2026"
  bitis: string;
  maclar: OzetMaci[];
  haftaninOyuncusu: { ad: string; kazanc: number; mac: number } | null;
  ilkUc: { ad: string; elo: number }[];
  bekleyenOneri: number;
  siteAdresi: string;
};

/**
 * WhatsApp'ın biçimlendirme karakterlerini söker.
 *
 * WhatsApp *kalın*, _italik_, ~üstü çizili~ ve `tek aralıklı` yazıyor.
 * Bir oyuncunun görünen adında bu karakterlerden ikisi geçerse mesajın
 * ortası italik çıkar. Adı biz belirlemiyoruz, kullanıcı yazıyor —
 * o yüzden çıktıda temizliyoruz.
 */
function duz(metin: string): string {
  return metin.replace(/[*_~`]/g, "").trim();
}

function imzali(sayi: number): string {
  const n = Math.round(sayi);
  return n > 0 ? `+${n}` : String(n);
}

export function ozetMetni(g: OzetGirdisi): string {
  const satirlar: string[] = [];

  satirlar.push("TENİS LİGİ — HAFTALIK ÖZET");
  satirlar.push(`${g.baslangic} - ${g.bitis}`);
  satirlar.push("");

  if (g.maclar.length === 0) {
    satirlar.push("Bu hafta hiç maç oynanmadı.");
  } else {
    satirlar.push(`OYNANAN MAÇLAR (${g.maclar.length})`);
    for (const m of g.maclar) {
      const skor = m.skor ? ` ${m.skor} ` : " - ";
      satirlar.push(`${duz(m.kazanan)}${skor}${duz(m.kaybeden)}`);
    }
  }
  satirlar.push("");

  if (g.haftaninOyuncusu) {
    const h = g.haftaninOyuncusu;
    satirlar.push("HAFTANIN OYUNCUSU");
    satirlar.push(
      `${duz(h.ad)} — ${imzali(h.kazanc)} puan, ${h.mac} maç`,
    );
    satirlar.push("");
  }

  if (g.ilkUc.length > 0) {
    satirlar.push("GENEL SIRALAMA");
    g.ilkUc.forEach((o, i) => {
      satirlar.push(`${i + 1}. ${duz(o.ad)} — ${Math.round(o.elo)}`);
    });
    satirlar.push("");
  }

  satirlar.push(
    g.bekleyenOneri === 0
      ? "Cevap bekleyen öneri yok."
      : `Cevap bekleyen öneri: ${g.bekleyenOneri}`,
  );
  satirlar.push("");
  satirlar.push(g.siteAdresi);

  return satirlar.join("\n");
}

/** Set dizisinden kazananın gözünden skor: "6-4 6-2". */
export function skorYaz(
  setler: { set_no: number; t1: number; t2: number }[],
  kazananTakim: number | null,
): string {
  if (setler.length === 0 || kazananTakim === null) return "";
  return [...setler]
    .sort((a, b) => a.set_no - b.set_no)
    .map((s) => (kazananTakim === 1 ? `${s.t1}-${s.t2}` : `${s.t2}-${s.t1}`))
    .join(" ");
}
