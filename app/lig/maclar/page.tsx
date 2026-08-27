import { eloDegisimGoster, ligBilgisi, tarihGoster } from "@/lib/lig";
import { createClient } from "@/lib/supabase/server";

type Set = { set_no: number; t1: number; t2: number };

/** jsonb'den gelen set dizisini güvenle okur. */
function setleriOku(ham: unknown): Set[] {
  if (!Array.isArray(ham)) return [];
  return ham.filter(
    (s): s is Set =>
      typeof s === "object" &&
      s !== null &&
      typeof (s as Set).t1 === "number" &&
      typeof (s as Set).t2 === "number",
  );
}

export default async function MacGecmisi() {
  const lig = await ligBilgisi();
  if (!lig) return null;

  const supabase = await createClient();
  const { data: maclar } = await supabase
    .from("mac_gecmisi")
    .select("*")
    .eq("league_id", lig.ligId)
    .order("played_at", { ascending: false });

  if (!maclar || maclar.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Maçlar</h1>
        <p className="mt-4 text-sm text-zinc-500">Henüz maç kaydedilmemiş.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Maçlar</h1>
      <p className="mt-1 text-sm text-zinc-500">{maclar.length} maç</p>

      <ul className="mt-6 flex flex-col gap-3">
        {maclar.map((mac) => {
          const setler = setleriOku(mac.setler);
          const birinciKazandi = mac.winner_team === 1;

          return (
            <li
              key={mac.match_id}
              className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="text-sm">
                  <span className={birinciKazandi ? "font-semibold" : "text-zinc-500"}>
                    {mac.oyuncu1_ad}
                  </span>
                  <span className="mx-2 text-zinc-400">—</span>
                  <span className={!birinciKazandi ? "font-semibold" : "text-zinc-500"}>
                    {mac.oyuncu2_ad}
                  </span>
                </div>
                <div className="text-xs text-zinc-500">
                  {mac.played_at ? tarihGoster(mac.played_at) : "—"}
                  {mac.location ? ` · ${mac.location}` : ""}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                {setler.length > 0 && (
                  <span className="tabular-nums">
                    {setler.map((s) => `${s.t1}-${s.t2}`).join("  ")}
                  </span>
                )}
                <span className="tabular-nums">
                  Elo: {eloDegisimGoster(mac.oyuncu1_elo_degisim)} /{" "}
                  {eloDegisimGoster(mac.oyuncu2_elo_degisim)}
                </span>
                {mac.kaydeden_ad && <span>kaydeden: {mac.kaydeden_ad}</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
