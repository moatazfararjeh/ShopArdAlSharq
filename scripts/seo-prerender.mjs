// Build-time SEO for the web export (runs after `expo export`, see Dockerfile).
//
// The web app is a single-page app: every URL is served the same empty
// index.html, so Google, WhatsApp and Facebook see no product name, image or
// price. This script, using the public (anon) Supabase API:
//   1. fixes the shared index.html (Arabic lang/dir, real title + description)
//   2. writes dist/products/<id>.html — the same app shell plus that product's
//      title, description, Open Graph tags and schema.org Product JSON-LD
//   3. writes dist/sitemap.xml with every product page and its images
// The app bundle is untouched: the page still boots the normal SPA.
//
// Never fails the build: if Supabase is unreachable it logs and exits 0,
// leaving the plain SPA export in place.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const DIST       = process.argv[2] ?? 'dist';
const SITE       = (process.env.EXPO_PUBLIC_APP_URL || 'https://shop.ardalsharq.com').replace(/\/+$/, '');
const SB_URL     = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SB_KEY     = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const CURRENCY   = 'JOD';
const SITE_NAME  = 'فود بوكس - أرض الشرق';
const SITE_TITLE = 'أرض الشرق - مجمدات ومواد غذائية بالجملة';
const SITE_DESC  = 'أرض الشرق - مورد وموزع مجمدات ومواد غذائية بالجملة في الأردن. دجاج ولحوم وخضار مجمدة، أجبان وزبدة، ومنتجات نبيل والوادي والوطنية وأمريكانا وإكرام. توريد سوبرماركت ومطاعم وبقالات بأسعار منافسة.';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// JSON inside <script> must not be able to close the tag
const jsonLd = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

async function fetchProducts() {
  const select = 'id,name_ar,name_en,description_ar,price,discount_price,stock_quantity,is_available,updated_at,product_images(url,sort_order),brands(name),categories(name_ar)';
  const all = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(
      `${SB_URL}/rest/v1/products?select=${select}&is_available=eq.true&order=updated_at.desc`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Range: `${from}-${from + 999}` } },
    );
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    const page = await res.json();
    all.push(...page);
    if (page.length < 1000) break;
  }
  return all;
}

function productMeta(p) {
  const images = (p.product_images ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((i) => i.url)
    .filter(Boolean);
  const brand    = p.brands?.name ?? null;
  const category = p.categories?.name_ar ?? null;
  const price    = Number(p.discount_price && p.discount_price < p.price ? p.discount_price : p.price);
  const url      = `${SITE}/products/${p.id}`;
  const title    = `${p.name_ar}${brand ? ` - ${brand}` : ''} | فود بوكس`;
  const desc     = p.description_ar?.trim()
    || [
      `اطلب ${p.name_ar}`,
      brand ? `من ${brand}` : null,
      category ? `ضمن قسم ${category}` : null,
      `بسعر ${price.toFixed(3)} د.أ من فود بوكس - أرض الشرق، توصيل في الأردن.`,
    ].filter(Boolean).join(' ');
  return { images, brand, category, price, url, title, desc };
}

function productHead(p, m) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name_ar,
    ...(p.name_en ? { alternateName: p.name_en } : {}),
    description: m.desc,
    image: m.images,
    sku: p.id,
    ...(m.brand ? { brand: { '@type': 'Brand', name: m.brand } } : {}),
    ...(m.category ? { category: m.category } : {}),
    offers: {
      '@type': 'Offer',
      url: m.url,
      priceCurrency: CURRENCY,
      price: m.price.toFixed(3),
      availability: p.stock_quantity === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  };
  const img = m.images[0];
  return [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.desc)}" />`,
    `<link rel="canonical" href="${esc(m.url)}" />`,
    `<meta property="og:type" content="product" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:locale" content="ar_JO" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.desc)}" />`,
    `<meta property="og:url" content="${esc(m.url)}" />`,
    img ? `<meta property="og:image" content="${esc(img)}" />` : '',
    img ? `<meta property="og:image:alt" content="${esc(p.name_ar)}" />` : '',
    `<meta property="product:price:amount" content="${m.price.toFixed(3)}" />`,
    `<meta property="product:price:currency" content="${CURRENCY}" />`,
    `<meta name="twitter:card" content="${img ? 'summary_large_image' : 'summary'}" />`,
    `<script type="application/ld+json">${jsonLd(ld)}</script>`,
  ].filter(Boolean).join('\n    ');
}

