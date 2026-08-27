import { redirect } from "next/navigation";

import { puanlariYenidenHesapla } from "@/app/actions/yonetim";
import { ligBilgisi, tarihGoster } from "@/lib/lig";
import { createClient } from "@/lib/supabase/server";

import { KodIptalButonu, KodUretFormu } from "./yonetim-formlari";

export default async function Yonetim() {
  const lig = await ligBilgisi();
  if (!lig) return null;

  // Admin olmayan buraya girmesin. Veritabanı zaten hiçbir şey göstermez
  // ama boş bir ekran yerine düzgün yönlendirme yapalım.
  if (!lig.admin) {
    redirect("/lig");
  }

  const supabase = await createClient();

  const [{ data: kodlar }, { data: uyeler }] = await Promise.all([
    supabase
      .from("invite_codes")
      .select("id, code, max_uses, used_count, created_at")
      .eq("league_id", lig.ligId)
      .order("created_at", { ascending: false }),
    supabase
      .from("lig_oyunculari")
      .select("user_id, display_name, username, role, status, joined_at")
      .eq("league_id", lig.ligId)
      .order("display_name"),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-xl font-semibold">Yönetim</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ligi sen yönetiyorsun. Kod üret, üyeleri gör, puanları yeniden
          hesaplat.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold">Davet kodları</h2>
        <p className="mt-1 mb-4 text-sm text-zinc-500">
          Yeni oyuncu ancak geçerli bir kodla kayıt olabilir. Kod girildiği anda
          lige aktif üye olur, ayrıca onaylaman gerekmez.
        </p>

        <KodUretFormu />

        {kodlar && kodlar.length > 0 && (
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                <th className="py-2 pr-3 font-medium">Kod</th>
                <th className="py-2 pr-3 text-right font-medium">Kullanım</th>
                <th className="py-2 pr-3 font-medium">Üretildi</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {kodlar.map((k) => {
                const dolu = k.used_count >= k.max_uses;
                return (
                  <tr
                    key={k.id}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td
                      className={`py-2.5 pr-3 font-mono ${dolu ? "text-zinc-400 line-through" : ""}`}
                    >
                      {k.code}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-zinc-500">
                      {k.used_count}/{k.max_uses}
                    </td>
                    <td className="py-2.5 pr-3 text-zinc-500">
                      {tarihGoster(k.created_at)}
                    </td>
                    <td className="py-2.5">
                      <KodIptalButonu kodId={k.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold">Üyeler</h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <th className="py-2 pr-3 font-medium">Oyuncu</th>
              <th className="py-2 pr-3 font-medium">Kullanıcı adı</th>
              <th className="py-2 pr-3 font-medium">Rol</th>
              <th className="py-2 font-medium">Katıldı</th>
            </tr>
          </thead>
          <tbody>
            {(uyeler ?? []).map((u) => (
              <tr
                key={u.user_id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2.5 pr-3">{u.display_name}</td>
                <td className="py-2.5 pr-3 font-mono text-xs text-zinc-500">
                  {u.username}
                </td>
                <td className="py-2.5 pr-3 text-zinc-500">
                  {u.role === "admin" ? "yönetici" : "oyuncu"}
                </td>
                <td className="py-2.5 text-zinc-500">
                  {u.joined_at ? tarihGoster(u.joined_at) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Puanları yeniden hesapla</h2>
        <p className="mt-1 mb-4 text-sm leading-6 text-zinc-500">
          Elo zincirleme çalışır: bir maçın sonucu, o ana kadarki puanlara
          bağlıdır. Hatalı bir maçı sildikten sonra bunu çalıştır — tüm puanlar
          1000&apos;e döner ve maçlar tarih sırasıyla baştan işlenir.
        </p>
        <form action={puanlariYenidenHesapla}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
          >
            Yeniden hesapla
          </button>
        </form>
      </section>
    </div>
  );
}
