import { ligBilgisi } from "@/lib/lig";
import {
  anahtarla,
  gunListesi,
  ILK_SAAT,
  slotAnahtari,
  SON_SAAT,
} from "@/lib/takvim";
import { createClient } from "@/lib/supabase/server";

import { TakvimIzgara } from "./takvim-izgara";

export default async function Takvim() {
  const lig = await ligBilgisi();
  if (!lig) return null;

  const gunler = gunListesi();
  const ilkDilim = slotAnahtari(gunler[0], ILK_SAAT);
  const sonDilim = slotAnahtari(gunler[gunler.length - 1], SON_SAAT);

  const supabase = await createClient();
  const { data: dilimler } = await supabase
    .from("availability_slots")
    .select("user_id, slot_start")
    .eq("league_id", lig.ligId)
    .gte("slot_start", ilkDilim)
    .lte("slot_start", sonDilim);

  // Kendi dilimlerim ile başkalarınınkini ayırıyoruz: hücre rengi benimkine,
  // hücredeki sayı başkalarınınkine bakıyor.
  const benimSlotlar: string[] = [];
  const digerSayilari: Record<string, number> = {};

  for (const dilim of dilimler ?? []) {
    const anahtar = anahtarla(dilim.slot_start);
    if (dilim.user_id === lig.kullaniciId) {
      benimSlotlar.push(anahtar);
    } else {
      digerSayilari[anahtar] = (digerSayilari[anahtar] ?? 0) + 1;
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Takvim</h1>
      <p className="mt-1 mb-6 max-w-xl text-sm leading-6 text-zinc-500">
        Müsait olduğun saatleri işaretle. Aynı saati işaretleyen başka biri
        varsa sistem ikinize maç önerisi çıkaracak — kimseye tek tek
        &quot;müsait misin&quot; diye sormana gerek kalmayacak.
      </p>

      <TakvimIzgara
        gunler={gunler}
        benimSlotlar={benimSlotlar}
        digerSayilari={digerSayilari}
        simdiIso={new Date().toISOString()}
      />

      <p className="mt-6 max-w-xl text-xs leading-5 text-zinc-500">
        İşaretini istediğin zaman kaldırabilirsin. Ama o saat için kesinleşmiş
        bir maçın varsa kaldıramazsın — sözünü verdiğin maçtan takvimi
        silerek çıkamazsın.
      </p>
    </div>
  );
}
