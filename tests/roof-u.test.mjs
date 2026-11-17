import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,calculate,validate,facePolygon} from '../roof-math.mjs';
import {buildRoofScene} from '../roof-scene.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const example={...DEFAULTS,shape:'ushape',length:18,width:6,wingLength:14,wingWidth:5,rightWingLength:12,rightWingWidth:4};
const inside=(p,poly)=>{const signs=poly.map((a,i)=>{const b=poly[(i+1)%poly.length];return (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);});return signs.every(n=>n>=-1e-8)||signs.every(n=>n<=1e-8);};
test('U known area, two valleys and independent third wing',()=>{
 const r=calculate(example);close(r.plan,172);close(r.area,172/Math.cos(35*Math.PI/180));assert.equal(r.layout.valleys.length,2);
 close(calculate({...example,rightWingLength:15}).plan-r.plan,12);
 close(calculate({...example,rightWingWidth:6}).plan-r.plan,12);
});
test('U faces exactly tile the footprint, preserve mirror quantities and avoid duplicated seam rafters',()=>{
 for(const [length,width,wingWidth,rightWingWidth] of [[18,6,5,4],[18,8,8,4],[30,4,8,6],[40,20,2,18],[40,2,18,3],[10,2,2,2]])for(const pitch of [5,35,60]){
 const v={...example,length,width,wingWidth,rightWingWidth,wingLength:30,rightWingLength:25,pitch},r=calculate(v),polys=r.layout.faces.map(f=>facePolygon(f)),D=30;
 close(polys.reduce((sum,poly)=>sum+Math.abs(poly.reduce((s,a,i)=>{const b=poly[(i+1)%poly.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2,0),r.plan);
 for(let i=0;i<31;i++)for(let j=0;j<37;j++){
  const x=(i+.137)*length/31,y=(j+.619)*D/37,p=[x-length/2,y-D/2];
  assert.equal(polys.filter(poly=>inside(p,poly)).length,(y<width||(x<wingWidth&&y<v.wingLength)||(x>length-rightWingWidth&&y<v.rightWingLength))?1:0);
 }
 const keys=r.layout.rafters.map(l=>[l.a,l.b].map(p=>p.map(n=>n.toFixed(7)).join(',')).sort().join('|'));
 assert.equal(new Set(keys).size,keys.length);
 for(const line of [...r.layout.rafters,...r.layout.battens,...r.layout.hips,...r.layout.valleys])close(Math.hypot(...line.a.map((n,i)=>n-line.b[i])),line.length);
 assert.ok(r.actualSpacing<=v.spacing+1e-8);
 const mirror=calculate({...v,wingLength:v.rightWingLength,rightWingLength:v.wingLength,wingWidth:v.rightWingWidth,rightWingWidth:v.wingWidth});
 close(r.area,mirror.area);close(r.ridge,mirror.ridge);assert.equal(r.rafters,mirror.rafters);
 r.rows.forEach((row,i)=>{close(row.netQuantity,mirror.rows[i].netQuantity);assert.deepEqual(row.stockGroups,mirror.rows[i].stockGroups);});
 }
});
test('U assembled decking covers common, hip and valley rafters with unequal wings',()=>{
 for(const [width,wingWidth,rightWingWidth] of [[6,5,4],[4,8,6],[8,4,9]])for(const pitch of [5,35,60]){
 const v={...example,length:30,width,wingWidth,rightWingWidth,wingLength:20,rightWingLength:18,pitch},r=calculate(v),scene=buildRoofScene(v,r,'assembled');
 assert.equal(scene.members.filter(m=>m.kind==='valleys').length,2);
 for(const m of scene.members){assert.ok(m.points.length>=4);assert.ok(m.points.flat().every(Number.isFinite));}
 for(const m of scene.members.filter(m=>m.layer==='boards'))for(const p of m.points){const h=p[2]-scene.edgeZ(p[0],p[1]);assert.ok(Math.abs(h-.075/r.cos)<1e-7||Math.abs(h-.1/r.cos)<1e-7);}
 for(const m of scene.members.filter(m=>m.layer==='rafters'))for(const p of m.points)assert.ok(p[2]<=scene.edgeZ(p[0],p[1])+.075/r.cos+1e-7);
 }
});
test('U rejects overlapping junctions and invalid independent dimensions',()=>{
 for(const patch of [{length:8},{wingLength:6},{rightWingLength:6},{rightWingWidth:NaN},{rightWingWidth:21},{valleySection:'invalid'}])assert.ok(Object.keys(validate({...example,...patch})).length);
 assert.deepEqual(validate({...DEFAULTS,rightWingWidth:NaN}),{});
});