// Plain-HTML copy of the product for crawlers that do not run JavaScript.
// It is the same content the app renders, so it is not cloaking.
function productNoscript(p, m) {
  return `<noscript><main dir="rtl">`
    + `<h1>${esc(p.name_ar)}</h1>`
    + m.images.map((u) => `<img src="${esc(u)}" alt="${esc(p.name_ar)}" width="600" />`).join('')
    + `<p>${esc(m.desc)}</p>`
    + `<p>السعر: ${m.price.toFixed(3)} د.أ</p>`
    + `<a href="${esc(SITE)}/">تسوق من فود بوكس</a>`
    + `</main></noscript>`;
}

// Replace the template's <title> and description, set Arabic lang/dir
function withHead(shell, headHtml, bodyExtra = '') {
  let html = shell
    .replace(/<html[^>]*>/i, '<html lang="ar" dir="rtl">')
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/gi, '')
    .replace(/<\/head>/i, `    ${headHtml}\n  </head>`);
  if (bodyExtra) html = html.replace(/<body([^>]*)>/i, `<body$1>\n    ${bodyExtra}`);
  return html;
}

function sitemap(products) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    `<url><loc>${SITE}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    `<url><loc>${SITE}/catalog</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`,
    ...products.map(({ p, m }) =>
      `<url><loc>${esc(m.url)}</loc>`
      + (p.updated_at ? `<lastmod>${p.updated_at.slice(0, 10)}</lastmod>` : '')
      + m.images.map((u) => `<image:image><image:loc>${esc(u)}</image:loc></image:image>`).join('')
      + `</url>`),
  ];
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
    + urls.join('\n') + '\n</urlset>\n';
}

async function main() {
  const indexPath = path.join(DIST, 'index.html');
  const shell = await readFile(indexPath, 'utf8');

  // 1. Site-wide defaults on the shared shell
  const siteHead = [
    `<title>${esc(SITE_TITLE)}</title>`,
    `<meta name="description" content="${esc(SITE_DESC)}" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:title" content="${esc(SITE_TITLE)}" />`,
    `<meta property="og:description" content="${esc(SITE_DESC)}" />`,
    `<meta property="og:locale" content="ar_JO" />`,
  ].join('\n    ');
  await writeFile(indexPath, withHead(shell, siteHead));

  if (!SB_URL || !SB_KEY) {
    console.warn('[seo] EXPO_PUBLIC_SUPABASE_URL / ANON_KEY missing — skipped product pages and sitemap');
    return;
  }

  let products;
  try {
    products = await fetchProducts();
  } catch (err) {
    console.warn(`[seo] could not load products — skipped product pages and sitemap: ${err.message}`);
    return;
  }

  // 2. One HTML page per product
  await mkdir(path.join(DIST, 'products'), { recursive: true });
  const entries = products.map((p) => ({ p, m: productMeta(p) }));
  for (const { p, m } of entries) {
    await writeFile(
      path.join(DIST, 'products', `${p.id}.html`),
      withHead(shell, productHead(p, m), productNoscript(p, m)),
    );
  }

  // 3. Sitemap with images
  await writeFile(path.join(DIST, 'sitemap.xml'), sitemap(entries));

  const imgCount = entries.reduce((n, e) => n + e.m.images.length, 0);
  console.log(`[seo] wrote ${entries.length} product pages and sitemap.xml (${imgCount} images) for ${SITE}`);
}

main().catch((err) => {
  console.warn(`[seo] failed, leaving the plain SPA export: ${err.stack ?? err}`);
});
