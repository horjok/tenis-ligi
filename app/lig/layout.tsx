import Link from "next/link";

import { cikisYap } from "@/app/actions/auth";
import { ligBilgisi } from "@/lib/lig";

const bagSinifi =
  "rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 " +
  "dark:text-zinc-400 dark:hover:bg-zinc-800";

export default async function LigLayout({ children }: LayoutProps<"/lig">) {
  const lig = await ligBilgisi();

  // Hesabı var ama hiçbir ligin aktif üyesi değil (örn. çıkarılmış).
  if (!lig) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold">Lig üyeliğin yok</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Hesabın var ama bir ligin aktif üyesi değilsin. Ligi yöneten kişiyle
            konuş.
          </p>
          <form action={cikisYap} className="mt-6">
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            >
              Çıkış yap
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-1 px-6 py-3">
          <Link href="/lig" className="mr-3 text-sm font-semibold">
            Tenis Ligi
          </Link>
          <Link href="/lig" className={bagSinifi}>
            Puan tablosu
          </Link>
          <Link href="/lig/takvim" className={bagSinifi}>
            Takvim
          </Link>
          <Link href="/lig/onerilerim" className={bagSinifi}>
            Önerilerim
          </Link>
          <Link href="/lig/yaklasan" className={bagSinifi}>
            Yaklaşan
          </Link>
          <Link href="/lig/mac-ekle" className={bagSinifi}>
            Maç ekle
          </Link>
          <Link href="/lig/maclar" className={bagSinifi}>
            Maçlar
          </Link>
          {lig.admin && (
            <Link href="/lig/yonetim" className={bagSinifi}>
              Yönetim
            </Link>
          )}

          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-zinc-500">{lig.gorunenAd}</span>
            <form action={cikisYap}>
              <button type="submit" className={bagSinifi}>
                Çıkış
              </button>
            </form>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
