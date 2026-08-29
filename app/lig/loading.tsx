/**
 * Sekmeler arası geçişte anında görünen iskelet.
 *
 * NEDEN GEREKLİ: bu route'ların hepsi dinamik (her istek sunucuda render
 * ediliyor). Suspense sınırı olmadığında Next.js render bitene kadar ESKİ
 * sayfayı ekranda tutuyor — kullanıcı sekmeye dokunuyor ve hiçbir şey
 * olmuyor gibi görünüyor. Mobilde bu bir saniyeden uzun sürüp "takıldı"
 * hissi veriyor.
 *
 * Bu dosya sayfayı hızlandırmıyor; dokunuşa ANINDA karşılık veriyor.
 * Gerçek gecikmenin kaynağı ayrı bir mesele (sunucu bölgesi).
 *
 * Menü layout'ta olduğu için burada yeniden çizilmiyor; yalnızca içerik
 * alanı iskelete dönüyor.
 */

function Kutu({ className = "" }: { className?: string }) {
  return <div className={`bg-yuzey-yukseltilmis ${className}`} />;
}

export default function Yukleniyor() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-hidden>
      {/* Başlık şeridi */}
      <div className="flex items-end justify-between border-b-4 border-cizgi pb-2">
        <Kutu className="h-9 w-56 md:h-11 md:w-72" />
        <Kutu className="mb-1.5 h-3 w-20" />
      </div>

      {/* İçerik satırları — hangi sayfaya gidilirse gidilsin yanlış
          görünmeyecek kadar yalın tutuldu. */}
      <div className="border border-cizgi bg-yuzey-panel">
        <div className="border-b border-cizgi bg-yuzey-yukseltilmis px-3 py-3">
          <Kutu className="h-4 w-40 bg-cizgi" />
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-3 py-3.5 ${
              i === 4 ? "" : "border-b border-cizgi"
            }`}
          >
            <Kutu className="h-6 w-6 shrink-0" />
            <Kutu className="h-6 flex-1" />
            <Kutu className="h-6 w-14 shrink-0" />
          </div>
        ))}
      </div>

      <span className="sr-only" aria-live="polite">
        Yükleniyor…
      </span>
    </div>
  );
}
