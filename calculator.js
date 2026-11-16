import { DEFAULTS, LIMITS, SHAPES, calculate, validate, restoreSettings } from './roof-math.mjs';
import { buildRoofScene, LAYERS } from './roof-scene.mjs';
import { renderRoofImage } from './roof-render.mjs';

const $ = id => document.getElementById(id);
const form = $('roof-form');
const nf = (n, digits = 1) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: digits }).format(n);
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>';
let values = { ...DEFAULTS }, result, yaw = -.62, mode = 'layers', drag;
let renderFrame = 0;
function scheduleRoofDraw() { if (!renderFrame) renderFrame = requestAnimationFrame(() => { renderFrame = 0; drawRoof(); }); }
const visible = { rafters: true, boards: true, counter: true, battens: true };

function readForm() {
  const data = new FormData(form);
  return { ...Object.fromEntries(Object.keys(LIMITS).map(k => [k, Number(data.get(k) === '' ? NaN : data.get(k))])), shape: data.get('shape'), section: data.get('section'), hipSection: data.get('hipSection'), valleySection: data.get('valleySection'), ...Object.fromEntries(['boards', 'battens', 'counter'].map(k => [k, data.has(k)])) };
}
function setForm(v) {
  for (const [key, val] of Object.entries(v)) {
    if (key === 'shape') form.querySelector(`input[name="shape"][value="${val}"]`).checked = true;
    else if (typeof val === 'boolean') $(key).checked = val;
    else $(key).value = val;
  }
  $('pitch-range').value = v.pitch;
}
function rowText(r) {
  if (r.stockGroups) return r.volume === null ? `Lungime geometrică până la ${nf(r.cutLength, 2)} m; verificare necesară` : `${r.stockGroups.map(g => `${g.count} buc. × ${g.length} m`).join(' / ')} · ${r.section.replace('x', ' × ')} cm`;
  if (r.id === 'boards') return `${r.count} buc. · 2,5 × 20 × 400 cm`;
  return `${r.count} buc. · 3 × 5 × 400 cm`;
}
function quantityText(r) { return r.volume === null ? 'De confirmat' : r.packs ? `${r.packs} pachete` : `${nf(r.volume, 3)} m³`; }
function rangeText(price) { return price ? `${nf(price[0], 0)}–${nf(price[1], 0)} lei` : 'De confirmat'; }

