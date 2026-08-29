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
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between border-b-4 border-kort pb-2">
        <h2 className="text-[32px] md:text-[44px]">Takvim</h2>
        <span className="mb-1.5 font-veri text-[12px] uppercase tracking-wider text-murekkep-silik">
          14 gün
        </span>
      </header>

      <p className="max-w-xl text-sm leading-6 text-murekkep-sonuk">
        Müsait olduğun saatleri işaretle. Aynı saati işaretleyen başka biri
        varsa sistem ikinize maç önerisi çıkarır — kimseye tek tek
        &quot;müsait misin&quot; diye sormana gerek kalmaz.
      </p>

      <TakvimIzgara
        gunler={gunler}
        benimSlotlar={benimSlotlar}
        digerSayilari={digerSayilari}
        simdiIso={new Date().toISOString()}
      />

      <p className="max-w-xl text-xs leading-5 text-murekkep-silik">
        İşaretini istediğin zaman kaldırabilirsin. O saatte kesinleşmiş bir
        maçın varsa kaldıramazsın.
      </p>
    </div>
  );
}
