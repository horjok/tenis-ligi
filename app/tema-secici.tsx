"use client";

import { useSyncExternalStore } from "react";

import { TEMA_OLAYI, temayiOku, temayiUygula, type Tema } from "@/lib/tema";

const SECENEKLER: { deger: Tema; etiket: string; kisa: string }[] = [
  { deger: "sistem", etiket: "Sistem", kisa: "Oto" },
  { deger: "light", etiket: "Açık", kisa: "Açık" },
  { deger: "dark", etiket: "Koyu", kisa: "Koyu" },
];

/**
 * Tema seçimini okuyup yazan ortak mantık.
 *
 * useState + useEffect DEĞİL, useSyncExternalStore. Sebebi: tema React'in
 * dışında yaşıyor — localStorage'da ve kök öğenin özniteliğinde. Bunu
 * useState'e kopyalayıp effect'te senkronlamak, React'in "dış kaynağa abone
 * ol" için ayrı bir API sunmasının tam olarak kaçınmak istediği desen.
 *
 * Sunucu anlık görüntüsü hep "sistem": sunucu localStorage'ı göremiyor ve
 * ilk istemci render'ının sunucuyla aynı olması gerekiyor.
 *
 * SAYFANIN RENKLERİ bundan etkilenmiyor — onları head'deki senkron betik
 * ilk boyamadan önce ayarlıyor. Burada bir an gecikmeyle yerine oturan tek
 * şey, seçicide hangi düğmenin işaretli göründüğü.
 */
function abone(geriCagir: () => void): () => void {
  // Aynı anda iki seçici ekranda olabilir (masaüstü kenar çubuğu / mobil üst
  // çubuk). Olay ikisini de senkron tutuyor.
  window.addEventListener(TEMA_OLAYI, geriCagir);
  return () => window.removeEventListener(TEMA_OLAYI, geriCagir);
}

function useTema(): [Tema, (t: Tema) => void] {
  const tema = useSyncExternalStore<Tema>(
    abone,
    temayiOku,
    () => "sistem",
  );
  return [tema, temayiUygula];
}

/** Kenar çubuğu için: üç segmentli şerit. */
export function TemaSecici() {
  const [tema, secildi] = useTema();

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-veri text-[10px] uppercase tracking-wide text-murekkep-silik">
        Tema
      </span>
      <div
        role="group"
        aria-label="Tema seçimi"
        className="flex items-center gap-px border border-cizgi bg-cizgi"
      >
        {SECENEKLER.map((s) => {
          const aktif = tema === s.deger;
          return (
            <button
              key={s.deger}
              type="button"
              onClick={() => secildi(s.deger)}
              aria-pressed={aktif}
              className={[
                "flex-1 px-2 py-1.5 font-baslik text-[13px] uppercase tracking-wide transition-colors",
                aktif
                  ? "bg-kort text-tebesir"
                  : "bg-yuzey-panel text-murekkep-sonuk hover:bg-yuzey-yukseltilmis hover:text-murekkep",
              ].join(" ")}
            >
              {s.kisa}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Ikon({ tema }: { tema: Tema }) {
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

  if (tema === "dark") {
    return (
      <svg {...ortak}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
    );
  }
  if (tema === "light") {
    return (
      <svg {...ortak}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
      </svg>
    );
  }
  // Sistem: yarısı dolu daire
  return (
    <svg {...ortak}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Mobil üst çubuk için: tek düğme, sırayla döner.
 *
 * Üç segment mobil başlıkta sığmıyor. Döngü sırası sistem → açık → koyu;
 * hangi durumda olduğunu ikon ve aria-label söylüyor.
 */
export function TemaDugmesi() {
  const [tema, secildi] = useTema();

  const sonraki: Record<Tema, Tema> = {
    sistem: "light",
    light: "dark",
    dark: "sistem",
  };
  const ad: Record<Tema, string> = {
    sistem: "sistem teması",
    light: "açık tema",
    dark: "koyu tema",
  };

  return (
    <button
      type="button"
      onClick={() => secildi(sonraki[tema])}
      aria-label={`Tema: ${ad[tema]}. Değiştirmek için dokun.`}
      title={`Tema: ${ad[tema]}`}
      className="p-2 text-murekkep-sonuk transition-colors hover:text-murekkep"
    >
      <Ikon tema={tema} />
    </button>
  );
}
