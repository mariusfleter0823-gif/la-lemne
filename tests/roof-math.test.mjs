import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, geometry, calculate, validate, facePolygon, restoreSettings } from '../roof-math.mjs';
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
test('Unequal L: independent 8 m / 4 m wings, areas, heights, lengths and quantities',()=>{
  const v={...DEFAULTS,shape:'lshape',length:12,width:8,wingLength:14,wingWidth:4,pitch:Math.atan(3/4)*180/Math.PI,spacing:100,battenSpacing:50,waste:0},r=calculate(v);
  close(r.plan,120);close(r.area,150);close(r.riseA,3);close(r.riseB,1.5);close(r.ridge,16);
  close(r.hipLength,Math.sqrt(41));close(r.valleyLength,Math.sqrt(41)/2);close(r.transitionLength,Math.sqrt(41)/2);
  assert.equal(r.layout.faces.length,6);assert.equal(r.layout.hips.length,2);assert.equal(r.rafters,44);
  close(r.rows.find(x=>x.id==='counter').netQuantity,157.5);close(r.rows.find(x=>x.id==='battens').netQuantity,336);
  assert.equal(r.rows.find(x=>x.id==='boards').count,188);
  assert.deepEqual(r.rows.find(x=>x.id==='hips').stockGroups.map(x=>[x.length,x.netCount]),[[4,1],[7,1]]);
});
test('Independent L wings partition the footprint without overlap and preserve symmetry',()=>{
  for(const [length,width,wingLength,wingWidth,pitch] of [[12,8,14,4,35],[12,4,14,8,35],[12,20,30,2,5],[30,2,12,20,60],[40,20,40,19.9,60],[3,2,3,2,5]]) {
    const v={...DEFAULTS,shape:'lshape',length,width,wingLength,wingWidth,pitch},r=calculate(v),polys=r.layout.faces.map(f=>facePolygon(f));
    const inside=(p,poly)=>{const signs=poly.map((a,i)=>{const b=poly[(i+1)%poly.length];return(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);});return signs.every(n=>n>=-1e-8)||signs.every(n=>n<=1e-8);};
    let plan=0;for(const poly of polys)plan+=Math.abs(poly.reduce((s,a,i)=>{const b=poly[(i+1)%poly.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;
    close(plan,length*width+wingLength*wingWidth-width*wingWidth);
    for(let i=0;i<23;i++)for(let j=0;j<29;j++) {
      const x=(i+.137)/23*length,y=(j+.619)/29*wingLength,p=[x-length/2,y-wingLength/2];
      assert.equal(polys.filter(poly=>inside(p,poly)).length,(x<wingWidth||y<width)?1:0);
    }
    for(const line of [...r.layout.rafters,...r.layout.battens,...r.layout.hips,...r.layout.valleys]) {
      close(Math.hypot(...line.a.map((x,i)=>x-line.b[i])),line.length);
      for(const p of [line.a,line.b]) {const x=p[0]+length/2,y=p[1]+wingLength/2;close(p[2],Math.min(x,y,Math.max(width-y,wingWidth-x))*Math.tan(pitch*Math.PI/180));}
      for(const part of line.parts||[])for(const p of [part.a,part.b])assert.ok(inside(p,polys[part.face]));
    }
    assert.ok(r.actualSpacing<=v.spacing+1e-8);
    const swapped=calculate({...v,length:wingLength,width:wingWidth,wingLength:length,wingWidth:width});
    close(r.area,swapped.area);close(r.ridge,swapped.ridge);assert.equal(r.rafters,swapped.rafters);
    r.rows.forEach((row,i)=>{close(row.netQuantity,swapped.rows[i].netQuantity);assert.deepEqual(row.stockGroups,swapped.rows[i].stockGroups);});
  }
});
test('Legacy L saved dimensions migrate without changing its footprint',()=>{
  const v=restoreSettings({shape:'lshape',length:12,width:8,extension:6});
  assert.equal(v.wingLength,14);assert.equal(v.wingWidth,8);assert.equal('extension' in v,false);close(calculate(v).plan,144);
  assert.equal(restoreSettings({...v,extension:6,wingWidth:4}).wingWidth,4);
  for(const patch of [{wingWidth:0},{wingLength:NaN},{width:20,wingWidth:2,length:3,wingLength:25},{width:2,wingWidth:20,length:25,wingLength:3}])assert.throws(()=>calculate({...DEFAULTS,shape:'lshape',...patch}),RangeError);
});
test('L roof: independent trapezoids, 3-4-5 rafters, single hip and valley, no overlap',()=>{
  const r=calculate({...DEFAULTS,shape:'lshape',length:12,width:8,wingWidth:8,wingLength:14,pitch:Math.atan(3/4)*180/Math.PI,spacing:100,battenSpacing:50,waste:0});
  close(r.plan,12*8+8*6);close(r.area,50+60+30+40);close(r.rise,3);close(r.rafter,5);close(r.ridge,18);
  close(r.hipLength,Math.sqrt(41));close(r.valleyLength,Math.sqrt(41));
  assert.equal(r.layout.hips.length,1);assert.equal(r.layout.valleys.length,1);assert.equal(r.rafters,44);
  close(r.layout.rafters.reduce((s,l)=>s+l.length,0),190);
  close(r.rows.find(x=>x.id==='counter').netQuantity,190);close(r.rows.find(x=>x.id==='battens').netQuantity,396);
  assert.equal(r.rows.find(x=>x.id==='boards').count,225);
  for(const id of ['hips','valleys']){assert.equal(r.rows.find(x=>x.id===id).count,1);assert.equal(r.rows.find(x=>x.id===id).stockLength,7);}
  const areas=r.layout.faces.map(f=>{const p=facePolygon(f);return Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1];},0))/2/r.cos;});
  areas.forEach((n,i)=>close(n,[50,60,30,40][i]));
});
test('L footprint faces cover the union once and members lie on their roof plane',()=>{
  for(const [length,width,extension,pitch] of [[3,2,1,5],[12,8,6,35],[40,20,30,60]]) {
    const v={...DEFAULTS,shape:'lshape',length,width,wingWidth:width,wingLength:width+extension,pitch},r=calculate(v),polygons=r.layout.faces.map(f=>facePolygon(f));
    const inside=(p,poly)=>{const signs=poly.map((a,i)=>{const b=poly[(i+1)%poly.length];return(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);});return signs.every(n=>n>=-1e-8)||signs.every(n=>n<=1e-8);};
    for(let i=0;i<19;i++)for(let j=0;j<23;j++) {
      const x=(i+.317)/19*length,y=(j+.683)/23*(width+extension),p=[x-length/2,y-(width+extension)/2];
      assert.equal(polygons.filter(poly=>inside(p,poly)).length,x<=width||y<=width?1:0);
    }
    for(const m of [...r.layout.rafters,...r.layout.battens]) {
      close(Math.hypot(...m.a.map((x,i)=>x-m.b[i])),m.length);
      for(const p of [m.a,m.b]) {assert.ok(inside(p,polygons[m.face]));const f=r.layout.faces[m.face];close(p[2],((p[0]-f.origin[0])*f.inward[0]+(p[1]-f.origin[1])*f.inward[1])*r.sin/r.cos);}
    }
    assert.ok(r.actualSpacing<=v.spacing+1e-8);
  }
});
test('L input constraints, independent valley section and stock limits',()=>{
  for(const patch of [{length:8},{wingLength:0},{wingWidth:NaN},{wingLength:8},{wingWidth:12},{valleySection:'1x1'}])assert.throws(()=>calculate({...DEFAULTS,shape:'lshape',...patch}),RangeError);
  const a=calculate({...DEFAULTS,shape:'lshape'}),b=calculate({...DEFAULTS,shape:'lshape',valleySection:'20x20'});
  assert.deepEqual(a.rows.filter(x=>x.id!=='valleys'),b.rows.filter(x=>x.id!=='valleys'));
  assert.ok(b.volume>a.volume);
  const large=calculate({...DEFAULTS,shape:'lshape',length:22,width:20,wingWidth:20,wingLength:26,pitch:35});
  assert.equal(large.complete,false);assert.equal(large.price,null);assert.equal(large.rows.find(x=>x.id==='valleys').volume,null);
});
test('Known 3-4-5 gable: 12 × 8 m, rise 3 m, area 120 m²', () => {
  const r = geometry({ ...DEFAULTS, pitch: Math.atan(3 / 4) * 180 / Math.PI });
  close(r.rafter, 5); close(r.rise, 3); close(r.area, 120); close(r.pitchPercent, 75);
});
test('Mono and gable have equal area at equal pitch; mono rafters and height double', () => {
  const g = geometry(DEFAULTS), m = geometry({ ...DEFAULTS, shape: 'mono' });
  close(g.area, m.area); close(m.rafter, g.rafter * 2); close(m.rise, g.rise * 2); assert.equal(m.ridge, 0);
});
test('Rafters include both ends and respect maximum spacing', () => {
  const r = calculate({ ...DEFAULTS, length: 12.1, spacing: 80 });
  assert.equal(r.positions, 17); assert.equal(r.rafters, 34); assert.ok(r.actualSpacing <= 80);
});
test('Known quantities at 3-4-5 geometry, no reserve; commercial length fits exactly', () => {
  const r = calculate({ ...DEFAULTS, pitch: Math.atan(3 / 4) * 180 / Math.PI, waste: 0 });
  assert.equal(r.rows[0].count, 32); assert.equal(r.rows[0].stockLength, 5); close(r.rows[0].volume, 1.92);
  assert.equal(r.rows[1].count, 150); close(r.rows[1].volume, 3);
  for (const row of r.rows.filter(x => x.packs)) { assert.equal(row.count % 10, 0); close(row.cost[0], row.packs * 50); close(row.cost[1], row.packs * 120); }
  close(r.price[0], r.rows.reduce((sum, x) => sum + x.cost[0], 0));
});
test('Purchase quantities cover the geometric model plus its selected reserve', () => {
  for (const pitch of [5, 20, 35, 60]) for (const waste of [0, 10, 25]) {
    const r = calculate({ ...DEFAULTS, pitch, waste }), factor = 1 + waste / 100;
    assert.ok(r.rows[0].count * r.rows[0].stockLength >= r.rafters * r.rafter * factor - 1e-8);
    assert.ok(r.rows[1].count * .8 >= r.area * factor - 1e-8);
    for (const row of r.rows.filter(x => x.packs)) assert.ok(row.count * 4 >= row.netQuantity * factor - 1e-8);
  }
});
test('Excluded materials do not enter quote and quantity totals', () => {
  const r = calculate({ ...DEFAULTS, boards: false, battens: false, counter: false });
  assert.equal(r.rows.length, 1); close(r.volume, r.rows[0].volume); close(r.price[0], r.rows[0].cost[0]);
});
test('A required rafter above 10 m does not silently become joined stock or a full quote', () => {
  const r = calculate({ ...DEFAULTS, shape: 'mono', width: 12 });
  assert.equal(r.complete, false); assert.equal(r.price, null); assert.equal(r.volume, null); assert.equal(r.rows[0].count, null);
});
test('Nonfinite, zero, unsupported and out-of-range values are rejected', () => {
  for (const v of [{ length: NaN }, { width: 0 }, { pitch: 90 }, { waste: -1 }, { spacing: 0 }, { shape: 'eight' }, { section: '1x1' }, { shape: 'hip', hipSection: '1x1' }]) {
    assert.ok(Object.keys(validate({ ...DEFAULTS, ...v })).length); assert.throws(() => calculate({ ...DEFAULTS, ...v }), RangeError);
  }
});
test('Hip 12 × 8 m, rise 3: independent triangle/trapezoid areas and four diagonals', () => {
  const r = calculate({ ...DEFAULTS, shape: 'hip', pitch: Math.atan(3 / 4) * 180 / Math.PI, waste: 0 });
  close(r.rise, 3); close(r.rafter, 5); close(r.ridge, 4); close(r.hipLength, Math.sqrt(41));
  close(r.area, 2 * ((12 + 4) / 2 * 5) + 2 * (8 * 5 / 2));
  assert.equal(r.layout.hips.length, 4);
  assert.equal(r.rows.find(x => x.id === 'hips').count, 4);
  assert.equal(r.rows.find(x => x.id === 'hips').stockLength, 7);
  close(r.rows.find(x => x.id === 'hips').volume, .84);
  assert.equal(r.rafters, 46); // 14 each long side + 9 each short side, corners are diagonals.
  close(r.layout.rafters.reduce((s, x) => s + x.length, 0), 150);
  close(r.rows.find(x => x.id === 'counter').netQuantity, 150);
  assert.equal(r.layout.battens.length, 62); // 16 rows/long face, 15 nonzero rows/triangle.
  close(r.rows.find(x => x.id === 'battens').netQuantity, 384);
});
test('Hip quantities are invariant when length/width swap, including a pyramidal square', () => {
  for (const [length, width] of [[12, 8], [8, 8], [7.3, 3.1], [2, 20]]) {
    const a = calculate({ ...DEFAULTS, shape: 'hip', length, width });
    const b = calculate({ ...DEFAULTS, shape: 'hip', length: width, width: length });
    close(a.area, b.area); close(a.rafter, b.rafter); close(a.hipLength, b.hipLength);
    assert.equal(a.rafters, b.rafters); close(a.volume, b.volume);
    assert.deepEqual(a.rows.map(r => r.stockGroups), b.rows.map(r => r.stockGroups));
    if (length === width) { close(a.ridge, 0); a.layout.ridge[0].forEach((n,i)=>close(n,a.layout.ridge[1][i])); }
  }
});
// Independent 3D triangle cross products check that faces close over the exact footprint.
const sub = (a, b) => a.map((x, i) => x - b[i]);
const triArea = (a, b, c) => { const u = sub(b, a), v = sub(c, a); return Math.hypot(u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0])/2; };
test('All shapes: 3D polygon areas, segment lengths, slope spacing and stock-group coverage', () => {
  for (const shape of ['mono', 'gable', 'hip']) for (const [length, width, pitch] of [[2, 2, 5], [12, 8, 35], [8, 12, 45], [40, 20, 60], [8.1, 8, 22]]) {
    const v = { ...DEFAULTS, shape, length, width, pitch }, r = calculate(v);
    const area = r.layout.faces.reduce((s, f) => { const [a,b,c,d] = facePolygon(f); return s + triArea(a,b,c) + triArea(a,c,d); }, 0);
    close(area, r.area); assert.ok(r.actualSpacing <= v.spacing + 1e-8);
    for (const line of [...r.layout.rafters, ...r.layout.hips, ...r.layout.battens]) {
      assert.ok(line.length > 0); close(Math.hypot(...sub(line.b, line.a)), line.length);
      for (const p of [line.a, line.b]) { assert.ok(Math.abs(p[0]) <= length / 2 + 1e-8); assert.ok(Math.abs(p[1]) <= width / 2 + 1e-8); }
    }
    for (const row of r.rows.filter(x => x.stockGroups && x.volume !== null)) {
      assert.equal(row.stockGroups.reduce((s,x)=>s+x.netCount,0), row.netQuantity);
      for (const group of row.stockGroups) assert.ok(group.count >= group.netCount * 1.1 - 1e-8);
    }
  }
});
test('Short members are not packed into stock with an implicit zero-width saw cut', () => {
  const r = calculate({ ...DEFAULTS, width: 2, pitch: 5, waste: 0 });
  assert.equal(r.rows[0].count, r.rafters);
});
test('A diagonal above stock limit marks the hip estimate incomplete independently of common rafters', () => {
  const r = calculate({ ...DEFAULTS, shape: 'hip', length: 20, width: 16, pitch: 5 });
  assert.ok(r.rafter < 10); assert.ok(r.hipLength > 10);
  assert.notEqual(r.rows[0].volume, null); assert.equal(r.rows[1].volume, null);
  assert.equal(r.price, null);
});