function update() {
  const next = readForm(), errors = validate(next), invalid = Object.keys(errors).length > 0;
  $('lshape-fields').hidden = next.shape !== 'lshape';
  form.classList.toggle('is-lshape',next.shape==='lshape');
  $('wing-a-heading').hidden = next.shape !== 'lshape';
  $('length-label').textContent = next.shape === 'lshape' ? 'Lungime A' : 'Lungime';
  $('width-label').textContent = next.shape === 'lshape' ? 'Lățime A' : 'Lățime';
  $('hip-section-field').hidden = !['hip','lshape'].includes(next.shape);
  $('valley-section-field').hidden = next.shape !== 'lshape';
  $('shape-help').textContent = next.shape === 'lshape' ? 'Două aripi cu dimensiuni independente și aceeași pantă. Lățimi diferite înseamnă coame la înălțimi diferite, unite printr-un racord.' : next.shape === 'hip' ? `${next.length === next.width ? 'Bază pătrată: patru fețe triunghiulare, fără coamă orizontală.' : 'Bază dreptunghiulară: două trapeze și două triunghiuri.'} Toate au aceeași pantă.` : next.shape === 'gable' ? 'Două pante egale, cu coama la mijloc.' : 'Panta se întinde pe toată lățimea.';
  const directions = {
    gable: 'Lungimea urmează coama; lățimea trece de la o streașină la cealaltă.',
    mono: 'Lungimea urmează streașina; lățimea este distanța orizontală în direcția pantei.',
    hip: 'Introdu cele două laturi ale bazei. Coama se așază automat pe latura mai lungă.',
    lshape: 'Măsoară separat aripile A și B, ca în schiță. Lungimile includ colțul comun.'
  };
  $('direction-help').textContent = directions[next.shape];
  const units = { length:'m', width:'m', wingLength:'m', wingWidth:'m', pitch:'°', spacing:'cm', battenSpacing:'cm', waste:'%' };
  for (const key of Object.keys(LIMITS)) {
    $(key).setAttribute('aria-invalid', String(Boolean(errors[key])));
    const [min,max] = LIMITS[key];
    $(`error-${key}`).textContent = errors[key]
      ? (errors[key].startsWith('Introdu o valoare') ? `Introdu o valoare între ${min} și ${max} ${units[key]}.` : errors[key].replace(/(\d+)\.(\d+)/g,'$1,$2')) : '';
  }
  $('estimate-link').hidden = invalid;
  $('settings-summary').textContent = ['spacing','battenSpacing','waste'].some(key => errors[key]) ? 'Verifică valorile marcate mai jos.' : `Căpriori ${next.section.replace('x',' × ')} cm · max. ${nf(next.spacing)} cm între axe · rezervă ${nf(next.waste)}%`;
  if (['spacing','battenSpacing','waste'].some(key => errors[key])) form.querySelector('.advanced').open = true;
  document.body.classList.toggle('has-errors', invalid);
  $('print').disabled = invalid;
  $('whatsapp').setAttribute('aria-disabled', String(Boolean(invalid)));
  $('whatsapp').tabIndex = invalid ? -1 : 0;
  if (invalid) {
    $('form-status').textContent = 'Corectează câmpurile marcate pentru a actualiza estimarea. Desenul și cantitățile păstrează ultimul calcul valid.';
    $('whatsapp').removeAttribute('href');
    return;
  }
  if (values.shape !== next.shape) yaw = next.shape === 'lshape' ? .53 : -.62;
  values = next; result = calculate(values);
  $('pitch-range').value = values.pitch;
  $('pitch-range').setAttribute('aria-valuetext', `${nf(values.pitch)} grade`);
  $('form-status').textContent = result.complete ? '' : 'Un căprior comun sau diagonal depășește lungimea de catalog de 10 m. Necesarul de grinzi și totalul se confirmă pe baza proiectului; nu presupunem îmbinări.';
  $('area').textContent = nf(result.area);
  $('rafter').textContent = nf(result.rafter, 2);
  $('rise').textContent = nf(result.rise, 2);
  const planText = values.shape==='lshape' ? `A: ${nf(values.length)} × ${nf(values.width)} m · B: ${nf(values.wingLength)} × ${nf(values.wingWidth)} m` : `${nf(values.length)} × ${nf(values.width)} m`;
  $('geometry-note').textContent = `${planText}, cu streșini incluse · pantă ${nf(values.pitch)}° (${nf(result.pitchPercent)}%). ${values.shape === 'lshape' ? `Înălțime coamă A ${nf(result.riseA,2)} m / B ${nf(result.riseB,2)} m · muchie ${nf(result.hipLength,2)} m · dolie ${nf(result.valleyLength,2)} m${result.transitionLength>1e-9 ? ` · racord ${nf(result.transitionLength,2)} m` : ""}. Fără lucarne sau goluri.` : `${values.shape === 'hip' ? `Coamă ${nf(result.ridge, 2)} m · 4 diagonale de ${nf(result.hipLength, 2)} m. ` : ''}Fără lucarne, dolii sau goluri.`}`;
  $('materials-subtitle').textContent = `Pentru ${nf(result.area)} m² pe pante · ${nf(values.waste)}% rezervă inclusă · rotunjit la bucăți și pachete. Nu reprezintă întreaga șarpantă.`;
  $('wood-volume').textContent = result.complete ? nf(result.volume, 2) : '—';
  $('total-price').textContent = rangeText(result.price);
  $('materials').innerHTML = result.rows.map(r => `<div class="material-row"><div class="material-name"><img src="assets/${r.image}" alt="" width="53" height="58" loading="lazy"><div><strong>${r.name}</strong><a href="/la-lemne/${r.slug}.html" target="_blank" rel="noopener">Vezi produsul ${arrow}</a></div></div><div class="quantity"><strong>${quantityText(r)}</strong><span>${rowText(r)}</span></div><div class="material-cost">${rangeText(r.cost)}<small>${nf(r.price[0], 0)}–${nf(r.price[1], 0)} lei/${r.unit}</small></div></div>`).join('');
  $('formula').textContent = `Suprafață: ${values.shape==='lshape' ? `(${nf(values.length)} × ${nf(values.width)} + ${nf(values.wingLength)} × ${nf(values.wingWidth)} − ${nf(values.width)} × ${nf(values.wingWidth)})` : `${nf(values.length)} × ${nf(values.width)}`} ÷ cos(${nf(values.pitch)}°) = ${nf(result.area, 2)} m². ${values.shape==='lshape' ? 'Zona comună a aripilor este numărată o singură dată. ' : ''}Modelul are ${result.rafters} căpriori ${['hip','lshape'].includes(values.shape) ? `comuni și scurți, de până la ${nf(result.rafter, 2)} m, plus ${values.shape==='lshape'?`o muchie de ${nf(result.hipLength,2)} m, o dolie de ${nf(result.valleyLength,2)} m${result.transitionLength>1e-9?` și un racord de ${nf(result.transitionLength,2)} m`:''}`:`4 diagonali de ${nf(result.hipLength,2)} m`}` : `de ${nf(result.rafter, 2)} m`}. Pasul efectiv maxim între axele căpriorilor, măsurat în direcția streșinii, este ${nf(result.actualSpacing)} cm (limita introdusă: ${nf(values.spacing)} cm). Rezerva de ${nf(values.waste)}% se aplică separat fiecărei grupe de lungimi comerciale, înainte de rotunjire la bucăți.`;
  const message = [
    'Bună ziua! Doresc o ofertă pentru materialele estimate în calculatorul La Lemne.',
    `Acoperiș ${SHAPES[values.shape]}: ${planText} (cu streșini), pantă ${nf(values.pitch)}°, suprafață ${nf(result.area)} m².`,
    `Valori de verificat cu proiectul: căpriori ${values.section.replace('x', ' × ')} cm, pas max. ${values.spacing} cm; leațuri la ${values.battenSpacing} cm; rezervă ${values.waste}%.`,
    ...result.rows.map(r => `${r.name}: ${quantityText(r)}; ${rowText(r)}.`),
    `Cost estimativ materiale selectate: ${rangeText(result.price)} (negociabil).`,
    'Nu este lista completă a structurii. Panele, cosoroabele, popii, cleștii, contravântuirile și îmbinările se confirmă din proiect.',
    'Localitatea de livrare: __. Pot trimite și proiectul pentru verificarea listei.'
  ].join('\n');
  $('whatsapp').href = `https://wa.me/40746820092?text=${encodeURIComponent(message)}`;
  try { localStorage.setItem('la-lemne-roof-prototype-v1', JSON.stringify(values)); } catch {}
  drawRoof();
}

