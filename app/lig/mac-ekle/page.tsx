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
    <div className="flex flex-col gap-5">
      <header className="border-b-4 border-kort pb-2">
        <h2 className="text-[32px] md:text-[44px]">Maç Ekle</h2>
      </header>

      <p className="max-w-xl text-sm leading-6 text-murekkep-sonuk">
        Takvim dışında oynadığın bir maçı kaydet. Elo puanları anında
        güncellenir.
      </p>

      <MacFormu oyuncular={oyuncular} bugun={bugun} />
    </div>
  );
}
