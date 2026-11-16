import { facePolygon } from './roof-math.mjs';
// Schematic timber layers, never a cutting or structural assembly plan.
export const LAYERS = {
  rafters: { name: 'Căpriori', fill: '#abc79b', stroke: '#466740' },
  boards: { name: 'Astereală', fill: '#e1e9d7', stroke: '#7c8b68' },
  counter: { name: 'Contrașipci', fill: '#7ba77b', stroke: '#355d3e' },
  battens: { name: 'Leațuri', fill: '#c0d891', stroke: '#627841' }
};
const FACES = [[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]];
function prism(a, b, widthVector, normal, width, height, layer, kind = layer) {
  const points = [];
  for (const end of [a, b]) for (const [u, v] of [[-1,-1],[1,-1],[1,1],[-1,1]]) points.push(end.map((n,i) => n + u*widthVector[i]*width/2 + v*normal[i]*height/2));
  return { layer, kind, points, faces: FACES };
}
function slab(polygon, normal, height) {
  const points = [-1,1].flatMap(sign => polygon.map(p => p.map((n,i) => n + sign*normal[i]*height/2)));
  return { layer: 'boards', kind: 'boards', points, faces: [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]] };
}
const dot = (a,b) => a.reduce((n,x,i)=>n+x*b[i],0);
// Trim schematic timber at adjoining roof planes. Neither wider jack rafters
// nor larger hip sections should physically poke through continuous decking.
function clipToRoof(member, planes) {
  let polygons = member.faces.map(face=>face.map(i=>member.points[i]));
  for (const {normal,d} of planes) {
    const cut = [], next = [];
    for (const polygon of polygons) {
      const result = [];
      for (let i=0;i<polygon.length;i++) {
        const a=polygon[i],b=polygon[(i+1)%polygon.length],da=dot(normal,a)-d,db=dot(normal,b)-d;
        if (da<=1e-9) result.push(a);
        if ((da < -1e-9 && db > 1e-9)||(da > 1e-9 && db < -1e-9)) {
          const t=da/(da-db),p=a.map((x,j)=>x+(b[j]-x)*t); result.push(p); cut.push(p);
        }
      }
      if(result.length>=3)next.push(result);
    }
    const unique=cut.filter((p,i)=>!cut.slice(0,i).some(q=>Math.hypot(...p.map((x,j)=>x-q[j]))<1e-8));
    if(unique.length>=3) {
      const center=[0,1,2].map(i=>unique.reduce((n,p)=>n+p[i],0)/unique.length);
      const axis=Math.abs(normal[0])<.9?[1,0,0]:[0,1,0];
      const u=[normal[1]*axis[2]-normal[2]*axis[1],normal[2]*axis[0]-normal[0]*axis[2],normal[0]*axis[1]-normal[1]*axis[0]];
      const v=[normal[1]*u[2]-normal[2]*u[1],normal[2]*u[0]-normal[0]*u[2],normal[0]*u[1]-normal[1]*u[0]];
      const angle=p=>{const q=p.map((x,i)=>x-center[i]);return Math.atan2(dot(q,v),dot(q,u));};
      unique.sort((a,b)=>angle(a)-angle(b));next.push(unique);
    }
    polygons=next;
  }
  const points=[],faces=polygons.map(polygon=>polygon.map(p=>points.push(p)-1));
  return {...member,points,faces};
}
export function buildRoofScene(v, r, mode = 'layers') {
  const members = [], enabled = ['rafters','boards','counter','battens'].filter(k => k === 'rafters' || v[k]);
  const base = Math.min(1.4, v.width * .2), [beamWidth,beamHeight] = v.section.split('x').map(n => Number(n)/100);
  const gap = mode === 'layers' ? Math.max(.8, Math.min(1.8, Math.min(v.length,v.width)*.17)) : 0;
  const offsets = Object.fromEntries(enabled.map((key,i) => [key,i*gap]));
  const boardThickness = v.boards ? .025 : 0, counterThickness = v.counter ? .03 : 0;
  const normalOf = f => [-f.inward[0]*r.sin,-f.inward[1]*r.sin,r.cos];
  const shift = (p, normal, height, layer) => [p[0],p[1],p[2]+height/r.cos+base+(offsets[layer]||0)];
  const roofPlanes=r.layout.faces.map(f=>{const normal=normalOf(f);return {normal,d:dot(normal,[...f.origin,base])+beamHeight/2};});
  const footprintPlanes = r.layout.faces.map(face => {
    const polygon=facePolygon(face),center=[0,1].map(i=>polygon.reduce((sum,p)=>sum+p[i],0)/polygon.length);
    return polygon.map((a,i)=>{
      const b=polygon[(i+1)%polygon.length],normal=[b[1]-a[1],a[0]-b[0],0];
      if(dot(normal,[...center,0])>dot(normal,a))normal.forEach((n,j)=>normal[j]=-n);
      return {normal,d:dot(normal,a)};
    });
  });
  const trimFace=(member,index,under=false)=>v.shape==='lshape' ? clipToRoof(member,[...footprintPlanes[index],...(under?[roofPlanes[index]]:[])]) : under ? clipToRoof(member,roofPlanes) : member;
  for (const member of r.layout.rafters) for (const line of member.parts || [member]) {
    const face = r.layout.faces[line.face], normal = normalOf(face), across = [...face.along,0];
    members.push(trimFace(prism(shift(line.a,normal,0,'rafters'),shift(line.b,normal,0,'rafters'),across,normal,beamWidth,beamHeight,'rafters'),line.face,true));
    if (v.counter) {
      const h = beamHeight/2 + boardThickness + .015;
      members.push(trimFace(prism(shift(line.a,normal,h,'counter'),shift(line.b,normal,h,'counter'),across,normal,.05,.03,'counter'),line.face));
    }
  }
  for (const line of [...r.layout.hips.map(l=>({...l,kind:'hips'})),...r.layout.valleys.map(l=>({...l,kind:'valleys'}))]) {
    const [dx,dy,dz] = line.b.map((n,i) => n-line.a[i]), horizontal = Math.hypot(dx,dy), len = line.length;
    const across = [-dy/horizontal,dx/horizontal,0], normal = [-dx*dz/(horizontal*len),-dy*dz/(horizontal*len),horizontal/len];
    const [width,height] = (line.kind==='valleys'?v.valleySection:v.hipSection).split('x').map(n=>Number(n)/100);
    members.push(clipToRoof(prism(shift(line.a,normal,0,'rafters'),shift(line.b,normal,0,'rafters'),across,normal,width,height,'rafters',line.kind),line.faces?line.faces.map(i=>roofPlanes[i]):roofPlanes));
  }
  if (v.boards) for (const face of r.layout.faces) {
    const normal = normalOf(face), rows = Math.ceil(face.depth/.2 - 1e-9);
    for (let i=Math.floor((face.from||0)/.2+1e-9);i<rows;i++) {
      const polygon = facePolygon(face,Math.max(i*.2,face.from||0),Math.min((i+1)*.2,face.depth)).map(p=>shift(p,normal,beamHeight/2+.0125,'boards'));
      // Vertical extrusion joins adjacent roof faces without artificial ridge/hip
      // gaps; its perpendicular thickness remains exactly 25 mm.
      members.push(slab(polygon,[0,0,1],.025/r.cos));
    }
  }
  if (v.battens) for (const member of r.layout.battens) for (const line of member.parts || [member]) {
    const face = r.layout.faces[line.face], normal = normalOf(face), tangent = [face.inward[0]*r.cos,face.inward[1]*r.cos,r.sin];
    const h = beamHeight/2 + boardThickness + counterThickness + .015;
    members.push(trimFace(prism(shift(line.a,normal,h,'battens'),shift(line.b,normal,h,'battens'),tangent,normal,.05,.03,'battens'),line.face));
  }
  const edgeZ = (x,y) => {
    if(v.shape==='lshape') {
      const X=x+v.length/2,Y=y+v.wingLength/2;
      const run=Math.min(X,Y,Math.max(v.width-Y,v.wingWidth-X));
      return base+run*r.sin/r.cos;
    }
    return base + (v.shape === 'hip' ? Math.max(0,Math.min(v.length/2-Math.abs(x),v.width/2-Math.abs(y)))*r.sin/r.cos : v.shape === 'gable' ? r.rise*(1-Math.abs(y)/(v.width/2)) : r.rise*(y+v.width/2)/v.width);
  };
  const raised = p=>[p[0],p[1],p[2]+base];
  return { members, enabled, base, edgeZ, gap, offsets, footprint:r.layout.footprint, peaks:r.layout.ridge.map(raised), surfaces:r.layout.faces.map(f=>facePolygon(f).map(raised)) };
}
