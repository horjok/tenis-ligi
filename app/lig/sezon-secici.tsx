import Link from "next/link";

export type SezonOzeti = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string | null;
};

/**
 * Sezon seçici.
 *
 * Açılır liste değil, bağlantı şeridi — ve bilerek. Bağlantı olunca seçim
 * adres çubuğuna yazılıyor: paylaşılabiliyor, geri tuşu çalışıyor, sayfa
 * sunucuda render edilmeye devam ediyor. Açılır liste için istemci bileşeni
 * ve JavaScript gerekirdi; kazandıracağı bir şey yok.
 */
export function SezonSecici({
  sezonlar,
  seciliId,
}: {
  sezonlar: SezonOzeti[];
  seciliId: string | null;
}) {
  if (sezonlar.length === 0) return null;

  const secenekler: { id: string | null; etiket: string }[] = [
    { id: null, etiket: "Tüm zamanlar" },
    ...sezonlar.map((s) => ({ id: s.id, etiket: s.name })),
  ];

  return (
    <nav
      aria-label="Sezon seçimi"
      className="flex flex-wrap items-center gap-px border border-cizgi bg-cizgi"
    >
      {secenekler.map((s) => {
        const aktif = s.id === seciliId;
        return (
          <Link
            key={s.id ?? "tum"}
            href={s.id ? `/lig?sezon=${s.id}` : "/lig"}
            aria-current={aktif ? "page" : undefined}
            className={[
              "px-4 py-2 font-baslik text-[15px] uppercase tracking-wide transition-colors",
              aktif
                ? "bg-kort text-tebesir"
                : "bg-yuzey-panel text-murekkep-sonuk hover:bg-yuzey-yukseltilmis hover:text-murekkep",
            ].join(" ")}
          >
            {s.etiket}
          </Link>
        );
      })}
    </nav>
  );
}
