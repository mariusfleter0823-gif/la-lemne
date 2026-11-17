import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, calculate } from '../roof-math.mjs';
import { buildRoofScene } from '../roof-scene.mjs';
test('Unequal L decking is joined and rafters remain below it in either wing orientation',()=>{
  for(const [width,wingWidth] of [[8,4],[4,8],[20,2],[2,20]])for(const pitch of [5,35,60]) {
    const v={...DEFAULTS,shape:'lshape',length:30,width,wingLength:30,wingWidth,pitch},r=calculate(v);
    for(const mode of ['assembled','layers','surface']) {
      const s=buildRoofScene(v,r,mode);assert.equal(s.surfaces.length,6);
      assert.equal(s.members.filter(m=>m.kind==='hips').length,2);assert.equal(s.members.filter(m=>m.kind==='valleys').length,1);
      for(const m of s.members){assert.ok(m.points.length>=4);assert.ok(m.points.flat().every(Number.isFinite));}
      for(const m of s.members.filter(m=>m.layer==='boards'))for(const p of m.points){
        const diff=p[2]-s.edgeZ(p[0],p[1])-s.offsets.boards;
        assert.ok(Math.abs(diff-.075/r.cos)<1e-8||Math.abs(diff-.1/r.cos)<1e-8);
      }
      for(const m of s.members.filter(m=>m.layer==='rafters'))for(const p of m.points)assert.ok(p[2]<=s.edgeZ(p[0],p[1])+.075/r.cos+1e-8);
    }
  }
});
test('L scene preserves its concave footprint, valley and opaque decking across modes',()=>{
  for(const [length,width,extension,pitch] of [[3,2,1,5],[12,8,6,35],[40,20,30,60]]) {
    const v={...DEFAULTS,shape:'lshape',length,width,wingWidth:width,wingLength:width+extension,pitch},r=calculate(v);
    for(const mode of ['assembled','layers','surface']) {
      const s=buildRoofScene(v,r,mode);assert.equal(s.footprint.length,8);assert.equal(s.surfaces.length,4);
      assert.equal(s.members.filter(m=>m.kind==='valleys').length,1);assert.equal(s.members.filter(m=>m.kind==='hips').length,1);
      assert.equal(s.members.filter(m=>m.layer==='rafters').length,r.rafters+2);
      for(const m of s.members){assert.ok(m.points.length>=4);assert.ok(m.points.flat().every(Number.isFinite));}
      for(const m of s.members.filter(m=>m.layer==='boards'))for(const p of m.points){
        const roof=s.edgeZ(p[0],p[1]),offset=s.offsets.boards;
        assert.ok(Math.abs(p[2]-roof-offset-.075/r.cos)<1e-8||Math.abs(p[2]-roof-offset-.1/r.cos)<1e-8);
      }
    }
  }
});

test('All roof shapes have finite layer geometry at minimum, square, rotated and maximum dimensions', () => {
  for (const shape of ['mono', 'gable', 'hip']) for (const [length, width, pitch] of [[2, 2, 5], [12, 8, 35], [8, 12, 35], [40, 20, 60]]) {
    const values = { ...DEFAULTS, shape, length, width, pitch }, result = calculate(values);
    for (const mode of ['layers', 'assembled']) {
      const scene = buildRoofScene(values, result, mode);
      assert.equal(scene.members.filter(m => m.layer === 'rafters').length, result.rafters + result.layout.hips.length);
      assert.equal(scene.members.filter(m => m.layer === 'counter').length, result.rafters);
      assert.equal(scene.members.filter(m => m.layer === 'battens').length, result.layout.battens.length);
      assert.ok(scene.members.every(m => m.points.every(p => p.every(Number.isFinite))));
      assert.ok(scene.surfaces.flat().every(p => p.every(Number.isFinite)));
      assert.equal(scene.surfaces.length, result.slopes);
    }
  }
});
test('Exploded view changes display offsets only; excluded materials cannot leak into the model', () => {
  const values = { ...DEFAULTS, boards: false, counter: false }, result = calculate(values);
  const split = buildRoofScene(values, result, 'layers'), together = buildRoofScene(values, result, 'assembled');
  assert.deepEqual(split.enabled, ['rafters', 'battens']);
  assert.ok(split.members.every(m => ['rafters', 'battens'].includes(m.layer)));
  assert.ok(split.offsets.battens > split.offsets.rafters);
  assert.equal(together.offsets.battens, 0);
  assert.equal(split.members.length, together.members.length);
  assert.deepEqual(result, calculate(values));
});
test('Common and diagonal rafters stay beneath the decking for all section extremes',()=>{
  for(const shape of ['mono','gable','hip'])for(const section of ['8x10','20x20'])for(const hipSection of ['8x10','20x20'])for(const pitch of [5,35,60]){
    const v={...DEFAULTS,shape,section,hipSection,pitch},r=calculate(v),s=buildRoofScene(v,r,'assembled'),top=Number(section.split('x')[1])/200/r.cos;
    for(const m of s.members.filter(m=>m.layer==='rafters'))for(const p of m.points){
      // The convex roof planes extend beyond eaves as well as inside the footprint.
      const roof=r.layout.faces.reduce((z,f)=>Math.min(z,(f.sin*(f.inward[0]*(p[0]-f.origin[0])+f.inward[1]*(p[1]-f.origin[1])))/f.cos+s.base),Infinity);
      assert.ok(p[2]<=roof+top+1e-8,`${shape}/${section}/${hipSection}/${pitch}: timber crosses decking plane`);
    }
  }
});
test('Decking faces meet at ridges and hips without a manufactured viewing gap',()=>{
  for(const shape of ['gable','hip']){
    const v={...DEFAULTS,shape},r=calculate(v),s=buildRoofScene(v,r,'assembled');
    const bottom=s.base+.075/r.cos,top=s.base+.1/r.cos;
    for(const m of s.members.filter(m=>m.layer==='boards'))for(const p of m.points){
      const baseRoof=s.edgeZ(p[0],p[1])-s.base;
      assert.ok(Math.abs(p[2]-baseRoof-bottom)<1e-8||Math.abs(p[2]-baseRoof-top)<1e-8);
    }
  }
});
