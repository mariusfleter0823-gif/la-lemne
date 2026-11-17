import test from 'node:test';import assert from 'node:assert/strict';
import {DEFAULTS,calculate,validate,facePolygon} from '../roof-math.mjs';import {buildRoofScene} from '../roof-scene.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const inside=(p,poly)=>{const signs=poly.map((a,i)=>{const b=poly[(i+1)%poly.length];return(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);});return signs.every(n=>n>=-1e-8)||signs.every(n=>n<=1e-8);};
const example={...DEFAULTS,shape:'tshape',length:18,width:8,wingWidth:6,wingLength:14,wingOffset:3,pitch:Math.atan(.75)*180/Math.PI};
test('T known 3-4-5 geometry, overlap counted once, two equal valleys',()=>{
 const r=calculate(example);close(r.plan,180);close(r.area,225);close(r.riseA,3);close(r.riseB,2.25);close(r.rafter,5);close(r.ridge,27);assert.equal(r.layout.valleys.length,2);assert.equal(r.layout.hips.length,0);close(r.valleyLength,6*Math.sqrt(2+.75**2));
 close(calculate({...example,wingLength:15}).plan-r.plan,6);close(calculate({...example,wingWidth:7}).plan-r.plan,6);close(calculate({...example,wingOffset:7}).plan,r.plan);
});
test('T patches cover exactly the footprint and all members follow the analytic envelope',()=>{
 for(const [L,a,b,o,B] of [[18,8,6,3,14],[18,6,8,2,14],[12,8,8,2,14],[40,2,20,1,30],[40,20,2,37,30],[4,2,2,1,3]])for(const pitch of [5,35,60]){
 const v={...example,length:L,width:a,wingWidth:b,wingOffset:o,wingLength:B,pitch},r=calculate(v),polys=r.layout.faces.map(f=>facePolygon(f));
 const h=(x,y)=>Math.min(y,Math.max(a-y,Math.min(x-o,o+b-x)))*Math.tan(pitch*Math.PI/180);
 close(polys.reduce((sum,p)=>sum+Math.abs(p.reduce((n,q,i)=>{const t=p[(i+1)%p.length];return n+q[0]*t[1]-t[0]*q[1];},0))/2,0),r.plan);
 for(let i=0;i<31;i++)for(let j=0;j<29;j++){const x=(i+.137)*L/31,y=(j+.619)*B/29;assert.equal(polys.filter(p=>inside([x-L/2,y-B/2],p)).length,y<a||(x>o&&x<o+b)?1:0);}
 for(const line of [...r.layout.rafters,...r.layout.battens,...r.layout.valleys,...r.layout.hips]){close(Math.hypot(...line.a.map((n,i)=>n-line.b[i])),line.length);for(const p of [line.a,line.b])close(p[2],h(p[0]+L/2,p[1]+B/2));}
 assert.ok(r.actualSpacing<=v.spacing+1e-7);
 const mirror=calculate({...v,wingOffset:L-o-b});close(r.ridge,mirror.ridge);assert.equal(r.rafters,mirror.rafters);r.rows.forEach((row,i)=>{close(row.netQuantity,mirror.rows[i].netQuantity);assert.deepEqual(row.stockGroups,mirror.rows[i].stockGroups);});
 const scene=buildRoofScene(v,r,'assembled');for(const m of scene.members){assert.ok(m.points.length>=4);assert.ok(m.points.flat().every(Number.isFinite));}
 for(const m of scene.members.filter(m=>m.layer==='boards'))for(const p of m.points){const d=p[2]-scene.edgeZ(p[0],p[1]);assert.ok(Math.abs(d-.075/r.cos)<1e-7||Math.abs(d-.1/r.cos)<1e-7);}
 for(const m of scene.members.filter(m=>m.layer==='rafters'))for(const p of m.points)assert.ok(p[2]<=scene.edgeZ(p[0],p[1])+.075/r.cos+1e-7);
 }
});
test('T validation rejects disappearing arms, invalid position and short stem',()=>{
 for(const patch of [{wingOffset:0},{wingOffset:13},{wingOffset:NaN},{length:7},{wingLength:8},{wingWidth:21},{valleySection:'bad'}])assert.ok(Object.keys(validate({...example,...patch})).length);
 assert.deepEqual(validate({...DEFAULTS,wingOffset:NaN}),{});
});
