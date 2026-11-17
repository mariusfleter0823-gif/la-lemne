import test from 'node:test';
import assert from 'node:assert/strict';
import { rasterizeDepth, projectFaces } from '../roof-render.mjs';
import { DEFAULTS, calculate } from '../roof-math.mjs';
import { buildRoofScene } from '../roof-scene.mjs';
const pixel=(r,x,y,w=24)=>[...r.pixels.slice((y*w+x)*4,(y*w+x)*4+4)];
const face=(points,color)=>({points,color,edgeColor:[0,0,0]});
const board=face([[6,4,5],[18,4,5],[18,18,5],[6,18,5]],[220,230,210]);
const beam=face([[1,8,.5],[22,8,11],[22,12,11],[1,12,.5]],[60,100,50]);
test('A long crossing beam is hidden behind the board and visible where it is nearer',()=>{
  const r=rasterizeDepth([board,beam],24,24,false);
  assert.deepEqual(pixel(r,7,10),[220,230,210,255]);
  assert.deepEqual(pixel(r,15,10),[60,100,50,255]);
  assert.deepEqual(pixel(r,3,10),[60,100,50,255]);
});
test('Opaque overlap is independent of insertion order, including sloped faces',()=>{
  assert.deepEqual(rasterizeDepth([board,beam],24,24,false).pixels,rasterizeDepth([beam,board],24,24,false).pixels);
});
test('A concealed beam outline cannot leak through an opaque board',()=>{
  const rear=face([[1,8,1],[22,8,1],[22,12,1],[1,12,1]],[60,100,50]);
  const r=rasterizeDepth([board,rear],24,24,true);
  assert.deepEqual(pixel(r,10,8),[220,230,210,255]);
  assert.deepEqual(pixel(r,3,8),[0,0,0,255]);
});
test('Hiding the board reveals the beam without deleting its geometry',()=>{
  assert.deepEqual(pixel(rasterizeDepth([beam],24,24,false),7,10),[60,100,50,255]);
});
test('All roof shapes, material combinations and rotations obey per-pixel nearest-surface visibility',()=>{
  const width=80,height=80;
  for(const config of [{shape:'tshape',length:18,width:6,wingWidth:8,wingLength:14,wingOffset:2},{shape:'ushape',length:18,width:6,wingWidth:5,wingLength:14,rightWingWidth:4,rightWingLength:12},{shape:'mono'},{shape:'gable'},{shape:'hip'},{shape:'lshape',wingWidth:6,wingLength:10},{shape:'lshape',wingWidth:3,wingLength:10},{shape:'lshape',width:3,wingWidth:6,wingLength:10}]) for(const mode of ['assembled','layers']) for(const yaw of [-.62,.95,2.52,4.09]) {
    const shape=config.shape,v={...DEFAULTS,length:8,width:6,...config},r=calculate(v),scene=buildRoofScene(v,r,mode);
    const colors={rafters:'#32502a',boards:'#dce6d2',counter:'#5d8754',battens:'#9fb778'};
    const raw=([x,y,z])=>[x*Math.cos(yaw)-y*Math.sin(yaw),(x*Math.sin(yaw)+y*Math.cos(yaw))*Math.sin(.49)-z*Math.cos(.49),(x*Math.sin(yaw)+y*Math.cos(yaw))*Math.cos(.49)+z*Math.sin(.49)];
    const points=scene.members.flatMap(m=>m.points).map(raw),minX=Math.min(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1]));
    const scale=70/Math.max(Math.max(...points.map(p=>p[0]))-minX,Math.max(...points.map(p=>p[1]))-minY);
    const project=p=>{const [x,y,z]=raw(p);return[5+(x-minX)*scale,5+(y-minY)*scale,z];};
    const projected=projectFaces(scene.members.flatMap(m=>m.faces.map(f=>({points:f.map(i=>m.points[i]),fill:colors[m.layer],stroke:colors[m.layer],opacity:1,layer:m.layer}))),project);
    const perLayer=Object.keys(colors).map(layer=>rasterizeDepth(projected.filter(f=>f.layer===layer),width,height,false));
    for(const layers of [['rafters','boards'],['rafters','boards','counter','battens'],['rafters','counter','battens']]) {
      const combined=rasterizeDepth(projected.filter(f=>layers.includes(f.layer)),width,height,false);
      for(let p=0;p<width*height;p++) {
        const expected=Math.max(...perLayer.filter((_,i)=>layers.includes(Object.keys(colors)[i])).map(r=>r.depth[p]));
        assert.equal(combined.depth[p],expected,`${shape}/${mode}/${yaw}: pixel ${p}`);
      }
    }
  }
});
