import { cikisYap } from "@/app/actions/auth";
import { ligBilgisi } from "@/lib/lig";

import { LigMenu } from "./menu";

export default async function LigLayout({ children }: LayoutProps<"/lig">) {
  const lig = await ligBilgisi();

  // Hesabı var ama hiçbir ligin aktif üyesi değil (örn. çıkarılmış).
  if (!lig) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="max-w-sm border border-cizgi bg-yuzey-panel p-8 text-center">
          <h1 className="text-[24px]">Lig üyeliğin yok</h1>
          <p className="mt-3 text-sm text-murekkep-sonuk">
            Hesabın var ama bir ligin aktif üyesi değilsin. Ligi yöneten kişiyle
            konuş.
          </p>
          <form action={cikisYap} className="mt-6">
            <button
              type="submit"
              className="border border-kort px-5 py-2.5 font-govde text-[14px] font-bold uppercase tracking-wider transition-colors hover:bg-kort hover:text-tebesir"
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
      <LigMenu admin={lig.admin} gorunenAd={lig.gorunenAd} />

      {/* Üstte mobil çubuk, altta mobil menü için pay bırakıyoruz. */}
      <main className="flex-1 px-4 pb-24 pt-20 md:ml-[280px] md:px-10 md:pb-10 md:pt-10">
        <div className="mx-auto w-full max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
