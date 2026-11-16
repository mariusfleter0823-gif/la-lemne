export const DEFAULTS = Object.freeze({ shape: 'gable', length: 12, width: 8, wingLength: 14, wingWidth: 8, pitch: 35, waste: 10, spacing: 80, section: '8x15', hipSection: '15x20', valleySection: '15x20', battenSpacing: 35, boards: true, battens: true, counter: true });
export const SHAPES = { mono: 'într-o apă', gable: 'în două ape egale', hip: 'în patru ape egale ca pantă', lshape: 'în L, cu două aripi și aceeași pantă' };
export const SECTIONS = ['8x10', '8x15', '10x10', '10x12', '10x15', '10x20', '12x12', '15x15', '15x20', '15x25', '20x20'];
export const LIMITS = { length: [2, 40], width: [2, 20], wingLength: [2, 50], wingWidth: [2, 20], pitch: [5, 60], waste: [0, 25], spacing: [30, 120], battenSpacing: [15, 50] };
const EPS = 1e-9, ceil = n => Math.ceil(n - EPS);
export function restoreSettings(saved) {
  const { extension, ...current } = saved || {};
  if (Number.isFinite(extension) && current.wingLength === undefined) current.wingLength = (current.width ?? DEFAULTS.width) + extension;
  if (Number.isFinite(extension) && current.wingWidth === undefined) current.wingWidth = current.width ?? DEFAULTS.width;
  return { ...DEFAULTS, ...current };
}
export function validate(v) {
  const errors = {};
  for (const [key, [min, max]] of Object.entries(LIMITS)) if ((!['wingLength','wingWidth'].includes(key) || v.shape === 'lshape') && (!Number.isFinite(v[key]) || v[key] < min || v[key] > max)) errors[key] = `Introdu o valoare între ${min} și ${max}.`;
  if (!Object.hasOwn(SHAPES, v.shape)) errors.shape = 'Alege o formă de acoperiș.';
  if (!SECTIONS.includes(v.section)) errors.section = 'Alege o secțiune din listă.';
  if (['hip','lshape'].includes(v.shape) && !SECTIONS.includes(v.hipSection)) errors.hipSection = 'Alege secțiunea căpriorilor diagonali.';
  if (v.shape === 'lshape') {
    const minA = Math.max(v.wingWidth + 1, v.width / 2 + 1), minB = Math.max(v.width + 1, v.wingWidth / 2 + 1);
    if (!errors.length && Number.isFinite(minA) && v.length < minA) errors.length = `Lungimea A trebuie să fie de minimum ${Math.ceil(minA * 10) / 10} m pentru acest racord în L.`;
    if (!errors.wingLength && Number.isFinite(minB) && v.wingLength < minB) errors.wingLength = `Lungimea B trebuie să fie de minimum ${Math.ceil(minB * 10) / 10} m pentru acest racord în L.`;
    if (!SECTIONS.includes(v.valleySection)) errors.valleySection = 'Alege secțiunea grinzii de dolie.';
  }
  return errors;
}
export function geometry(v) {
  const errors = validate(v);
  if (Object.keys(errors).length) throw new RangeError(JSON.stringify(errors));
  const lshape = v.shape === 'lshape', slopes = { mono: 1, gable: 2, hip: 4, lshape: 4 }[v.shape];
  const run = lshape ? Math.max(v.width,v.wingWidth)/2 : v.shape === 'hip' ? Math.min(v.length, v.width) / 2 : v.width / slopes;
  const angle = v.pitch * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
  const rise = run * Math.tan(angle), rafter = run / cos;
  const plan = lshape ? v.length*v.width+v.wingLength*v.wingWidth-v.width*v.wingWidth : v.width*v.length, diagonal = Math.hypot(run, run, rise);
  const diagonalFactor = Math.sqrt(2+Math.tan(angle)**2), lowRun = lshape ? Math.min(v.width,v.wingWidth)/2 : 0;
  return { slopes, run, rafter, rise, cos, sin, area: plan / cos, plan, pitchPercent: Math.tan(angle) * 100,
    riseA:v.width/2*Math.tan(angle),riseB:lshape?v.wingWidth/2*Math.tan(angle):0,
    ridge: lshape ? v.length+v.wingLength-Math.max(v.width,v.wingWidth)-Math.abs(v.width-v.wingWidth)/2 : v.shape === 'hip' ? Math.abs(v.length - v.width) : v.shape === 'gable' ? v.length : 0,
    hipLength: v.shape === 'hip' || lshape ? diagonal : 0, valleyLength: lshape ? lowRun*diagonalFactor : 0, transitionLength:lshape?(run-lowRun)*diagonalFactor:0 };
}
// Coordinates: u along an eave, d up its slope, in metres. Shared by quantities and scene.
export function facePoint(face, u, d) {
  return [face.origin[0] + face.along[0] * u + face.inward[0] * d * face.cos,
    face.origin[1] + face.along[1] * u + face.inward[1] * d * face.cos, d * face.sin];
}
export function faceBounds(face, d) { return [(face.leftIntercept||0)+d * (face.leftTaper ?? face.taper), face.length - d * (face.rightTaper ?? face.taper)]; }
export function facePolygon(face, from = face.from || 0, to = face.depth) {
  const [a, b] = faceBounds(face, from), [c, d] = faceBounds(face, to);
  return [facePoint(face, a, from), facePoint(face, b, from), facePoint(face, d, to), facePoint(face, c, to)];
}
function grid(anchors, maximum) {
  const sorted = [...new Set(anchors)].sort((a, b) => a - b), points = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1], span = sorted[i] - a, n = ceil(span / maximum);
    for (let j = 1; j <= n; j++) points.push(a + span * j / n);
  }
  return points;
}
export function roofLayout(v, g = geometry(v)) {
  if (v.shape === 'lshape') return lRoofLayout(v, g);
  const L = v.length, W = v.width, hip = v.shape === 'hip';
  const definitions = hip ? [
    [[-L / 2, -W / 2], [1, 0], [0, 1], L], [[L / 2, -W / 2], [0, 1], [-1, 0], W],
    [[L / 2, W / 2], [-1, 0], [0, -1], L], [[-L / 2, W / 2], [0, -1], [1, 0], W]
  ] : v.shape === 'gable' ? [
    [[-L / 2, -W / 2], [1, 0], [0, 1], L], [[L / 2, W / 2], [-1, 0], [0, -1], L]
  ] : [[[-L / 2, -W / 2], [1, 0], [0, 1], L]];
  const faces = definitions.map(([origin, along, inward, length]) => ({ origin, along, inward, length, depth: g.rafter, taper: hip ? g.cos : 0, cos: g.cos, sin: g.sin }));
  const rafters = [], battens = [], hips = [], gaps = [];
  const battenRows = ceil(g.rafter / (v.battenSpacing / 100)) + 1;
  for (const [index, face] of faces.entries()) {
    const points = grid(hip ? [0, g.run, face.length - g.run, face.length] : [0, face.length], v.spacing / 100);
    gaps.push(...points.slice(1).map((p, i) => p - points[i]));
    for (const u of points) {
      const length = hip ? Math.min(face.depth, u / g.cos, (face.length - u) / g.cos) : face.depth;
      if (length > EPS) rafters.push({ face: index, a: facePoint(face, u, 0), b: facePoint(face, u, length), length });
    }
    for (let i = 0; i < battenRows; i++) {
      const d = face.depth * i / (battenRows - 1), [left, right] = faceBounds(face, d);
      if (right - left > EPS) battens.push({ face: index, a: facePoint(face, left, d), b: facePoint(face, right, d), length: right - left });
    }
    if (hip) hips.push({ a: facePoint(face, 0, 0), b: facePoint(face, g.run, face.depth), length: g.hipLength });
  }
  const ridge = hip ? (L >= W ? [[-(L - W) / 2, 0, g.rise], [(L - W) / 2, 0, g.rise]] : [[0, -(W - L) / 2, g.rise], [0, (W - L) / 2, g.rise]]) : [[-L / 2, v.shape === 'mono' ? W / 2 : 0, g.rise], [L / 2, v.shape === 'mono' ? W / 2 : 0, g.rise]];
  return { faces, rafters, battens, hips, valleys: [], ridge, battenRows, actualSpacing: Math.max(...gaps) * 100 };
}
// L = [0,A]×[0,a] union [0,b]×[0,B]. Equal pitch/eave elevation,
// independent arm dimensions. Height/tan(pitch) = min(x,y,max(a-y,b-x)).
// Four roof planes, split into convex patches where widths differ. Coplanar
// patches share one rafter/batten grid; they never become extra purchased beams.
function lRoofLayout(v, g) {
  const A=v.length,a=v.width,B=v.wingLength,b=v.wingWidth,lo=Math.min(a,b)/2,hi=Math.max(a,b)/2,c=g.cos;
  const point=(x,y,z=0)=>[x-A/2,y-B/2,z], faces=[];
  const axes=[[[0,0],[1,0],[0,1]],[[0,B],[0,-1],[1,0]],[[A,a],[-1,0],[0,-1]],[[b,a],[0,1],[-1,0]]];
  const patch=(group,from,to,leftIntercept,length,leftTaper,rightTaper)=>{
    if(to-from<EPS)return;
    const [origin,along,inward]=axes[group];
    faces.push({group,origin:point(...origin).slice(0,2),along,inward,leftIntercept,length,leftTaper:leftTaper*c,rightTaper:rightTaper*c,taper:0,from:from/c,depth:to/c,cos:c,sin:g.sin});
  };
  patch(0,0,a/2,0,A,1,0);
  if(b>a)patch(0,a/2,b/2,0,b,1,1);
  patch(1,0,b/2,0,B,0,1);
  if(a>b)patch(1,b/2,a/2,B-a,B,1,1);
  patch(2,0,lo,0,A-b,0,-1);
  if(a>b)patch(2,b/2,a/2,0,A,0,1);
  patch(3,0,lo,0,B-a,-1,0);
  if(b>a)patch(3,a/2,b/2,-a,B-a,1,0);
  const rafters=[],battens=[],gaps=[],battenRows=ceil(g.rafter/(v.battenSpacing/100))+1;
  const merge = ranges => {
    const out=[];
    for(const range of ranges.sort((x,y)=>x.from-y.from)) {
      const last=out.at(-1);
      if(last && range.from<=last.to+EPS){last.to=Math.max(last.to,range.to);last.parts.push(range);}
      else out.push({from:range.from,to:range.to,parts:[range]});
    }
    return out;
  };
  for(let group=0;group<4;group++) {
    const pieces=faces.map((face,index)=>({face,index})).filter(p=>p.face.group===group),face=pieces[0].face;
    const points=grid(pieces.flatMap(p=>[...faceBounds(p.face,p.face.from),...faceBounds(p.face,p.face.depth)]),v.spacing/100);
    gaps.push(...points.slice(1).map((p,i)=>p-points[i]));
    for(const u of points) {
      const ranges=[];
      for(const {face:f,index} of pieces) {
        let from=f.from,to=f.depth;
        for(const [slope,limit] of [[f.leftTaper,u-f.leftIntercept],[f.rightTaper,f.length-u]]) {
          if(slope>EPS)to=Math.min(to,limit/slope); else if(slope < -EPS)from=Math.max(from,limit/slope); else if(limit < -EPS)to=-Infinity;
        }
        if(to-from>EPS)ranges.push({from,to,face:index});
      }
      for(const range of merge(ranges))rafters.push({face:range.parts[0].face,a:facePoint(face,u,range.from),b:facePoint(face,u,range.to),length:range.to-range.from,parts:range.parts.map(p=>({face:p.face,a:facePoint(face,u,p.from),b:facePoint(face,u,p.to)}))});
    }
    const depth=Math.max(...pieces.map(p=>p.face.depth)),rows=ceil(depth/(v.battenSpacing/100))+1;
    for(let i=0;i<rows;i++) {
      const d=depth*i/(rows-1),ranges=[];
      for(const {face:f,index} of pieces)if(d>=f.from-EPS&&d<=f.depth+EPS){const [from,to]=faceBounds(f,d);if(to-from>EPS)ranges.push({from,to,face:index});}
      for(const range of merge(ranges))battens.push({face:range.parts[0].face,a:facePoint(face,range.from,d),b:facePoint(face,range.to,d),length:range.to-range.from,parts:range.parts.map(p=>({face:p.face,a:facePoint(face,p.from,d),b:facePoint(face,p.to,d)}))});
    }
  }
  const high=point(hi,hi,g.rise),low=a>=b?point(b/2,a-b/2,lo*g.sin/c):point(b-a/2,a/2,lo*g.sin/c);
  const indices=groups=>groups.map(group=>faces.findIndex(f=>f.group===group));
  const hips=[{a:point(0,0),b:high,length:g.hipLength,faces:indices([0,1])}];
  if(g.transitionLength>EPS)hips.push({a:low,b:high,length:g.transitionLength,faces:indices(a>b?[1,2]:[0,3]),transition:true});
  const ridgeA=a>=b?high:low,ridgeB=a>=b?low:high;
  return {faces,rafters,battens,
    hips,valleys:[{a:point(b,a),b:low,length:g.valleyLength,faces:indices([2,3])}],
    ridge:[ridgeA,point(A,a/2,g.riseA),ridgeB,point(b/2,B,g.riseB)],
    // Include gable peaks in the perimeter for the reference wall outline.
    footprint:[[0,0],[A,0],[A,a/2],[A,a],[b,a],[b,B],[b/2,B],[0,B]].map(p=>point(...p)),
    battenRows,actualSpacing:Math.max(...gaps)*100};
}
// One structural member per stock beam. No automatic offcut reuse or structural joints.
function beamRow(id, name, lengths, section, reserve) {
  const groups = new Map();
  for (const cut of lengths) {
    const stock = [3, 4, 5, 6, 7, 8, 9, 10].find(l => l + EPS >= cut);
    if (!stock) return { id, name, slug: 'grinzi', image: 'grinzi-depozit-01.avif', unit: 'm³', price: [1150, 1400], count: null, stockLength: null, stockGroups: [], section, volume: null, billQuantity: null, netQuantity: lengths.length, cutLength: Math.max(...lengths) };
    groups.set(stock, (groups.get(stock) || 0) + 1);
  }
  const stockGroups = [...groups].sort(([a], [b]) => a - b).map(([length, netCount]) => ({ length, netCount, count: ceil(netCount * reserve) }));
  const [b, h] = section.split('x').map(Number), count = stockGroups.reduce((n, group) => n + group.count, 0);
  const volume = stockGroups.reduce((n, group) => n + group.count * group.length * b * h / 10000, 0);
  return { id, name, slug: 'grinzi', image: 'grinzi-depozit-01.avif', unit: 'm³', price: [1150, 1400], count, stockLength: stockGroups.length === 1 ? stockGroups[0].length : null, stockGroups, section, volume, billQuantity: volume, netQuantity: lengths.length, cutLength: Math.max(...lengths) };
}
export function calculate(v) {
  const g = geometry(v), layout = roofLayout(v, g), reserve = 1 + v.waste / 100;
  const rows = [beamRow('rafters', ['hip','lshape'].includes(v.shape) ? 'Căpriori comuni și scurți' : 'Grinzi pentru căpriori', layout.rafters.map(r => r.length), v.section, reserve)];
  if (layout.hips.length) rows.push(beamRow('hips', v.shape === 'lshape' ? (g.transitionLength>EPS?'Căpriori diagonali · muchie și racord':'Căprior diagonal · muchie exterioară') : 'Căpriori diagonali · 4 muchii', layout.hips.map(r => r.length), v.hipSection, reserve));
  if (layout.valleys.length) rows.push(beamRow('valleys', 'Grindă de dolie · colț interior', layout.valleys.map(r => r.length), v.valleySection, reserve));
  if (v.boards) {
    const count = ceil(g.area * reserve / (.2 * 4)), volume = count * .025 * .2 * 4;
    rows.push({ id: 'boards', name: 'Scândură pentru astereală', slug: 'scandura-dimensionata', image: 'scandura-dimensionata-depozit-01.avif', unit: 'm³', price: [1100, 1300], count, stockLength: 4, section: '2.5x20', volume, billQuantity: volume, netQuantity: g.area });
  }
  for (const [id, enabled, name, meters] of [
    ['battens', v.battens, 'Leațuri pentru învelitoare', layout.battens.reduce((n, r) => n + r.length, 0)],
    ['counter', v.counter, 'Contrașipci', layout.rafters.reduce((n, r) => n + r.length, 0)]
  ]) {
    if (!enabled) continue;
    const pieces = ceil(meters * reserve / 4), packs = ceil(pieces / 10), count = packs * 10;
    rows.push({ id, name, slug: 'lateti', image: 'lateti-depozit-01.avif', unit: 'pachet', price: [50, 120], count, packs, stockLength: 4, section: '3x5', volume: count * .03 * .05 * 4, billQuantity: packs, netQuantity: meters });
  }
  for (const r of rows) r.cost = r.billQuantity === null ? null : r.price.map(p => p * r.billQuantity);
  const complete = rows.every(r => r.cost !== null);
  return { ...g, layout, positions: ['hip','lshape'].includes(v.shape) ? null : layout.rafters.length / g.slopes, rafters: layout.rafters.length, battenRows: layout.battenRows, actualSpacing: layout.actualSpacing, rows, complete, volume: complete ? rows.reduce((n, r) => n + r.volume, 0) : null, price: complete ? [0, 1].map(i => rows.reduce((n, r) => n + r.cost[i], 0)) : null };
}
