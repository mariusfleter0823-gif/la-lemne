// Cloudflare Pages: node cloudflare-build.cjs; output directory: cloudflare-dist.
// Also accepts the GitHub Pages copy, whose links carry /la-lemne/.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = __dirname;
const out = path.join(root, 'cloudflare-dist');
const origin = 'https://lalemne.ro';
const pageUrl = name => origin + (name === 'index.html' ? '/' : '/' + name.replace(/\.html$/, ''));
fs.mkdirSync(out, { recursive: true });
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });
const pages = [];
const htmlFiles = [];
for (const name of fs.readdirSync(root)) {
  if (!/\.(html|css|js|json|txt)$/.test(name)) continue;
  let text = fs.readFileSync(path.join(root, name), 'utf8').replaceAll('/la-lemne/', '/');
  if (name.endsWith('.html')) {
    htmlFiles.push(name);
    if (name !== '404.html') {
    pages.push(name);
    const url = pageUrl(name);
    if (/<link\b[^>]*rel="canonical"/.test(text)) {
      text = text.replace(/(<link\b[^>]*rel="canonical"[^>]*href=")[^"]*(")/g, '$1' + url + '$2');
    } else text = text.replace('</head>', '<link rel="canonical" href="' + url + '"></head>');
    text = text.replace(/(<meta\b[^>]*property="og:url"[^>]*content=")[^"]*(")/g, '$1' + url + '$2');
    text = text.replace('</head>', '<link rel="describedby" href="/llms.txt" type="text/plain"><link rel="ard" href="/.well-known/ard.json" type="application/json"></head>');
    text = text.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (_, source) => {
      const absolute = value => {
        if (typeof value === 'string') {
          const resolved = value.startsWith('/') ? origin + value : value;
          return resolved.startsWith(origin + '/') ? resolved.replace(/\.html(?=$|[?#])/, '') : resolved;
        }
        if (Array.isArray(value)) return value.map(absolute);
        if (value && typeof value === 'object') {
          for (const key of Object.keys(value)) value[key] = absolute(value[key]);
        }
        return value;
      };
      return '<script type="application/ld+json">' + JSON.stringify(absolute(JSON.parse(source))) + '</script>';
    });
    }
  }
  fs.writeFileSync(path.join(out, name), text);
}
// Hash the transformed scripts, so updates invalidate browser caches correctly.
for (const name of htmlFiles) {
  const target = path.join(out, name);
  const html = fs.readFileSync(target, 'utf8').replace(/((?:src|href)=")([^"?]+\.(?:js|css))(?:\?v=[^"]*)?"/g, (match, prefix, url) => {
    const local = path.join(out, url.replace(/^\//, ''));
    if (!fs.existsSync(local)) return match;
    return prefix + url + '?v=' + crypto.createHash('sha256').update(fs.readFileSync(local)).digest('hex').slice(0, 10) + '"';
  });
  fs.writeFileSync(target, html);
}
fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: ' + origin + '/sitemap.xml\nAgentmap: ' + origin + '/.well-known/ard.json\n');
fs.writeFileSync(path.join(out, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + pages.map(name => '<url><loc>' + pageUrl(name) + '</loc></url>').join('') + '</urlset>\n');
// Publish a read-only catalog from the same confirmed data used by the product grid.
// Do not expose drawing-only sample widths or imply real-time stock availability.
const catalogHtml = fs.readFileSync(path.join(root, 'produse.html'), 'utf8');
const catalogMatch = catalogHtml.match(/<script id="catalog-data" type="application\/json">([\s\S]*?)<\/script>/);
if (!catalogMatch) throw new Error('Product catalog data is missing');
const catalog = JSON.parse(catalogMatch[1]);
const publicCatalog = {
  name: 'La Lemne — catalog de material lemnos',
  website: origin,
  language: 'ro',
  description: 'Catalog public de produse. Disponibilitatea și prețul final se confirmă la ofertare; acesta nu este un flux de stocuri în timp real.',
  measurementUnits: { sections: 'cm', widths: 'cm', thicknesses: 'cm', lengths: 'm' },
  products: catalog.map(product => ({
    name: product.title,
    url: pageUrl(product.slug + '.html'),
    collection: product.collection,
    ...(product.uses ? { uses: product.uses } : {}),
    ...(product.widths ? { widths: product.widths } : {}),
    ...(product.heights ? { thicknesses: product.heights } : {}),
    ...(product.sections ? { sections: Object.entries(product.sections).flatMap(([width, heights]) => heights.map(height => ({ width: Number(width), height }))) } : {}),
    ...(product.lengths ? { lengths: product.lengths } : {}),
    ...(product.kind === 'unedged' ? { variableWidth: true } : {}),
    ...(product.price ? { indicativePrice: { min: product.price.min, max: product.price.max, currency: 'RON', unit: product.price.unit, negotiable: true, ...(product.price.saleLabel ? { pack: product.price.saleLabel } : {}) } } : {})
  }))
};
fs.writeFileSync(path.join(out, 'catalog.json'), JSON.stringify(publicCatalog, null, 2) + '\n');
const discovery = { entries: [{
  '@context': 'https://agenticresourcediscovery.org/context/v1',
  identifier: 'urn:air:lalemne.ro:catalog:produse',
  displayName: 'Catalogul de produse La Lemne',
  type: 'application/json',
  url: origin + '/catalog.json',
  description: 'Catalog JSON public, doar pentru citire, cu cele nouă produse La Lemne, dimensiuni și prețuri orientative. Nu acceptă comenzi și nu reprezintă stocul în timp real.',
  representativeQueries: [
    'Ce tipuri de cherestea și grinzi comercializează La Lemne?',
    'Ce secțiuni și lungimi de grinzi sunt incluse în catalogul La Lemne?',
    'Care sunt dimensiunile și unitățile de preț pentru scândură, dulapi, leațuri și lambriu?'
  ]
}] };
fs.mkdirSync(path.join(out, '.well-known'), { recursive: true });
fs.writeFileSync(path.join(out, '.well-known', 'ard.json'), JSON.stringify(discovery, null, 2) + '\n');
fs.writeFileSync(path.join(out, '_headers'), '/llms.txt\n  Content-Type: text/plain; charset=utf-8\n/.well-known/ard.json\n  Content-Type: application/json; charset=utf-8\n/catalog.json\n  Content-Type: application/json; charset=utf-8\n');
fs.writeFileSync(path.join(out, '_redirects'), '/la-lemne/* /:splat 301\n');
console.log('Prepared ' + pages.length + ' pages for ' + origin);
