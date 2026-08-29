import { redirect } from "next/navigation";

import { puanlariYenidenHesapla } from "@/app/actions/yonetim";
import { gunGoster, ligBilgisi, tarihGoster } from "@/lib/lig";
import { createClient } from "@/lib/supabase/server";

import {
  KodIptalButonu,
  KodUretFormu,
  SezonBitirFormu,
  SezonOlusturFormu,
  SezonSilButonu,
} from "./yonetim-formlari";

export default async function Yonetim() {
  const lig = await ligBilgisi();
  if (!lig) return null;

  // Admin olmayan buraya girmesin. Veritabanı zaten hiçbir şey göstermez
  // ama boş bir ekran yerine düzgün yönlendirme yapalım.
  if (!lig.admin) {
    redirect("/lig");
  }

  const supabase = await createClient();

  const [{ data: kodlar }, { data: uyeler }, { data: sezonlar }] = await Promise.all([
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
    supabase
      .from("seasons")
      .select("id, name, starts_on, ends_on")
      .eq("league_id", lig.ligId)
      .order("starts_on", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <header className="border-b-4 border-kort pb-2">
        <p className="font-veri text-[11px] uppercase tracking-wider text-murekkep-silik">
          Yönetici paneli
        </p>
        <h2 className="mt-1 text-[32px] md:text-[44px]">Yönetim</h2>
      </header>

      {/* ---------- Davet kodları ---------- */}
      <section className="flex flex-col gap-4">
        <h3 className="border-b border-cizgi pb-1.5 text-[22px]">
          Davet Kodları
        </h3>
        <p className="max-w-xl text-sm leading-6 text-murekkep-sonuk">
          Yeni oyuncu ancak geçerli bir kodla kayıt olabilir. Kod girildiği an
          lige aktif üye olur, ayrıca onaylaman gerekmez.
        </p>

        <KodUretFormu />

        {kodlar && kodlar.length > 0 && (
          <div className="mt-2 border border-cizgi bg-yuzey-panel">
            <div className="grid grid-cols-12 gap-2 border-b border-cizgi bg-yuzey-yukseltilmis px-3 py-2.5 font-baslik text-[14px] uppercase tracking-wider text-murekkep-silik">
              <div className="col-span-5">Kod</div>
              <div className="col-span-3 text-right">Kullanım</div>
              <div className="col-span-2 hidden sm:block">Üretildi</div>
              <div className="col-span-4 sm:col-span-2" />
            </div>

            {kodlar.map((k, i) => {
              const dolu = k.used_count >= k.max_uses;
              return (
                <div
                  key={k.id}
                  className={[
                    "grid grid-cols-12 items-center gap-2 px-3 py-2.5",
                    i === kodlar.length - 1 ? "" : "border-b border-cizgi",
                  ].join(" ")}
                >
                  <div
                    className={`col-span-5 veri text-[15px] tracking-wider ${
                      dolu ? "text-murekkep-silik line-through" : ""
                    }`}
                  >
                    {k.code}
                  </div>
                  <div className="col-span-3 veri text-right text-[15px] text-murekkep-sonuk">
                    {k.used_count}/{k.max_uses}
                  </div>
                  <div className="col-span-2 hidden font-veri text-[12px] text-murekkep-silik sm:block">
                    {tarihGoster(k.created_at)}
                  </div>
                  <div className="col-span-4 text-right sm:col-span-2">
                    <KodIptalButonu kodId={k.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- Üyeler ---------- */}
      <section className="flex flex-col gap-4">
        <h3 className="border-b border-cizgi pb-1.5 text-[22px]">Üyeler</h3>

        <div className="border border-cizgi bg-yuzey-panel">
          <div className="grid grid-cols-12 gap-2 border-b border-cizgi bg-yuzey-yukseltilmis px-3 py-2.5 font-baslik text-[14px] uppercase tracking-wider text-murekkep-silik">
            <div className="col-span-5">Oyuncu</div>
            <div className="col-span-4 hidden sm:block">Kullanıcı adı</div>
            <div className="col-span-4 sm:col-span-2">Rol</div>
            <div className="col-span-3 hidden text-right sm:col-span-1 sm:block">
              Katıldı
            </div>
          </div>

          {(uyeler ?? []).map((u, i) => (
            <div
              key={u.user_id}
              className={[
                "grid grid-cols-12 items-center gap-2 px-3 py-2.5",
                i === (uyeler?.length ?? 0) - 1 ? "" : "border-b border-cizgi",
              ].join(" ")}
            >
              <div className="col-span-5 truncate font-baslik text-[20px] uppercase">
                {u.display_name}
              </div>
              <div className="col-span-4 hidden truncate font-veri text-[13px] text-murekkep-silik sm:block">
                {u.username}
              </div>
              <div className="col-span-4 sm:col-span-2">
                {u.role === "admin" ? (
                  <span className="bg-kort px-2 py-0.5 font-veri text-[10px] uppercase tracking-wide text-tebesir">
                    Yönetici
                  </span>
                ) : (
                  <span className="font-veri text-[11px] uppercase tracking-wide text-murekkep-silik">
                    Oyuncu
                  </span>
                )}
              </div>
              <div className="col-span-3 hidden text-right font-veri text-[12px] text-murekkep-silik sm:col-span-1 sm:block">
                {u.joined_at ? tarihGoster(u.joined_at) : "—"}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Sezonlar ---------- */}
      <section className="flex flex-col gap-4">
        <h3 className="border-b border-cizgi pb-1.5 text-[22px]">Sezonlar</h3>
        <p className="max-w-xl text-sm leading-6 text-murekkep-sonuk">
          Sezon yalnızca bir tarih aralığıdır. Maç kayıtlarına hiçbir şey
          yazılmaz, Elo sıfırlanmaz. Sıralama o aralıkta{" "}
          <strong>kazanılan puana</strong> göre hesaplanır — sezonun şampiyonu
          en yüksek Elo&apos;lu oyuncu değil, en çok ilerleyendir.
        </p>

        <SezonOlusturFormu />

        {sezonlar && sezonlar.length > 0 && (
          <div className="mt-2 border border-cizgi bg-yuzey-panel">
            <div className="grid grid-cols-12 gap-2 border-b border-cizgi bg-yuzey-yukseltilmis px-3 py-2.5 font-baslik text-[14px] uppercase tracking-wider text-murekkep-silik">
              <div className="col-span-5">Sezon</div>
              <div className="col-span-5">Aralık</div>
              <div className="col-span-2" />
            </div>

            {sezonlar.map((sz, i) => (
              <div
                key={sz.id}
                className={[
                  "grid grid-cols-12 items-center gap-2 px-3 py-2.5",
                  i === sezonlar.length - 1 ? "" : "border-b border-cizgi",
                ].join(" ")}
              >
                <div className="col-span-5 truncate font-baslik text-[20px] uppercase">
                  {sz.name}
                </div>

                <div className="col-span-5 font-veri text-[12px] text-murekkep-sonuk">
                  {gunGoster(sz.starts_on)}
                  {sz.ends_on ? (
                    <> &mdash; {gunGoster(sz.ends_on)}</>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="bg-kazanan px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-kort">
                        Sürüyor
                      </span>
                      <SezonBitirFormu sezonId={sz.id} />
                    </div>
                  )}
                </div>

                <div className="col-span-2 text-right">
                  <SezonSilButonu sezonId={sz.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------- Yeniden hesaplama ---------- */}
      <section className="flex flex-col gap-4">
        <h3 className="border-b border-cizgi pb-1.5 text-[22px]">
          Puanları Yeniden Hesapla
        </h3>
        <p className="max-w-xl text-sm leading-6 text-murekkep-sonuk">
          Elo zincirleme çalışır: bir maçın sonucu, o ana kadarki puanlara
          bağlıdır. Hatalı bir maçı sildikten sonra bunu çalıştır — tüm puanlar
          1000&apos;e döner ve maçlar tarih sırasıyla baştan işlenir.
        </p>
        <form action={puanlariYenidenHesapla}>
          <button
            type="submit"
            className="border-2 border-kort px-6 py-3 font-govde text-[14px] font-bold uppercase tracking-wider transition-colors hover:bg-kort hover:text-tebesir"
          >
            Yeniden hesapla
          </button>
        </form>
      </section>
    </div>
  );
}
