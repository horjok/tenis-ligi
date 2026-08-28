"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cikisYap } from "@/app/actions/auth";

/* Satır içi ikonlar. Mockup'lar Material Symbols ikon fontu yüklüyordu;
   burada SVG kullanıyoruz — ağdan ekstra font inmiyor ve ikonlar yazı gibi
   önce metin olarak görünüp sonra ikona dönüşmüyor. */
function Ikon({ ad }: { ad: string }) {
  const ortak = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (ad) {
    case "liderlik":
      return (
        <svg {...ortak}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case "takvim":
      return (
        <svg {...ortak}>
          <rect x="3" y="5" width="18" height="16" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "oneri":
      return (
        <svg {...ortak}>
          <path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z" />
        </svg>
      );
    case "yaklasan":
      return (
        <svg {...ortak}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "maclar":
      return (
        <svg {...ortak}>
          <circle cx="12" cy="12" r="9" />
          <path d="M5 5c4 4 4 10 0 14M19 5c-4 4-4 10 0 14" />
        </svg>
      );
    case "profil":
      return (
        <svg {...ortak}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
        </svg>
      );
    case "yonetim":
      return (
        <svg {...ortak}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
        </svg>
      );
    default:
      return null;
  }
}

type Bag = { yol: string; etiket: string; ikon: string; mobil: boolean };

const BAGLANTILAR: Bag[] = [
  { yol: "/lig", etiket: "Liderlik", ikon: "liderlik", mobil: true },
  { yol: "/lig/takvim", etiket: "Takvim", ikon: "takvim", mobil: true },
  { yol: "/lig/onerilerim", etiket: "Öneriler", ikon: "oneri", mobil: true },
  { yol: "/lig/yaklasan", etiket: "Yaklaşan", ikon: "yaklasan", mobil: true },
  { yol: "/lig/maclar", etiket: "Maçlar", ikon: "maclar", mobil: true },
  { yol: "/lig/profil", etiket: "Profil", ikon: "profil", mobil: false },
  { yol: "/lig/yonetim", etiket: "Yönetim", ikon: "yonetim", mobil: false },
];

function aktifMi(pathname: string, yol: string): boolean {
  // "/lig" her sayfada öneki olduğu için tam eşleşme istiyoruz.
  return yol === "/lig" ? pathname === "/lig" : pathname.startsWith(yol);
}

export function LigMenu({
  admin,
  gorunenAd,
}: {
  admin: boolean;
  gorunenAd: string;
}) {
  const pathname = usePathname();
  const baglantilar = BAGLANTILAR.filter((b) => b.yol !== "/lig/yonetim" || admin);
  const mobilBaglantilar = baglantilar.filter((b) => b.mobil);

  return (
    <>
      {/* ---------- Mobil üst çubuk ---------- */}
      <header className="fixed top-0 z-50 flex w-full items-center gap-3 border-b border-cizgi bg-yuzey-panel px-4 py-4 md:hidden">
        <h1 className="flex-1 font-baslik text-[24px] tracking-wide">
          Tenis Ligi
        </h1>
        <Link
          href="/lig/profil"
          aria-label="Profil"
          className="p-2 text-murekkep-sonuk"
        >
          <Ikon ad="profil" />
        </Link>
        {admin && (
          <Link
            href="/lig/yonetim"
            aria-label="Yönetim"
            className="p-2 text-murekkep-sonuk"
          >
            <Ikon ad="yonetim" />
          </Link>
        )}
        <form action={cikisYap}>
          <button
            type="submit"
            className="font-govde text-[13px] font-bold uppercase tracking-wider text-murekkep-sonuk"
          >
            Çıkış
          </button>
        </form>
      </header>

      {/* ---------- Masaüstü kenar çubuğu ---------- */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[280px] shrink-0 flex-col border-r border-cizgi bg-yuzey-panel py-10 md:flex">
        <div className="mb-12 px-6">
          <h1 className="font-baslik text-[32px] leading-none">Tenis Ligi</h1>
          <p className="mt-2 font-veri text-[12px] uppercase tracking-wider text-murekkep-silik">
            {gorunenAd}
          </p>
        </div>

        <nav className="flex w-full flex-1 flex-col">
          {baglantilar.map((bag) => {
            const aktif = aktifMi(pathname, bag.yol);
            return (
              <Link
                key={bag.yol}
                href={bag.yol}
                aria-current={aktif ? "page" : undefined}
                className={[
                  "flex w-full items-center gap-4 border-l-4 px-6 py-4",
                  "font-baslik text-[20px] uppercase tracking-wide transition-colors",
                  aktif
                    ? "border-kazanan bg-kort text-tebesir"
                    : "border-transparent text-murekkep-sonuk hover:bg-yuzey-yukseltilmis",
                ].join(" ")}
              >
                <Ikon ad={bag.ikon} />
                {bag.etiket}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3 px-6 pt-8">
          <Link
            href="/lig/mac-ekle"
            className="w-full border border-kort bg-kort py-3 text-center font-govde text-[14px] font-bold uppercase tracking-wider text-tebesir transition-colors hover:bg-kazanan hover:text-kort"
          >
            Maç Ekle
          </Link>
          <form action={cikisYap}>
            <button
              type="submit"
              className="w-full border border-cizgi py-2 font-govde text-[13px] font-bold uppercase tracking-wider text-murekkep-sonuk transition-colors hover:border-toprak hover:text-toprak"
            >
              Çıkış Yap
            </button>
          </form>
        </div>
      </aside>

      {/* ---------- Mobil alt çubuk ---------- */}
      <nav className="fixed bottom-0 z-50 flex w-full items-stretch justify-around border-t border-cizgi bg-yuzey-panel md:hidden">
        {mobilBaglantilar.map((bag) => {
          const aktif = aktifMi(pathname, bag.yol);
          return (
            <Link
              key={bag.yol}
              href={bag.yol}
              aria-current={aktif ? "page" : undefined}
              className={[
                "flex flex-1 flex-col items-center gap-1 border-t-2 py-2.5",
                aktif
                  ? "border-kazanan text-murekkep"
                  : "border-transparent text-murekkep-silik",
              ].join(" ")}
            >
              <Ikon ad={bag.ikon} />
              <span className="font-baslik text-[10px] uppercase tracking-wider">
                {bag.etiket}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
