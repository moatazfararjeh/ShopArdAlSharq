// Printable A4 product catalogue in the FoodBox promo-video style (cover,
// contents, one orange-banded opener per category, product grids, back page).
// Pure HTML builder — the admin screen prints it to PDF.

import { COLORS } from '@/lib/theme';
import { formatPrice } from '@/utils/formatPrice';
import { getProductUnits, getUnitLabel, getUnitPrice, isUnitOnSale } from '@/types/models';
import type { Category, Product } from '@/types/models';

export const CATALOG_SHOP_URL = 'shop.ardalsharq.com';

const COLS = 3;
const FIRST_PAGE_ROWS = 3;   // the category banner takes the top of its first page
const PAGE_ROWS = 4;

export interface CatalogSection {
  name: string;
  products: Product[];
}

/** Products grouped by category, in the categories' sort order. */
export function groupCatalogSections(products: Product[], categories: Category[]): CatalogSection[] {
  const order = new Map(categories.map((c, i) => [c.id, i]));
  const names = new Map(categories.map((c) => [c.id, c.name_ar]));
  const byCat = new Map<string, Product[]>();
  for (const p of products) {
    const key = p.category_id ?? '';
    if (!byCat.has(key)) byCat.set(key, []);
    byCat.get(key)!.push(p);
  }
  return [...byCat.entries()]
    .sort(([a], [b]) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9))
    .map(([id, list]) => ({
      name: names.get(id) ?? list[0]?.categories?.name_ar ?? 'منتجات أخرى',
      products: [...list].sort((a, b) => a.name_ar.localeCompare(b.name_ar, 'ar')),
    }));
}

const esc = (s: string | null | undefined) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function imageOf(p: Product): string | undefined {
  const imgs = p.product_images ?? p.images ?? [];
  return (imgs.find((i) => i.is_primary) ?? imgs[0])?.url;
}

/** <img> resized by Supabase's image service (keeps the PDF small); falls back to the original. */
function img(url: string): string {
  const small = url.includes('/storage/v1/object/public/')
    ? url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=400&resize=contain'
    : url;
  return `<img src="${esc(small)}" onerror="this.onerror=null;this.src='${esc(url)}'" alt="" />`;
}

const wordmark = (dark = false) =>
  `<span class="wm"><span class="f">فود</span> <span style="color:${dark ? '#fff' : COLORS.ink}">بوكس</span></span>`;

function card(p: Product, showPrices: boolean): string {
  const unit = getProductUnits(p)[0];
  const url = imageOf(p);
  const price = showPrices && unit
    ? `<div class="price">${esc(formatPrice(getUnitPrice(unit)))}${isUnitOnSale(unit) ? ` <s>${esc(formatPrice(unit.price))}</s>` : ''}</div>`
    : '';
  return `
    <div class="card">
      <div class="im">${url ? img(url) : `<div class="ph">${wordmark()}</div>`}</div>
      <div class="body">
        <div class="nm">${esc(p.name_ar)}</div>
        <div class="row">${price}${unit ? `<span class="unit">${esc(getUnitLabel(unit))}</span>` : ''}</div>
      </div>
    </div>`;
}

function footer(page: number): string {
  return `<div class="foot"><span>${wordmark()} · أرض الشرق</span><span class="url">${CATALOG_SHOP_URL}</span><span class="pn">${page}</span></div>`;
}