// On-demand depth rendering; the SVG keeps accessible text, dimensions and print output.
function drawRoof() {
  if (!result) return;
  const { length: L, width: W, shape } = values, H = result.rise;
  const scene = buildRoofScene(values, result, mode), z = scene.base;
  for (const input of document.querySelectorAll('[data-visible]')) {
    const included = scene.enabled.includes(input.dataset.visible);
    input.checked = included && visible[input.dataset.visible];
    input.disabled = mode === 'surface' || !included;
    input.closest('label').title = included ? 'Afișează sau ascunde în desen; cantitatea nu se schimbă.' : 'Material neinclus. Îl poți adăuga din Materiale incluse în estimare.';
  }
  const shown = scene.enabled.filter(key => visible[key]);
  $('layer-note').textContent = mode === 'surface' ? 'Suprafața geometrică. Vezi materialele în „Pe straturi” sau „Asamblat”.' : shown.length === 0 ? 'Niciun material vizibil. Bifează un strat pentru a-l afișa; cantitățile rămân aceleași.' : mode === 'layers' ? 'Straturi depărtate pentru vizualizare. Bifele schimbă doar desenul, nu cantitățile.' : 'Materialele sunt suprapuse ca în acoperiș. Poți ascunde straturi ca să vezi dedesubt. Fără folie sau învelitoare; nu este un plan de montaj.';
  const vw = Math.max(280, $('roof-svg').clientWidth), vh = Math.max(260, $('roof-svg').clientHeight);
  $('roof-svg').setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  const c = Math.cos(yaw), s = Math.sin(yaw), elevation = .49;
  const raw = ([x, y, h]) => [x * c - y * s, (x * s + y * c) * Math.sin(elevation) - h * Math.cos(elevation), (x * s + y * c) * Math.cos(elevation) + h * Math.sin(elevation)];
  const ground = scene.footprint || [[-L / 2, -W / 2, 0], [L / 2, -W / 2, 0], [L / 2, W / 2, 0], [-L / 2, W / 2, 0]];
  const edgeZ = scene.edgeZ;
  const corners = ground.map(([x, y]) => [x, y, edgeZ(x, y)]);
  const peaks = scene.peaks;
  const rawPoints = [...ground, ...corners, ...peaks, ...(mode === 'surface' ? [] : scene.members.flatMap(m => m.points))].map(raw);
  const bounds = [Math.min(...rawPoints.map(p => p[0])), Math.max(...rawPoints.map(p => p[0])), Math.min(...rawPoints.map(p => p[1])), Math.max(...rawPoints.map(p => p[1]))];
  const labelSpace = vw > 650 && mode !== 'surface' ? 100 : 0;
  const scale = Math.min((vw - 82 - labelSpace) / (bounds[1] - bounds[0]), (vh - 145) / (bounds[3] - bounds[2]));
  const midX = (bounds[0] + bounds[1]) / 2, midY = (bounds[2] + bounds[3]) / 2;
  const project = p => { const t = raw(p); return [vw / 2 - labelSpace / 2 + (t[0] - midX) * scale, vh / 2 + 6 + (t[1] - midY) * scale, t[2]]; };
  const layers = [], envelope = [];
  const poly = (points, fill, opacity = 1, stroke = '#557654', weight = .8, layer = '') => (layer ? layers : envelope).push({ points, fill, opacity, stroke, weight, layer });
  const line = (a, b, color = '#819780', width = 1, dash = '') => `<line x1="${project(a)[0]}" y1="${project(a)[1]}" x2="${project(b)[0]}" y2="${project(b)[1]}" stroke="${color}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  // Faint building envelope provides scale without pretending to specify wall construction.
  poly(ground, '#dce8d5', .55, '#b9cbb2', .7);
  for (let i = 0; i < ground.length; i++) {
    const j = (i + 1) % ground.length;
    poly([ground[i], ground[j], corners[j], corners[i]], '#ffffff', .65, '#bacbb5', .8);
  }
  if (shape === 'gable') { poly([corners[0], corners[3], peaks[0]], '#ffffff', .65, '#b5c7af'); poly([corners[1], corners[2], peaks[1]], '#ffffff', .65, '#b5c7af'); }
  if (mode === 'surface') {
    scene.surfaces.forEach((points,i) => poly(points, i % 2 ? '#c8dfb9' : '#a8cd97', 1, '#37613c', 1, 'surface'));
  } else {
    for (const member of scene.members) {
      if (!visible[member.layer]) continue;
      const palette = LAYERS[member.layer];
      member.faces.forEach((face, i) => poly(face.map(j => member.points[j]), i === 4 ? palette.fill : i === 3 ? palette.stroke : palette.fill, 1, palette.stroke, member.layer === 'boards' ? .42 : .65, member.layer));
    }
  }
  const render = renderRoofImage(layers, project, vw, vh);
  // The faint building outline is a reference, not a timber layer or solid wall.
  const backdrop = envelope.sort((a,b)=>a.points.reduce((n,p)=>n+raw(p)[2],0)/a.points.length-b.points.reduce((n,p)=>n+raw(p)[2],0)/b.points.length).map(f=>`<polygon points="${f.points.map(p=>project(p).slice(0,2).join(',')).join(' ')}" fill="${f.fill}" fill-opacity="${f.opacity}" stroke="${f.stroke}" stroke-width="${f.weight}"/>`).join('');
  const dimension = (a, b, label, dx, dy) => {
    const p = project(a), q = project(b), ax = p[0] + dx, ay = p[1] + dy, bx = q[0] + dx, by = q[1] + dy;
    return `<g fill="none" stroke="#5d7759" stroke-width=".8"><path d="M${p[0]},${p[1]} ${ax + dx * .15},${ay + dy * .15}M${q[0]},${q[1]} ${bx + dx * .15},${by + dy * .15}" opacity=".55"/><path d="M${ax},${ay} ${bx},${by}" marker-start="url(#dim)" marker-end="url(#dim)"/></g><text x="${(ax + bx) / 2}" y="${(ay + by) / 2 - 8}" text-anchor="middle" font-size="${vw < 500 ? 12 : 14}" fill="#264e31" stroke="#f3f8ef" stroke-width="6" paint-order="stroke" stroke-linejoin="round">${label}</text>`;
  };
  const dimensionX = shape==='lshape' ? dimension(ground[0],ground[1],`A ${nf(L)} m`,0,25) : dimension(ground[3], ground[2], `L ${nf(L)} m`, 0, 25);
  const dimensionY = shape==='lshape' ? dimension(ground[5],ground[7],`lB ${nf(values.wingWidth)} m`,0,25)+dimension(ground[0],ground[7],`B ${nf(values.wingLength)} m`,-22,8)+dimension(ground[1],ground[3],`lA ${nf(W)} m`,18,8) : dimension(ground[0], ground[3], `l ${nf(W)} m`, -20, 18);
  const highestPeak = peaks.reduce((a,b)=>a[2]>b[2]?a:b), peak = project(highestPeak);
  const heightGuide = `<g fill="none" stroke="#62805c" stroke-width=".8" stroke-dasharray="3 4">${line([highestPeak[0], highestPeak[1], z], highestPeak, '#62805c', .8, '3 4')}</g><text x="${peak[0] + 4}" y="${peak[1] - 17}" font-size="${vw < 500 ? 11 : 13}" text-anchor="middle" fill="#42663d" stroke="#f3f8ef" stroke-width="5" paint-order="stroke">h ${nf(H, 2)} m</text>`;
  const labels = labelSpace ? shown.map(key => {
    const points = scene.members.filter(m => m.layer === key).flatMap(m => m.points).map(project);
    if (!points.length) return '';
    const anchor = points.reduce((a, b) => a[0] > b[0] ? a : b);
    const textX = vw - 20, textWidth = LAYERS[key].name.length * 7;
    return `<g data-layer-label="${key}"><path d="M${anchor[0] + 7},${anchor[1]} H${textX - textWidth - 10}" stroke="${LAYERS[key].stroke}" stroke-width=".7" opacity=".65"/><text x="${textX}" y="${anchor[1] + 4}" text-anchor="end" fill="#294a32" font-size="12">${LAYERS[key].name}</text></g>`;
  }).join('') : '';
  const description = mode === 'surface' ? 'Suprafață geometrică' : `${mode === 'layers' ? 'Straturi separate' : 'Materiale asamblate'}: ${shown.map(k => LAYERS[k].name).join(', ') || 'niciun strat vizibil'}`;
  const accessiblePlan = shape === 'lshape' ? `cu aripa A de ${nf(L)} pe ${nf(W)} metri și aripa B de ${nf(values.wingLength)} pe ${nf(values.wingWidth)} metri` : `de ${nf(L)} pe ${nf(W)} metri`;
  $('roof-svg').dataset.renderer = render.backend;
  $('roof-svg').innerHTML = `<title>Acoperiș ${SHAPES[shape]} ${accessiblePlan}, pantă ${nf(values.pitch)} grade. ${description}.</title><defs><marker id="dim" viewBox="0 0 10 10" markerWidth="8" markerHeight="8" refX="5" refY="5" orient="auto-start-reverse"><path d="m3 2 4 3-4 3" fill="none" stroke="#5d7759" stroke-width="1"/></marker></defs>${backdrop}<image href="${render.url}" width="${vw}" height="${vh}"/>${dimensionX}${dimensionY}${mode === 'layers' ? '' : heightGuide}${mode === 'layers' ? labels : ''}`;
}

form.addEventListener('input', e => { if (e.target.id === 'pitch-range') $('pitch').value = e.target.value; update(); });
form.addEventListener('submit', e => e.preventDefault());
$('reset').addEventListener('click', () => { setForm(DEFAULTS); yaw = -.62; mode = 'layers'; Object.keys(visible).forEach(k => visible[k] = true); document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode))); update(); });
for (const input of document.querySelectorAll('[data-visible]')) input.addEventListener('change', () => { visible[input.dataset.visible] = input.checked; drawRoof(); });
for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => {
  mode = button.dataset.mode;
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  drawRoof();
});
$('rotate-left').addEventListener('click', () => { yaw -= .23; drawRoof(); });
$('rotate-right').addEventListener('click', () => { yaw += .23; drawRoof(); });
$('view-reset').addEventListener('click', () => { yaw = values.shape === 'lshape' ? .53 : -.62; drawRoof(); });
$('roof-svg').addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw, id: e.pointerId }; $('roof-svg').setPointerCapture(e.pointerId); });
$('roof-svg').addEventListener('pointermove', e => { if (drag && Math.abs(e.clientX - drag.x) > Math.abs(e.clientY - drag.y)) { yaw = drag.yaw + (e.clientX - drag.x) * .006; scheduleRoofDraw(); } });
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) $('roof-svg').addEventListener(type, () => { drag = null; });
$('print').addEventListener('click', () => { if (!$('print').disabled) window.print(); });
new ResizeObserver(scheduleRoofDraw).observe($('stage'));
try { const saved = restoreSettings(JSON.parse(localStorage.getItem('la-lemne-roof-prototype-v1'))); if (Object.keys(validate(saved)).length === 0) setForm(saved); } catch {}
update();
