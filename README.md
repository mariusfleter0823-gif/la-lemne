# La Lemne

Site de prezentare și catalog de material lemnos.

Site public: https://lalemne.ro/

HTML, CSS și JavaScript. Cloudflare Pages publică ramura `main`, folosind `node cloudflare-build.cjs` și directorul rezultat `cloudflare-dist`. Copia GitHub Pages poate folosi în continuare fișierele din rădăcină.

Calculatorul de lemn pentru acoperiș este la `/calculator-lemn-acoperis`. Refolosește meniul, footerul, consent/tracking și componentele FAQ existente (`faq.css` / `faq.js`). Stilurile calculatorului sunt limitate la această pagină. Modulele `roof-math.mjs`, `roof-scene.mjs` și `roof-render.mjs` păstrează calculele și desenul prototipului verificat; nu dimensionează structura și nu înlocuiesc proiectul. Pagina explică ipotezele, elementele excluse și faptul că La Lemne furnizează materialul. Publicarea include automat pagina în sitemap.

Fotografiile, identitatea vizuală și conținutul aparțin titularilor lor. Publicarea repository-ului nu acordă o licență de reutilizare a acestor materiale.
