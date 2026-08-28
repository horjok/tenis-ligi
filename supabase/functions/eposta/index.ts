/**
 * Tenis Ligi — e-posta gönderici (Supabase Edge Function, Deno)
 *
 * İki iş yapar:
 *   kind: "gunluk"     → günlük toplu hatırlatma. pg_cron tetikler.
 *   kind: "dogrulama"  → adres doğrulama linki. Kullanıcı profilden tetikler.
 *
 * ---------------------------------------------------------------------------
 * NEDEN İKİSİ DE BURADA?
 * Resend API anahtarının tek bir yerde durması için. Doğrulama mailini
 * Next.js'ten atsaydık anahtarın bir kopyası da orada olurdu; iki kopyalı
 * sır, bir kopyalı sırdan daha kötüdür.
 * ---------------------------------------------------------------------------
 * KURU MOD
 * RESEND_API_KEY tanımlı değilse hiçbir mail gönderilmez ama sistemin geri
 * kalanı normal çalışır: kimin hangi maili alacağı hesaplanır, gövdesi
 * üretilir, notification_log'a dry_run = true olarak yazılır ve mailin
 * özeti bu fonksiyonun günlüğüne basılır. Anahtar eklendiğinde değişen tek
 * şey gerçekten gönderilmesi.
 * ---------------------------------------------------------------------------
 * Bağımlılık yok, düz `fetch`. Edge runtime'da paket çözümleme sorunu
 * yaşanmasın ve hata yönetimi görünür kalsın diye böyle.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Günlük işi tetiklemeye yetkili sır. pg_cron bunu Vault'tan okuyup gönderir.
 *
 * NEDEN SERVİS ANAHTARI DEĞİL?
 * Servis anahtarı veritabanının tamamını açar. Cron'un ihtiyacı olan tek şey
 * "günlük maili başlat" demek. Ayrı bir sır kullanınca, bu değer bir yerden
 * sızsa bile (Vault kaydı, sorgu günlüğü, cron tanımı) elde edilen tek yetki
 * günlük maili tetiklemek oluyor.
 *
 * Tanımlı değilse günlük iş ÇALIŞMAZ. Bilerek böyle: eksik yapılandırmada
 * sessizce servis anahtarına düşmek, tam da kaçındığımız şeye geri dönmek olur.
 */
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const GONDEREN = Deno.env.get("RESEND_FROM") ?? "Tenis Ligi <onboarding@resend.dev>";
const SITE = (Deno.env.get("SITE_URL") ?? "http://localhost:3000").replace(/\/$/, "");

/** Anahtar yoksa kuru mod. */
const KURU = RESEND_KEY === "";

type Oneri = { rakip: string; ne_zaman: string };
type Alici = {
  user_id: string;
  display_name: string;
  email: string;
  unsubscribe_token: string;
  oneri_sayisi: number;
  oneriler: Oneri[];
};

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

/**
 * HTML kaçırma. Oyuncu adları kullanıcı girdisi — doğrudan gövdeye
 * yazılırsa maile istenmeyen işaretleme sokulabilir.
 */
