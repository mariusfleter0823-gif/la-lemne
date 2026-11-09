(() => {
  const sections={8:[8,10,15],10:[10,12,15,20],12:[12],15:[15,20,25],20:[20]};
  const width=document.querySelector('#beam-width'),height=document.querySelector('#beam-height'),length=document.querySelector('#beam-length');
  const svg=document.querySelector('#beam-drawing'),status=document.querySelector('#beam-selection');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const mobile=matchMedia('(max-width:700px)');
  function drawingViewport(){svg.setAttribute('viewBox',mobile.matches?'0 0 480 720':'0 0 1000 340')}
  const params=new URLSearchParams(location.search);
  let state={w:Number(params.get('latime'))||10,h:Number(params.get('inaltime'))||10,l:Number(params.get('lungime'))||6};
  if(!sections[state.w])state.w=10;
  if(!sections[state.w].includes(state.h))state.h=sections[state.w][0];
  if(![3,4,5,6,7,8,9,10].includes(state.l))state.l=6;
  let tween;
  const shape={...state};
  const node=id=>document.querySelector('#'+id);
  const point=p=>p.map(n=>n.toFixed(2)).join(',');
  const plus=(p,v)=>[p[0]+v[0],p[1]+v[1]];
  const line=(a,b)=>`M${point(a)}L${point(b)}`;
  const polygon=points=>`M${points.map(point).join('L')}Z`;
  function perspectiveGeometry(s){
    // Pinhole projection: the near end faces the camera and depth recedes naturally.
    const small=mobile.matches;
    const yaw=(small?30:40)*Math.PI/180,pitch=(small?20:10)*Math.PI/180,turn=(small?-12:0)*Math.PI/180,distance=small?65:1200;
    const area=small?{x:70,y:80,w:340,h:460}:{x:60,y:60,w:880,h:230};
    function project([x,y,z]){
      const cx=Math.cos(yaw)*x+Math.sin(yaw)*z;
      const cy=Math.sin(yaw)*Math.sin(pitch)*x+Math.cos(pitch)*y-Math.cos(yaw)*Math.sin(pitch)*z;
      const cz=distance-Math.sin(yaw)*Math.cos(pitch)*x+Math.sin(pitch)*y+Math.cos(yaw)*Math.cos(pitch)*z;
      const px=cx/cz,py=cy/cz;
      return [px*Math.cos(turn)-py*Math.sin(turn),px*Math.sin(turn)+py*Math.cos(turn)];
    }
    const raw=[[-s.w/2,-s.h/2,0],[s.w/2,-s.h/2,0],[s.w/2,s.h/2,0],[-s.w/2,s.h/2,0],[-s.w/2,-s.h/2,s.l*100],[s.w/2,-s.h/2,s.l*100],[s.w/2,s.h/2,s.l*100]].map(project);
    const minX=Math.min(...raw.map(p=>p[0])),maxX=Math.max(...raw.map(p=>p[0])),minY=Math.min(...raw.map(p=>p[1])),maxY=Math.max(...raw.map(p=>p[1]));
    const scale=Math.min(area.w/(maxX-minX),area.h/(maxY-minY));
    const ox=area.x+(area.w-(maxX-minX)*scale)/2,oy=area.y+(area.h-(maxY-minY)*scale)/2;
    const [a,b,c,d,farA,farB,farC]=raw.map(p=>[ox+(p[0]-minX)*scale,oy+(p[1]-minY)*scale]);
    const u=[b[0]-a[0],b[1]-a[1]],v=[d[0]-a[0],d[1]-a[1]],depth=[farA[0]-a[0],farA[1]-a[1]];
    return {a,b,c,d,farA,farB,farC,u,v,depth,top:[a,farA,farB,b],front:[a,b,c,d],side:[b,farB,farC,c]};
  }
  function geometry(s){
    return perspectiveGeometry(s);
  }
  function sectionGeometry(s){const a=[800,485],b=[800+s.w*4,485],c=[800+s.w*4,485+s.h*4],d=[800,485+s.h*4];return {a,b,c,d}}
  function draw(){
    const g=geometry(shape);
    node('beam-top').setAttribute('d',polygon(g.top));
    node('beam-front').setAttribute('d',polygon(g.front));
    node('beam-side').setAttribute('d',polygon(g.side));
    let grain='';for(const t of [.25,.65]){const p=plus(g.a,[g.u[0]*t,g.u[1]*t]);const q=plus(g.farA,[(g.farB[0]-g.farA[0])*t,(g.farB[1]-g.farA[1])*t]);grain+=line(p,q)}
    node('beam-grain').setAttribute('d',grain);
    const detail=sectionGeometry(shape);
    document.querySelector('.beam-detail-drawing').setAttribute('viewBox',`640 410 ${shape.w*4+180} ${shape.h*4+105}`);
    node('beam-section-path').setAttribute('d',polygon([detail.a,detail.b,detail.c,detail.d]));
    const w1=plus(detail.a,[0,-43]),w2=plus(detail.b,[0,-43]);
    const h1=plus(detail.a,[-43,0]),h2=plus(detail.d,[-43,0]);
    const l1=plus(g.a,[0,-36]),l2=plus(g.farA,[0,-36]);
    node('beam-extension-width').setAttribute('d',line(detail.a,plus(w1,[0,-8]))+line(detail.b,plus(w2,[0,-8])));
    node('beam-extension-height').setAttribute('d',line(detail.a,plus(h1,[-8,0]))+line(detail.d,plus(h2,[-8,0])));
    node('beam-extension-length').setAttribute('d',line(g.a,plus(l1,[0,-8]))+line(g.farA,plus(l2,[0,-8])));
    node('beam-dimension-width').setAttribute('d',line(w1,w2));
    node('beam-dimension-height').setAttribute('d',line(h1,h2));
    node('beam-dimension-length').setAttribute('d',line(l1,l2));
    function label(id,x,y,text){const el=node(id);el.setAttribute('x',x);el.setAttribute('y',y);el.textContent=text}
    label('beam-label-width',(w1[0]+w2[0])/2,w1[1]-16,`${state.w} cm`);
    label('beam-label-height',h1[0]-17,(h1[1]+h2[1])/2+6,`${state.h} cm`);
    label('beam-label-length',(l1[0]+l2[0])/2,(l1[1]+l2[1])/2-18,`${state.l*100} cm`);
  }
  function heights(){height.replaceChildren(...sections[state.w].map(h=>{const option=document.createElement('option');option.value=h;option.textContent=`${h} cm`;option.selected=h===state.h;return option}))}
  function update(change=true){
    width.value=state.w;height.value=state.h;length.value=state.l;
    status.textContent=`Secțiune ${state.w} × ${state.h} cm · lungime ${state.l*100} cm`;
    node('beam-svg-title').textContent=`Grindă cu lățimea ${state.w} cm, înălțimea ${state.h} cm și lungimea ${state.l*100} cm`;
    svg.dataset.widthMm=state.w*10;svg.dataset.heightMm=state.h*10;svg.dataset.lengthMm=state.l*1000;
    document.querySelectorAll('[data-configurator-enquiry]').forEach(a=>{const product=`grindă ${state.w} × ${state.h} cm, lungime ${state.l*100} cm`;a.dataset.product=product;if(a.hasAttribute('data-whatsapp-enquiry'))a.href='https://wa.me/40746820092?text='+encodeURIComponent(`Bună ziua! Doresc o ofertă pentru ${product}. Cantitate necesară: __ m³. Localitatea de livrare: __.`);});
    tween?.kill();
    if(change&&!reduced.matches)tween=gsap.to(shape,{...state,duration:.45,ease:'power2.inOut',onUpdate:draw});else{Object.assign(shape,state);draw()}
    if(change){const url=new URL(location.href);url.searchParams.set('latime',state.w);url.searchParams.set('inaltime',state.h);url.searchParams.set('lungime',state.l);history.replaceState(null,'',url)}
  }
  width.addEventListener('change',()=>{state.w=Number(width.value);if(!sections[state.w].includes(state.h))state.h=sections[state.w].reduce((best,h)=>Math.abs(h-state.h)<Math.abs(best-state.h)?h:best);heights();update()});
  height.addEventListener('change',()=>{state.h=Number(height.value);update()});
  length.addEventListener('change',()=>{state.l=Number(length.value);update()});
  reduced.addEventListener('change',()=>{tween?.kill();Object.assign(shape,state);draw()});
  mobile.addEventListener('change',()=>{drawingViewport();draw()});
  [...width.options].forEach(o=>o.textContent=`${o.value} cm`);
  [...length.options].forEach(o=>o.textContent=`${o.value*100} cm`);
  drawingViewport();heights();update(false);
})();

