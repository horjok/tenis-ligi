import Link from "next/link";

import { eloGoster, ligBilgisi } from "@/lib/lig";
import { createClient } from "@/lib/supabase/server";

export default async function PuanTablosu() {
  const lig = await ligBilgisi();
  if (!lig) return null; // layout zaten uyarı gösteriyor

  const supabase = await createClient();
  const { data: satirlar } = await supabase
    .from("puan_tablosu")
    .select("user_id, display_name, rating, matches_played, galibiyet, maglubiyet")
    .eq("league_id", lig.ligId)
    .eq("match_type", "singles")
    .order("rating", { ascending: false });

  if (!satirlar || satirlar.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Puan tablosu</h1>
        <p className="mt-4 text-sm text-zinc-500">
          Henüz maç kaydedilmemiş. İlk maçı girdiğinizde tablo burada oluşur.
        </p>
        <Link
          href="/lig/mac-ekle"
          className="mt-6 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Maç ekle
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Puan tablosu</h1>
      <p className="mt-1 text-sm text-zinc-500">Tekler — Elo sıralaması</p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <th className="py-2 pr-3 font-medium">#</th>
              <th className="py-2 pr-3 font-medium">Oyuncu</th>
              <th className="py-2 pr-3 text-right font-medium">Elo</th>
              <th className="py-2 pr-3 text-right font-medium">Maç</th>
              <th className="py-2 text-right font-medium">G-M</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.map((satir, sira) => {
              const benMiyim = satir.user_id === lig.kullaniciId;
              return (
                <tr
                  key={satir.user_id}
                  className={`border-b border-zinc-100 dark:border-zinc-900 ${
                    benMiyim ? "font-medium" : ""
                  }`}
                >
                  <td className="py-2.5 pr-3 text-zinc-500">{sira + 1}</td>
                  <td className="py-2.5 pr-3">
                    {satir.display_name}
                    {benMiyim && (
                      <span className="ml-2 text-xs text-zinc-500">(sen)</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {eloGoster(satir.rating)}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-zinc-500">
                    {satir.matches_played}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-zinc-500">
                    {satir.galibiyet}-{satir.maglubiyet}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs leading-5 text-zinc-500">
        Herkes 1000 puanla başlar. Kazanınca puan alır, kaybedince verir —
        güçlü rakibi yenmek çok, zayıf rakibi yenmek az kazandırır.
      </p>
    </div>
  );
}