export function buildCatalogHtml({ sections, showPrices = false, autoPrint = false }: {
  sections: CatalogSection[];
  showPrices?: boolean;
  /** Web: open the print dialog once fonts and images have loaded. */
  autoPrint?: boolean;
}): string {
  const total = sections.reduce((n, s) => n + s.products.length, 0);
  const firstCap = COLS * FIRST_PAGE_ROWS, cap = COLS * PAGE_ROWS;

  // Paginate first so the contents page can list page numbers.
  let page = 3; // 1 = cover, 2 = contents
  const plan = sections.map((s) => {
    const chunks: Product[][] = [s.products.slice(0, firstCap)];
    for (let i = firstCap; i < s.products.length; i += cap) chunks.push(s.products.slice(i, i + cap));
    const start = page;
    page += chunks.length;
    return { ...s, chunks, start };
  });

  const thumbs = sections.flatMap((s) => s.products).filter(imageOf);
  const coverThumbs = Array.from({ length: Math.min(8, thumbs.length) }, (_, i) => thumbs[Math.floor(i * thumbs.length / 8)]);
  const month = new Intl.DateTimeFormat('ar', { month: 'long', year: 'numeric', numberingSystem: 'latn' } as any).format(new Date());

  const cover = `
    <section class="page dark">
      <div class="glow"></div>
      <div class="cover">
        <div class="k1">أرض الشرق تقدّم</div>
        <div class="big">${wordmark(true)}</div>
        <div class="ln"></div>
        <div class="k2">كتالوج المنتجات</div>
        <div class="chips"><span><b>${total}</b> منتج</span><span><b>${sections.length}</b> أقسام</span></div>
        <div class="month">${esc(month)}</div>
      </div>
      <div class="strip">${coverThumbs.map((p) => `<div class="t">${img(imageOf(p)!)}</div>`).join('')}</div>
      <div class="cover-url">${CATALOG_SHOP_URL}</div>
    </section>`;

  const contents = `
    <section class="page">
      <div class="hdr"><div class="title"><i class="dot"></i><span class="cname">الأقسام</span></div>${wordmark()}</div>
      <div class="toc">
        ${plan.map((s, i) => `
          <div class="toc-row">
            <span class="toc-idx">${String(i + 1).padStart(2, '0')}</span>
            <span class="toc-name">${esc(s.name)}</span>
            <span class="toc-count">${s.products.length} منتج</span>
            <span class="toc-dots"></span>
            <span class="toc-page">${s.start}</span>
          </div>`).join('')}
      </div>
      ${footer(2)}
    </section>`;

  const body = plan.map((s, si) => s.chunks.map((items, ci) => {
    const pn = s.start + ci;
    const head = ci === 0
      ? `<div class="band">
          <div class="band-idx">${String(si + 1).padStart(2, '0')}</div>
          <div class="band-txt">
            <div class="band-sub">القسم ${si + 1} من ${sections.length}</div>
            <div class="band-name">${esc(s.name)}</div>
            <span class="band-count">${s.products.length} منتج</span>
          </div>
          <div class="band-thumbs">${s.products.filter(imageOf).slice(0, 3).map((p) => `<div class="t">${img(imageOf(p)!)}</div>`).join('')}</div>
        </div>`
      : `<div class="hdr"><div class="title"><i class="dot"></i><span class="cname">${esc(s.name)}</span><span class="pg">${ci + 1} / ${s.chunks.length}</span></div>${wordmark()}</div>`;
    return `
      <section class="page">
        ${head}
        <div class="grid ${ci === 0 ? 'first' : ''}">${items.map((p) => card(p, showPrices)).join('')}</div>
        ${footer(pn)}
      </section>`;
  }).join('')).join('');

  const back = `
    <section class="page dark">
      <div class="glow"></div>
      <div class="cover">
        <div class="k1">${total} منتج في ${sections.length} أقسام</div>
        <div class="order">اطلب الآن</div>
        <div class="k3">كل احتياجاتك في مكان واحد</div>
        <div class="pill">${CATALOG_SHOP_URL}</div>
        <div class="big small">${wordmark(true)}</div>
        <div class="k1">أرض الشرق</div>
      </div>
    </section>`;

  const printScript = autoPrint ? `
  <script>
    Promise.all([document.fonts.ready].concat([].map.call(document.images, function (im) {
      return im.complete ? 0 : new Promise(function (r) { im.onload = im.onerror = r; });
    }))).then(function () { setTimeout(function () { window.print(); }, 300); });
  </script>` : '';

  const C = COLORS;
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>كتالوج فود بوكس</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #d6d3d1; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif; color: ${C.ink}; direction: rtl; }
    .page { width: 210mm; height: 297mm; margin: 0 auto 8mm; position: relative; overflow: hidden; background: ${C.surface};
            padding: 12mm 11mm 0; break-after: page; page-break-after: always; display: flex; flex-direction: column; }
    @media print { html, body { background: none; } .page { margin: 0; } }
    .wm { font-weight: 700; white-space: nowrap; font-size: 20px; }
    .wm .f { color: ${C.brand}; }

    /* cover + back */
    .dark { background: ${C.ink}; color: #fff; padding: 0; }
    .glow { position: absolute; width: 190mm; height: 190mm; left: 10mm; top: 40mm; border-radius: 50%;
            background: radial-gradient(circle, rgba(227,101,35,.5) 0%, rgba(227,101,35,.16) 40%, rgba(227,101,35,0) 70%); }
    .cover { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .k1 { font-weight: 600; font-size: 15px; color: rgba(255,255,255,.7); }
    .big .wm { font-size: 92px; line-height: 1.25; }
    .big.small .wm { font-size: 44px; }
    .big.small { margin-top: 26mm; }
    .ln { width: 56px; height: 4px; border-radius: 4px; background: ${C.brand}; margin: 10px 0 18px; }
    .k2 { font-weight: 700; font-size: 30px; }
    .chips { display: flex; gap: 10px; margin-top: 14px; }
    .chips span { font-weight: 600; font-size: 15px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.07); border-radius: 999px; padding: 5px 16px; }
    .chips b { color: ${C.brand}; }
    .month { margin-top: 12px; font-size: 13px; color: rgba(255,255,255,.55); }
    .strip { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; padding: 0 14mm; margin-bottom: 12mm; }
    .strip .t, .band-thumbs .t { background: #fff; border-radius: 14px; padding: 8px; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; }
    .strip img, .band-thumbs img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .cover-url { position: relative; text-align: center; font-weight: 600; font-size: 14px; color: rgba(255,255,255,.6); margin-bottom: 9mm; direction: ltr; }
    .order { font-weight: 700; font-size: 64px; line-height: 1.3; margin: 6px 0 4px; }
    .k3 { font-weight: 600; font-size: 18px; color: rgba(255,255,255,.85); margin-bottom: 22px; }
    .pill { background: ${C.brandFill}; color: #fff; font-weight: 700; font-size: 22px; border-radius: 999px; padding: 10px 30px; direction: ltr; }

    /* headers */
    .hdr { display: flex; align-items: center; justify-content: space-between; height: 14mm; margin-bottom: 6mm; }
    .hdr .title { display: flex; align-items: center; gap: 8px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: ${C.brand}; display: inline-block; }
    .cname { font-weight: 700; font-size: 26px; white-space: nowrap; }
    .pg { font-weight: 600; font-size: 12px; color: ${C.muted}; background: #fff; border: 1px solid ${C.line}; border-radius: 999px; padding: 2px 10px; direction: ltr; }
    .band { position: relative; background: ${C.brand}; color: #fff; border-radius: 18px; height: 62mm; margin-bottom: 6mm; overflow: hidden;
            display: flex; align-items: center; padding: 0 9mm; gap: 6mm; }
    .band-idx { position: absolute; left: 8mm; top: -4mm; font-weight: 700; font-size: 120px; line-height: 1; color: transparent;
                -webkit-text-stroke: 1.5px rgba(255,255,255,.45); direction: ltr; }
    .band-txt { position: relative; flex: 1; }
    .band-sub { font-weight: 600; font-size: 13px; opacity: .85; }
    .band-name { font-weight: 700; font-size: 38px; line-height: 1.3; margin: 2px 0 8px; }
    .band-count { font-weight: 600; font-size: 13px; background: rgba(28,25,23,.18); border-radius: 999px; padding: 3px 14px; }
    .band-thumbs { position: relative; display: flex; gap: 3mm; align-self: flex-end; margin-bottom: 7mm; }
    .band-thumbs .t { width: 27mm; box-shadow: 0 6px 16px rgba(80,30,5,.25); }

    /* product grid */
    .grid { display: grid; grid-template-columns: repeat(${COLS}, 1fr); grid-template-rows: repeat(${PAGE_ROWS}, 1fr); gap: 4mm; flex: 1; min-height: 0; }
    .grid.first { grid-template-rows: repeat(${FIRST_PAGE_ROWS}, 1fr); }
    .card { background: #fff; border-radius: 14px; border: 1px solid ${C.line}; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }
    .card .im { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 3mm; }
    .card .im img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .card .ph { width: 100%; height: 100%; background: ${C.brandTint}; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .card .body { border-top: 1px solid ${C.line}; padding: 2.5mm 3mm 3mm; display: flex; flex-direction: column; gap: 2mm; }
    .card .nm { font-weight: 600; font-size: 12px; line-height: 1.45; height: 2.9em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .card .row { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
    .card .price { font-weight: 700; font-size: 13px; color: ${C.brandText}; white-space: nowrap; }
    .card .price s { color: ${C.faint}; font-weight: 400; font-size: 10px; }
    .card .unit { font-weight: 600; font-size: 10px; color: ${C.brandText}; background: ${C.brandTint}; border-radius: 999px; padding: 2px 9px; white-space: nowrap; margin-inline-start: auto; }

    /* contents */
    .toc { display: flex; flex-direction: column; gap: 3mm; flex: 1; }
    .toc-row { display: flex; align-items: center; gap: 4mm; background: #fff; border: 1px solid ${C.line}; border-radius: 14px; padding: 4mm 6mm; }
    .toc-idx { font-weight: 700; font-size: 22px; color: ${C.brand}; direction: ltr; width: 12mm; }
    .toc-name { font-weight: 700; font-size: 17px; }
    .toc-count { font-weight: 600; font-size: 11px; color: ${C.brandText}; background: ${C.brandTint}; border-radius: 999px; padding: 2px 10px; }
    .toc-dots { flex: 1; border-bottom: 2px dotted ${C.line}; }
    .toc-page { font-weight: 700; font-size: 16px; color: ${C.muted}; }

    .foot { display: flex; align-items: center; justify-content: space-between; height: 13mm; font-size: 11px; font-weight: 600; color: ${C.muted}; }
    .foot .wm { font-size: 12px; }
    .foot .url { direction: ltr; }
    .foot .pn { background: ${C.ink}; color: #fff; border-radius: 999px; min-width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; padding: 0 6px; }
  </style>
</head>
<body>
  ${cover}
  ${contents}
  ${body}
  ${back}
  ${printScript}
</body>
</html>`;
}