function kacir(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * "2026-09-01T19:00:00" → "1 Eylül Salı, 19:00"
 *
 * Veritabanı zamanı İstanbul yerel saatine çevirip offset'siz veriyor.
 * Buraya "+03:00" ekliyoruz: Türkiye 2016'dan beri kalıcı UTC+3, yaz saati
 * yok. Böylece biçimleme Edge runtime'ın saat dilimine bağlı kalmıyor.
 */
function zamanYaz(isoYerel: string): string {
  const t = new Date(`${isoYerel}+03:00`);
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(t);
}

/**
 * Sabit süreli karşılaştırma.
 *
 * Sıradan `a === b`, ilk farklı karakterde durur. Bir saldırgan cevap
 * sürelerini ölçerek sırrı karakter karakter bulabilir. Bizim ölçeğimizde
 * uzak bir ihtimal ama doğrusunu yazmak üç satır.
 */
function zamanGuvenliEsit(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}

/** PostgREST çağrısı — service_role ile, RLS atlanır. */
async function db(yol: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(`${SUPABASE_URL}/rest/v1/${yol}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

/**
 * Resend'e gönderir. Kuru modda göndermez, günlüğe basar.
 * Fırlatmaz — çağıran başarı/başarısızlık kararını kendi verir.
 */
async function gonder(
  kime: string,
  konu: string,
  html: string,
): Promise<{ tamam: boolean; not: string }> {
  if (KURU) {
    console.log(
      `[KURU MOD] gönderilmedi\n  kime : ${kime}\n  konu : ${konu}\n` +
        `  gövde: ${html.replace(/\s+/g, " ").slice(0, 400)}…`,
    );
    return { tamam: true, not: "kuru" };
  }

  try {
    const cevap = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: GONDEREN, to: [kime], subject: konu, html }),
    });

    if (!cevap.ok) {
      const govde = await cevap.text();
      return { tamam: false, not: `resend ${cevap.status}: ${govde.slice(0, 200)}` };
    }
    return { tamam: true, not: "gonderildi" };
  } catch (e) {
    // Ağ hatası, zaman aşımı… Mail servisi çökebilir; bizim işimiz çökmemeli.
    return { tamam: false, not: `aglama: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ---------------------------------------------------------------------------
// Mail gövdeleri
// ---------------------------------------------------------------------------

const KABUK = (icerik: string, altbilgi: string) => `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f3f4f0;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#f9faf6;border:1px solid #dcdfd6">
    <div style="background:#123b45;color:#f3f4f0;padding:16px 20px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">
      Tenis Ligi
    </div>
    <div style="padding:20px;color:#123b45;font-size:15px;line-height:1.6">${icerik}</div>
    <div style="border-top:1px solid #dcdfd6;padding:14px 20px;color:#71787b;font-size:12px;line-height:1.5">
      ${altbilgi}
    </div>
  </div>
</div>`;

function gunlukMail(a: Alici): { konu: string; html: string } {
  const n = a.oneri_sayisi;
  const konu =
    n === 1 ? "1 maç önerisi seni bekliyor" : `${n} maç önerisi seni bekliyor`;

  const satirlar = a.oneriler
    .map(
      (o) =>
        `<tr>
           <td style="padding:8px 0;border-bottom:1px solid #dcdfd6;font-weight:600">${kacir(o.rakip)}</td>
           <td style="padding:8px 0;border-bottom:1px solid #dcdfd6;text-align:right;color:#41484a;white-space:nowrap">${kacir(zamanYaz(o.ne_zaman))}</td>
         </tr>`,
    )
    .join("");

  const icerik = `
    <p style="margin:0 0 4px">Merhaba ${kacir(a.display_name)},</p>
    <p style="margin:0 0 16px">Cevabını bekleyen ${n} önerin var:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${satirlar}</table>
    <p style="margin:20px 0 0">
      <a href="${SITE}/lig/onerilerim"
         style="display:inline-block;background:#123b45;color:#f3f4f0;padding:12px 22px;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:.05em;font-size:13px">
        Önerilere bak
      </a>
    </p>`;

  const altbilgi = `
    Bu maili günde en fazla bir kez alırsın; öneri başına ayrı mail gönderilmez.<br>
    <a href="${SITE}/bildirim-kapat/${a.unsubscribe_token}" style="color:#71787b">Bildirimleri kapat</a>`;

  return { konu, html: KABUK(icerik, altbilgi) };
}

function dogrulamaMaili(ad: string, token: string): { konu: string; html: string } {
  const link = `${SITE}/eposta-dogrula/${token}`;
  const icerik = `
    <p style="margin:0 0 4px">Merhaba ${kacir(ad)},</p>
    <p style="margin:0 0 16px">
      Bu adresi Tenis Ligi bildirimlerin için eklediysen aşağıdaki bağlantıya tıkla.
      Tıklamazsan bu adrese başka mail gönderilmez.
    </p>
    <p style="margin:0">
      <a href="${link}"
         style="display:inline-block;background:#123b45;color:#f3f4f0;padding:12px 22px;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:.05em;font-size:13px">
        Adresimi doğrula
      </a>
    </p>`;
  const altbilgi = `
    Bağlantı 24 saat geçerli.<br>
    Bu isteği sen yapmadıysan bu maili yok say — hiçbir şey olmaz.`;
  return { konu: "Tenis Ligi — adresini doğrula", html: KABUK(icerik, altbilgi) };
}

// ---------------------------------------------------------------------------
// İşler
// ---------------------------------------------------------------------------

async function gunlukIs(): Promise<Response> {
  const cevap = await db("rpc/gunluk_bildirim_listesi", {
    method: "POST",
    body: JSON.stringify({ p_dry: KURU }),
  });

  if (!cevap.ok) {
    const t = await cevap.text();
    console.error("Liste alınamadı:", cevap.status, t);
    return Response.json({ hata: "liste alinamadi" }, { status: 500 });
  }

  const alicilar = (await cevap.json()) as Alici[];
  let gonderilen = 0;
  let atlanan = 0;
  let basarisiz = 0;

  for (const a of alicilar) {
    // --- Önce günü "kap", sonra gönder ---------------------------------
    // Sıra bilerek böyle. Önce gönderip sonra kaydetseydik, iş iki kez aynı
    // anda çalıştığında ikisi de gönderip sonra biri kayıtta çakışırdı —
    // yani mail iki kez giderdi. Şimdi çakışan ikinci çalışma hiç göndermiyor.
    const kayit = await db("notification_log", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: a.user_id,
        kind: "daily_proposals",
        match_count: a.oneri_sayisi,
        dry_run: KURU,
      }),
    });

    if (kayit.status === 409) {
      // Benzersiz indeks reddetti: bugün bu kişiye zaten gönderilmiş.
      atlanan++;
      continue;
    }
    if (!kayit.ok) {
      console.error("Kayıt açılamadı:", a.user_id, kayit.status, await kayit.text());
      basarisiz++;
      continue;
    }

    const kayitId = ((await kayit.json()) as { id: string }[])[0]?.id;

    const { konu, html } = gunlukMail(a);
    const sonuc = await gonder(a.email, konu, html);

    if (sonuc.tamam) {
      gonderilen++;
      continue;
    }

    // --- Gönderim başarısız: kaydı geri al ------------------------------
    // Kayıt dursaydı bu kişi bugünü kaybederdi (yarına kadar hiç mail yok).
    // Geri alınca bir sonraki çalışma tekrar deneyebiliyor.
    basarisiz++;
    console.error("Gönderilemedi, kayıt geri alınıyor:", a.email, sonuc.not);
    if (kayitId) {
      await db(`notification_log?id=eq.${kayitId}`, { method: "DELETE" });
    }
  }

  const ozet = { kip: KURU ? "kuru" : "gercek", gonderilen, atlanan, basarisiz, aday: alicilar.length };
  console.log("Günlük iş bitti:", JSON.stringify(ozet));
  return Response.json(ozet);
}

