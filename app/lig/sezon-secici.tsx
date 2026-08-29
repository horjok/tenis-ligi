import Link from "next/link";

export type SezonOzeti = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string | null;
};

export type MacTuru = "singles" | "doubles";

/**
 * Adres çubuğundaki iki seçim (tür + sezon) tek yerden kuruluyor.
 *
 * Seçimler bağlantı olarak yazılıyor, açılır liste olarak değil: seçim
 * adrese girince paylaşılabiliyor, geri tuşu çalışıyor ve sayfa sunucuda
 * render edilmeye devam ediyor.
 *
 * Bu yardımcı, bir seçim değişirken DİĞERİNİ KORUYOR. Olmasaydı çiftler
 * sekmesine geçmek sezon seçimini sessizce sıfırlardı.
 */
function adres(tur: MacTuru, sezonId: string | null): string {
  const p = new URLSearchParams();
  if (tur !== "singles") p.set("tur", tur);
  if (sezonId) p.set("sezon", sezonId);
  const q = p.toString();
  return q ? `/lig?${q}` : "/lig";
}

const serit = "flex flex-wrap items-center gap-px border border-cizgi bg-cizgi";

function Secenek({
  href,
  aktif,
  children,
}: {
  href: string;
  aktif: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={aktif ? "page" : undefined}
      className={[
        "px-4 py-2 font-baslik text-[15px] uppercase tracking-wide transition-colors",
        aktif
          ? "bg-kort text-tebesir"
          : "bg-yuzey-panel text-murekkep-sonuk hover:bg-yuzey-yukseltilmis hover:text-murekkep",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export function TurSecici({
  tur,
  sezonId,
}: {
  tur: MacTuru;
  sezonId: string | null;
}) {
  return (
    <nav aria-label="Maç türü" className={serit}>
      <Secenek href={adres("singles", sezonId)} aktif={tur === "singles"}>
        Tekler
      </Secenek>
      <Secenek href={adres("doubles", sezonId)} aktif={tur === "doubles"}>
        Çiftler
      </Secenek>
    </nav>
  );
}

export function SezonSecici({
  sezonlar,
  seciliId,
  tur,
}: {
  sezonlar: SezonOzeti[];
  seciliId: string | null;
  tur: MacTuru;
}) {
  if (sezonlar.length === 0) return null;

  return (
    <nav aria-label="Sezon seçimi" className={serit}>
      <Secenek href={adres(tur, null)} aktif={seciliId === null}>
        Tüm zamanlar
      </Secenek>
      {sezonlar.map((s) => (
        <Secenek
          key={s.id}
          href={adres(tur, s.id)}
          aktif={s.id === seciliId}
        >
          {s.name}
        </Secenek>
      ))}
    </nav>
  );
}
