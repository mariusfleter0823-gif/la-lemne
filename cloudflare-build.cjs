// Cloudflare Pages: node cloudflare-build.cjs; output directory: cloudflare-dist.
// Also accepts the GitHub Pages copy, whose links carry /la-lemne/.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = __dirname;
const out = path.join(root, 'cloudflare-dist');
const origin = 'https://lalemne.ro';
fs.mkdirSync(out, { recursive: true });
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });
const pages = [];
for (const name of fs.readdirSync(root)) {
  if (!/\.(html|css|js|json)$/.test(name)) continue;
  let text = fs.readFileSync(path.join(root, name), 'utf8').replaceAll('/la-lemne/', '/');
  if (name.endsWith('.html')) {
    pages.push(name);
    const url = origin + '/' + (name === 'index.html' ? '' : name);
    if (/<link\b[^>]*rel="canonical"/.test(text)) {
      text = text.replace(/(<link\b[^>]*rel="canonical"[^>]*href=")[^"]*(")/g, '$1' + url + '$2');
    } else text = text.replace('</head>', '<link rel="canonical" href="' + url + '"></head>');
    text = text.replace(/(<meta\b[^>]*property="og:url"[^>]*content=")[^"]*(")/g, '$1' + url + '$2');
    text = text.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (_, source) => {
      const absolute = value => {
        if (typeof value === 'string') return value.startsWith('/') ? origin + value : value;
        if (Array.isArray(value)) return value.map(absolute);
        if (value && typeof value === 'object') {
          for (const key of Object.keys(value)) value[key] = absolute(value[key]);
        }
        return value;
      };
      return '<script type="application/ld+json">' + JSON.stringify(absolute(JSON.parse(source))) + '</script>';
    });
  }
  fs.writeFileSync(path.join(out, name), text);
}
// Hash the transformed scripts, so updates invalidate browser caches correctly.
for (const name of pages) {
  const target = path.join(out, name);
  const html = fs.readFileSync(target, 'utf8').replace(/((?:src|href)=")([^"?]+\.(?:js|css))(?:\?v=[^"]*)?"/g, (match, prefix, url) => {
    const local = path.join(out, url.replace(/^\//, ''));
    if (!fs.existsSync(local)) return match;
    return prefix + url + '?v=' + crypto.createHash('sha256').update(fs.readFileSync(local)).digest('hex').slice(0, 10) + '"';
  });
  fs.writeFileSync(target, html);
}
fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: ' + origin + '/sitemap.xml\n');
fs.writeFileSync(path.join(out, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + pages.map(name => '<url><loc>' + origin + '/' + (name === 'index.html' ? '' : name) + '</loc></url>').join('') + '</urlset>\n');
fs.writeFileSync(path.join(out, '_redirects'), '/la-lemne/* /:splat 301\nhttps://www.lalemne.ro/* https://lalemne.ro/:splat 301\n');
console.log('Prepared ' + pages.length + ' pages for ' + origin);
