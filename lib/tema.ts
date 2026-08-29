/**
 * Tema tercihi.
 *
 * Üç durum: "sistem" (varsayılan), "light", "koyu" için "dark".
 * Seçim localStorage'da, uygulanmış hâli kök öğenin `data-theme`
 * özniteliğinde duruyor. CSS bu özniteliğe bakıyor (bkz. globals.css).
 */

export type Tema = "sistem" | "light" | "dark";

export const TEMA_ANAHTARI = "tenis-ligi-tema";

/** Tema değişince pencerede yayılan olay; ekrandaki seçiciler bunu dinliyor. */
export const TEMA_OLAYI = "tenis-ligi-tema-degisti";

/**
 * Sayfa boyanmadan ÖNCE çalışan betik.
 *
 * Neden gerekli: tercih localStorage'da, sunucu onu göremiyor. Bu betik
 * olmasaydı sunucu her zaman açık temayı gönderir, JavaScript yüklendikten
 * sonra koyuya dönerdi — koyu tema seçen kullanıcı her sayfa açılışında
 * beyaz bir parlama görürdü.
 *
 * `<head>` içinde, senkron ve satır içi olmak zorunda: harici bir dosya ya da
 * `defer` ilk boyamadan sonra çalışır ve parlamayı engellemez.
 *
 * try/catch şart: gizli sekmede ya da site verisi engelliyken localStorage'a
 * ERİŞMEK bile istisna fırlatabiliyor. Tema okunamazsa sistem tercihi geçerli
 * kalıyor, sayfa yine doğru çiziliyor.
 */
export const TEMA_BETIGI = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  TEMA_ANAHTARI,
)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export function temayiOku(): Tema {
  try {
    const t = localStorage.getItem(TEMA_ANAHTARI);
    return t === "light" || t === "dark" ? t : "sistem";
  } catch {
    return "sistem";
  }
}

export function temayiUygula(tema: Tema): void {
  try {
    if (tema === "sistem") localStorage.removeItem(TEMA_ANAHTARI);
    else localStorage.setItem(TEMA_ANAHTARI, tema);
  } catch {
    // Depolama kapalıysa seçim kalıcı olmaz ama bu oturumda çalışır.
  }

  const kok = document.documentElement;
  if (tema === "sistem") kok.removeAttribute("data-theme");
  else kok.setAttribute("data-theme", tema);

  window.dispatchEvent(new Event(TEMA_OLAYI));
}
