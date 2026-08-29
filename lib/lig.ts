import { createClient } from "@/lib/supabase/server";

export type LigBilgisi = {
  ligId: string;
  kullaniciId: string;
  gorunenAd: string;
  admin: boolean;
};

/**
 * Giriş yapmış kullanıcının aktif lig üyeliğini döndürür.
 *
 * Faz 1'de tek lig var, o yüzden ilk aktif üyeliği alıyoruz. Birden fazla lig
 * gerekirse burası lig seçimine dönüşür — çağıran ekranlar değişmez.
 *
 * null dönerse: kullanıcı hiçbir ligin aktif üyesi değil.
 */
export async function ligBilgisi(): Promise<LigBilgisi | null> {
  const supabase = await createClient();

  const { data: claimData } = await supabase.auth.getClaims();
  const kullaniciId = claimData?.claims?.sub;
  if (typeof kullaniciId !== "string") {
    return null;
  }

  const { data } = await supabase
    .from("lig_oyunculari")
    .select("league_id, role, display_name")
    .eq("user_id", kullaniciId)
    .eq("status", "active")
    .order("joined_at")
    .limit(1)
    .maybeSingle();

  if (!data?.league_id) {
    return null;
  }

  return {
    ligId: data.league_id,
    kullaniciId,
    gorunenAd: data.display_name ?? "—",
    admin: data.role === "admin",
  };
}

/** Elo'yu ekranda gösterirken tam sayıya yuvarla. Depoda küsuratlı kalır. */
export function eloGoster(rating: number | string | null): string {
  if (rating === null) return "—";
  return String(Math.round(Number(rating)));
}

/** Elo değişimini işaretiyle göster: +24 / -24 */
export function eloDegisimGoster(degisim: number | string | null): string {
  if (degisim === null) return "—";
  const n = Math.round(Number(degisim));
  return n > 0 ? `+${n}` : String(n);
}

/**
 * Saatsiz tarihleri ("2026-06-01") gösterir.
 *
 * Neden ayrı fonksiyon: `new Date("2026-06-01")` bu değeri UTC gece yarısı
 * olarak okur. Negatif offsetli bir saat diliminde bu bir gün GERİYE kayar
 * ve sezon 31 Mayıs'ta başlamış gibi görünür. Öğlen ekleyerek kesiyoruz —
 * hiçbir saat dilimi öğleni başka bir güne taşıyamaz.
 */
export function gunGoster(tarih: string): string {
  return new Date(`${tarih}T12:00:00`).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function tarihGoster(isoTarih: string): string {
  return new Date(isoTarih).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
