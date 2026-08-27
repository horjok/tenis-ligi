import { ligBilgisi } from "@/lib/lig";
import { createClient } from "@/lib/supabase/server";

import { MacFormu, type Oyuncu } from "./mac-formu";

export default async function MacEkle() {
  const lig = await ligBilgisi();
  if (!lig) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("lig_oyunculari")
    .select("user_id, display_name")
    .eq("league_id", lig.ligId)
    .eq("status", "active")
    .order("display_name");

  // Kendini rakip olarak seçemezsin; listeden çıkarıyoruz.
  // (Veritabanı da reddediyor, bu sadece formu temiz tutmak için.)
  const oyuncular: Oyuncu[] = (data ?? [])
    .filter((o) => o.user_id !== lig.kullaniciId)
    .map((o) => ({
      user_id: o.user_id as string,
      display_name: o.display_name ?? "—",
    }));

  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="text-xl font-semibold">Maç ekle</h1>
      <p className="mt-1 mb-6 text-sm text-zinc-500">
        Oynadığın bir maçı kaydet. Elo puanları anında güncellenir.
      </p>
      <MacFormu oyuncular={oyuncular} bugun={bugun} />
    </div>
  );
}
