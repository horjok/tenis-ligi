import { TemaSecici } from "@/app/tema-secici";
import { eloGoster, ligBilgisi } from "@/lib/lig";
import { createClient } from "@/lib/supabase/server";

import { AdFormu, SifreFormu } from "./hesap-formlari";
import {
  EpostaFormu,
  EpostaSilButonu,
  TercihAnahtari,
} from "./profil-formlari";

export default async function Profil() {
  const lig = await ligBilgisi();
  if (!lig) return null;

  const supabase = await createClient();

  const [{ data: durumSatirlari }, { data: oyuncu }] = await Promise.all([
    // Bekleyen doğrulamayı da getirir ama TOKEN'ı getirmez — token'ı
    // görebilen kişi maildeki linke tıklamadan kendini doğrulayabilirdi.
    supabase.rpc("bildirim_durumum"),
    // İki havuz ayrı satır olarak geliyor; match_type'a göre ayırıyoruz.
    supabase
      .from("puan_tablosu")
      .select("match_type, rating, matches_played, galibiyet, maglubiyet")
      .eq("league_id", lig.ligId)
      .eq("user_id", lig.kullaniciId),
  ]);

  const { data: profil } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", lig.kullaniciId)
    .maybeSingle();

  const puan = (tur: string) =>
    (oyuncu ?? []).find((s) => s.match_type === tur) ?? null;
  const tekler = puan("singles");
  const ciftler = puan("doubles");

  const durum = durumSatirlari?.[0] ?? null;
  const dogrulanmisAdres = durum?.email ?? null;
  const bekleyenAdres = durum?.bekleyen_email ?? null;
  const bildirimAcik = durum?.opt_in ?? true;

  return (
    <div className="flex flex-col gap-10">
      <header className="border-b-4 border-kort pb-2">
        <p className="font-veri text-[11px] uppercase tracking-wider text-murekkep-silik">
          {lig.admin ? "Yönetici" : "Oyuncu"}
        </p>
        <h2 className="mt-1 text-[32px] md:text-[44px]">{lig.gorunenAd}</h2>
      </header>

      {/* ---------- Puanlar ---------- */}
      {/* Tekler ve çiftler ayrı havuz; tek bir "puanın" yok, ikisi var. */}
      <section className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-4 sm:max-w-lg sm:grid-cols-2">
          {(
            [
              ["Tekler", tekler],
              ["Çiftler", ciftler],
            ] as const
          ).map(([etiket, satir]) => (
            <div key={etiket} className="border border-cizgi bg-yuzey-panel">
              <div className="border-b border-cizgi bg-yuzey-yukseltilmis px-4 py-2 font-baslik text-[15px] uppercase tracking-wide text-murekkep-silik">
                {etiket}
              </div>
              {satir ? (
                <div className="flex items-end justify-between px-4 py-3">
                  <p className="veri text-[32px]">{eloGoster(satir.rating)}</p>
                  <p className="font-veri text-[12px] text-murekkep-silik">
                    {satir.matches_played} maç · {satir.galibiyet}-
                    {satir.maglubiyet}
                  </p>
                </div>
              ) : (
                <p className="px-4 py-4 text-sm text-murekkep-silik">
                  Henüz {etiket.toLocaleLowerCase("tr")} maçı oynamadın.
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="max-w-xl text-xs leading-5 text-murekkep-silik">
          İki puan birbirinden tamamen bağımsız. Çiftler maçı tekler puanını,
          tekler maçı çiftler puanını etkilemez.
        </p>
      </section>

      {/* ---------- E-posta ---------- */}
      <section className="flex flex-col gap-4">
        <h3 className="border-b border-cizgi pb-1.5 text-[22px]">E-posta</h3>
        <p className="max-w-xl text-sm leading-6 text-murekkep-sonuk">
          Zorunlu değil. Eklersen, cevabını bekleyen önerilerin varken günde{" "}
          <strong>bir kez</strong> hatırlatma maili alırsın — öneri başına
          ayrı mail gitmez. Adresin ligdeki kimseye görünmez.
        </p>

        {dogrulanmisAdres ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border border-cizgi bg-yuzey-panel px-4 py-3">
            <div className="min-w-0">
              <p className="font-veri text-[11px] uppercase tracking-wide text-murekkep-silik">
                Doğrulanmış adres
              </p>
              <p className="mt-0.5 truncate font-veri text-[15px]">
                {dogrulanmisAdres}
              </p>
            </div>
            <EpostaSilButonu />
          </div>
        ) : (
          <p className="border border-dashed border-cizgi px-4 py-3 text-sm text-murekkep-silik">
            Kayıtlı adresin yok, sana mail gitmiyor.
          </p>
        )}

        {bekleyenAdres && (
          <p className="border-l-4 border-kazanan bg-yuzey-yukseltilmis px-3 py-2.5 text-sm leading-6">
            <strong className="font-veri">{bekleyenAdres}</strong> adresine bir
            doğrulama bağlantısı gönderildi. Bağlantıya tıklanana kadar bu
            adres kullanılmaz — yanlış yazılmış bir adrese aylarca mail
            gitmesini böyle engelliyoruz.
          </p>
        )}

        <EpostaFormu mevcutAdres={dogrulanmisAdres} />
      </section>

      {/* ---------- Bildirim tercihi ---------- */}
      <section className="flex flex-col gap-4">
        <h3 className="border-b border-cizgi pb-1.5 text-[22px]">Bildirimler</h3>
        <p className="max-w-xl text-sm leading-6 text-murekkep-sonuk">
          Kapatırsan adresin kayıtlı kalır ama mail gönderilmez. Maillerin
          altındaki bağlantı da aynı işi yapar.
        </p>
        <TercihAnahtari acik={bildirimAcik} />
      </section>

      {/* ---------- Hesap ---------- */}
      <section className="flex flex-col gap-6">
        <h3 className="border-b border-cizgi pb-1.5 text-[22px]">Hesap</h3>

        <div className="flex flex-wrap items-center gap-3 border border-cizgi bg-yuzey-panel px-4 py-3">
          <span className="font-veri text-[11px] uppercase tracking-wide text-murekkep-silik">
            Kullanıcı adı
          </span>
          <span className="font-veri text-[15px]">{profil?.username ?? "—"}</span>
          <span className="text-xs text-murekkep-silik">
            (değiştirilemez — giriş kimliğin buna bağlı)
          </span>
        </div>

        <AdFormu mevcutAd={lig.gorunenAd} />

        <div className="border-t border-cizgi pt-6">
          <p className="mb-4 max-w-xl text-sm leading-6 text-murekkep-sonuk">
            Şifreni değiştirmek için mevcut şifreni de yazman gerekiyor.
            Sebebi: açık unutulmuş bir tarayıcının başına geçen biri, sadece
            oturum yeterli olsaydı şifreni değiştirip hesabı ele geçirebilirdi.
          </p>
          <SifreFormu />
        </div>
      </section>

      {/* ---------- Görünüm ---------- */}
      {/* Temanın kalıcı yeri burası. Masaüstünde kenar çubuğunda da hızlı
          erişim var; mobilde üst çubuk dört eylemle zaten doluydu. */}
      <section className="flex flex-col gap-4">
        <h3 className="border-b border-cizgi pb-1.5 text-[22px]">Görünüm</h3>
        <p className="max-w-xl text-sm leading-6 text-murekkep-sonuk">
          &quot;Oto&quot; seçiliyken telefonunun ya da bilgisayarının ayarını
          takip eder. Seçimin bu tarayıcıda saklanır, diğer cihazlarına
          taşınmaz.
        </p>
        <div className="max-w-xs">
          <TemaSecici />
        </div>
      </section>
    </div>
  );
}