async function dogrulamaIsi(kullaniciJwt: string): Promise<Response> {
  // Jetonu GoTrue'ya doğrulattır — imzayı biz kontrol etmiyoruz, o ediyor.
  //
  // `apikey` başlığı sadece "bu projeye konuşuyorum" demek; kullanıcıyı
  // belirleyen Authorization başlığındaki jeton. Buraya servis anahtarını
  // koymak yetki genişletmiyor — SUPABASE_ANON_KEY'in her projede tanımlı
  // olduğuna güvenmek yerine kesin olanı kullanıyoruz.
  const kullaniciCevap = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${kullaniciJwt}` },
  });
  if (!kullaniciCevap.ok) {
    return Response.json({ hata: "gecersiz oturum" }, { status: 401 });
  }
  const kullanici = (await kullaniciCevap.json()) as { id?: string };
  if (!kullanici.id) {
    return Response.json({ hata: "gecersiz oturum" }, { status: 401 });
  }

  // Token'ı buradan okuyoruz; tarayıcı hiçbir zaman görmüyor.
  const veriCevap = await db("rpc/dogrulama_maili_verisi", {
    method: "POST",
    body: JSON.stringify({ p_user_id: kullanici.id }),
  });
  if (!veriCevap.ok) {
    console.error("Doğrulama verisi alınamadı:", await veriCevap.text());
    return Response.json({ hata: "veri alinamadi" }, { status: 500 });
  }

  const satirlar = (await veriCevap.json()) as {
    token: string;
    email: string;
    display_name: string;
  }[];
  if (satirlar.length === 0) {
    // Bekleyen doğrulama yok. Bu bir hata değil — kullanıcı adresini
    // eklemeden çağırmış ya da zaten doğrulamış olabilir.
    return Response.json({ durum: "bekleyen_yok" });
  }

  const { token, email, display_name } = satirlar[0];

  // Kuru modda bağlantıyı AYRICA ve tam olarak bas. Mail gövdesi günlükte
  // kısaltılıyor; kuru modun tüm amacı akışı uçtan uca deneyebilmek, o da
  // bu bağlantıya ulaşabilmekten geçiyor.
  if (KURU) {
    console.log(`[KURU MOD] doğrulama bağlantısı: ${SITE}/eposta-dogrula/${token}`);
  }

  const { konu, html } = dogrulamaMaili(display_name, token);
  const sonuc = await gonder(email, konu, html);

  if (!sonuc.tamam) {
    console.error("Doğrulama maili gönderilemedi:", email, sonuc.not);
    return Response.json({ hata: "gonderilemedi" }, { status: 502 });
  }

  await db(`email_verifications?token=eq.${token}`, {
    method: "PATCH",
    body: JSON.stringify({ sent_at: new Date().toISOString() }),
  });

  return Response.json({ durum: KURU ? "kuru" : "gonderildi" });
}

// ---------------------------------------------------------------------------
// Giriş noktası
// ---------------------------------------------------------------------------

Deno.serve(async (istek) => {
  if (istek.method !== "POST") {
    return Response.json({ hata: "POST bekleniyor" }, { status: 405 });
  }

  const yetki = istek.headers.get("Authorization") ?? "";
  const jeton = yetki.startsWith("Bearer ") ? yetki.slice(7) : "";

  let govde: { kind?: string };
  try {
    govde = await istek.json();
  } catch {
    govde = {};
  }

  switch (govde.kind) {
    case "gunluk": {
      // Yalnızca cron. Bu iş ligdeki herkesin adresine mail attırıyor,
      // kullanıcıya açık olamaz.
      //
      // Sır neden Authorization'da değil, ayrı başlıkta?
      // Supabase'in kapısı (verify_jwt) Authorization başlığında GEÇERLİ BİR
      // JWT görmek istiyor ve bizim rastgele hex sırrımızı daha fonksiyona
      // ulaşmadan reddediyor. Çözüm: Authorization'a publishable anahtarı
      // koyup kapıyı geçmek — o anahtar zaten herkese açık, cron tanımında
      // durması bir şey sızdırmıyor — ve asıl yetkiyi bu başlıkta taşımak.
      if (CRON_SECRET === "") {
        console.error("CRON_SECRET tanımlı değil, günlük iş kapalı.");
        return Response.json({ hata: "yapilandirilmamis" }, { status: 503 });
      }
      const sir = istek.headers.get("x-cron-secret") ?? "";
      if (!zamanGuvenliEsit(sir, CRON_SECRET)) {
        return Response.json({ hata: "yetkisiz" }, { status: 401 });
      }
      return await gunlukIs();
    }

    case "dogrulama":
      // Kullanıcının kendi jetonu. Kime mail gideceğini İSTEK BELİRLEMİYOR:
      // jetondan kullanıcıya, kullanıcıdan bekleyen adrese gidiyoruz.
      // Böylece "şu adrese doğrulama maili at" diye kullanılamıyor.
      if (!jeton || jeton === SERVICE_KEY) {
        return Response.json({ hata: "kullanici oturumu gerekli" }, { status: 401 });
      }
      return await dogrulamaIsi(jeton);

    default:
      return Response.json({ hata: "kind: gunluk | dogrulama" }, { status: 400 });
  }
});
