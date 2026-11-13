(() => {
 const config=JSON.parse(document.querySelector('#product-config').textContent);
 const $=s=>document.querySelector(s),svg=$('#beam-drawing');
 const controls={w:$('#beam-width'),h:$('#beam-height'),l:$('#beam-length')};
 const mobile=matchMedia('(max-width:700px)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const params=new URLSearchParams(location.search),keys={w:'latime',h:'inaltime',l:'lungime'};
 const options={w:config.widths||Object.keys(config.sections||{}).map(Number),h:config.heights||[],l:config.lengths||[]};
 let state={...config.draw},shape={...state},tween;
 const fmt=n=>Number(n.toFixed(2)).toLocaleString('ro-RO'),cm=n=>fmt(n)+' cm';
 for(const k of ['w','h','l']){const n=Number(params.get(keys[k]));if(options[k].includes(n))state[k]=n;else if(options[k].length&&!options[k].includes(state[k]))state[k]=options[k][0];}
 function heightOptions(){return config.sections?config.sections[state.w]:options.h}
 if(heightOptions().length&&!heightOptions().includes(state.h))state.h=heightOptions()[0];
 function populate(k,list){const select=controls[k];select.replaceChildren();if(!list.length){select.add(new Option(k==='w'?'Variabilă':'La cerere',''));select.disabled=true;return;}select.disabled=false;for(const n of list)select.add(new Option(cm(k==='l'?n*100:n),n));select.value=state[k];}
 populate('w',options.w);populate('h',heightOptions());populate('l',options.l);
 const point=p=>p.map(n=>n.toFixed(2)).join(','),line=(a,b)=>`M${point(a)}L${point(b)}`,poly=ps=>`M${ps.map(point).join('L')}Z`,plus=(p,v)=>[p[0]+v[0],p[1]+v[1]];
 const path=(id,d)=>$('#'+id).setAttribute('d',d);
 function profile(s){
   if(config.kind==='lining'){const w=s.w,h=s.h,t=h*.27;return [[-w/2,-h/2],[-w/2+w*.08,-h/2],[-w/2+w*.1,-h/2+t],[w/2-w*.1,-h/2+t],[w/2-w*.08,-h/2],[w/2,-h/2],[w/2,-h*.2],[w/2+w*.045,-h*.2],[w/2+w*.045,h*.2],[w/2,h*.2],[w/2,h/2],[-w/2,h/2],[-w/2,h*.2],[-w/2+w*.045,h*.2],[-w/2+w*.045,-h*.2],[-w/2,-h*.2]];}
   return [[-s.w/2,-s.h/2],[s.w/2,-s.h/2],[s.w/2,s.h/2],[-s.w/2,s.h/2]];
 }
 function draw(){
   const s=shape,small=mobile.matches,plate=config.kind==='board'||config.kind==='unedged'||config.kind==='lining';
   const yaw=(small?(plate?34:30):(plate?48:40))*Math.PI/180,pitch=(small?(plate?24:20):(plate?17:10))*Math.PI/180,turn=(small?-12:0)*Math.PI/180,distance=small?(plate?110:75):(plate?1000:1200);
   const area=small?{x:65,y:80,w:350,h:455}:{x:60,y:62,w:880,h:225};
   function project([x,y,z]){const cx=Math.cos(yaw)*x+Math.sin(yaw)*z,cy=Math.sin(yaw)*Math.sin(pitch)*x+Math.cos(pitch)*y-Math.cos(yaw)*Math.sin(pitch)*z,cz=distance-Math.sin(yaw)*Math.cos(pitch)*x+Math.sin(pitch)*y+Math.cos(yaw)*Math.cos(pitch)*z;const px=cx/cz,py=cy/cz;return [px*Math.cos(turn)-py*Math.sin(turn),px*Math.sin(turn)+py*Math.cos(turn)];}
   const front=profile(s),all=front.flatMap(([x,y])=>[[x,y,0],[x,y,s.l*100]]).map(project);
   const minX=Math.min(...all.map(p=>p[0])),maxX=Math.max(...all.map(p=>p[0])),minY=Math.min(...all.map(p=>p[1])),maxY=Math.max(...all.map(p=>p[1]));
   const scale=Math.min(area.w/(maxX-minX),area.h/(maxY-minY)),ox=area.x+(area.w-(maxX-minX)*scale)/2,oy=area.y+(area.h-(maxY-minY)*scale)/2;
   const p=(x,y,z=0)=>{const a=project([x,y,z]);return [ox+(a[0]-minX)*scale,oy+(a[1]-minY)*scale]};
   const a=p(-s.w/2,-s.h/2),b=p(s.w/2,-s.h/2),c=p(s.w/2,s.h/2),farA=p(-s.w/2,-s.h/2,s.l*100),farB=p(s.w/2,-s.h/2,s.l*100),farC=p(s.w/2,s.h/2,s.l*100);
   // Straight illustrative edges keep the end faces and dimensions legible.
   // Unedged products still retain variable-width controls and product facts.
   path('beam-top',poly([a,farA,farB,b]));path('beam-side',poly([b,farB,farC,c]));
   path('beam-front',poly(front.map(([x,y])=>p(x,y))));
   let grain='';for(const t of (config.kind==='lining'?[.08,.1,.9,.92]:[.24,.67]))grain+=line(p(-s.w/2+s.w*t,-s.h/2),p(-s.w/2+s.w*t,-s.h/2,s.l*100));path('beam-grain',grain);
   const k=config.kind==='lining'?8:4,da=[800,485],db=[800+s.w*k,485],dd=[800,485+s.h*k];
   $('.beam-detail-drawing').setAttribute('viewBox',config.kind==='lining'?`670 410 ${s.w*k+150} ${Math.max(s.h*k+105,135)}`:`640 410 ${s.w*k+180} ${Math.max(s.h*k+105,135)}`);
   path('beam-section-path',poly(front.map(([x,y])=>[800+(x+s.w/2)*k,485+(y+s.h/2)*k])));
   const w1=plus(da,[0,-43]),w2=plus(db,[0,-43]),h1=plus(da,[-43,0]),h2=plus(dd,[-43,0]),l1=plus(a,[0,-36]),l2=plus(farA,[0,-36]);
   path('beam-dimension-width',line(w1,w2));path('beam-extension-width',line(da,plus(w1,[0,-8]))+line(db,plus(w2,[0,-8])));
   path('beam-dimension-height',line(h1,h2));path('beam-extension-height',line(da,plus(h1,[-8,0]))+line(dd,plus(h2,[-8,0])));
   path('beam-dimension-length',options.l.length?line(l1,l2):'');path('beam-extension-length',options.l.length?line(a,plus(l1,[0,-8]))+line(farA,plus(l2,[0,-8])):'');
   function label(id,x,y,text){const el=$('#'+id);el.setAttribute('x',x);el.setAttribute('y',y);el.textContent=text;}
   label('beam-label-width',(w1[0]+w2[0])/2,w1[1]-16,options.w.length?cm(state.w):'Variabilă');
   label('beam-label-height',h1[0]-17,(h1[1]+h2[1])/2+6,heightOptions().length?cm(state.h):'—');
   label('beam-label-length',(l1[0]+l2[0])/2,(l1[1]+l2[1])/2-18,options.l.length?cm(state.l*100):'');
 }
 function update(animate=true){
   const selections=[];if(options.w.length)selections.push('lățime '+cm(state.w));if(heightOptions().length)selections.push((config.kind==='batten'?'înălțime ':'grosime ')+cm(state.h));if(options.l.length)selections.push('lungime '+cm(state.l*100));
   $('#beam-selection').textContent=selections.length?selections.map((s,i)=>i?s:s[0].toUpperCase()+s.slice(1)).join(' · '):'Dimensiunile se stabilesc la ofertare.';
   $('#beam-svg-title').textContent=config.title+(selections.length?', '+selections.join(', '):'');
   document.querySelectorAll('[data-configurator-enquiry]').forEach(a=>{const product=config.title+(selections.length?' — '+selections.join(', '):'');a.dataset.product=product;if(a.hasAttribute('data-whatsapp-enquiry'))a.href='https://wa.me/40746820092?text='+encodeURIComponent(`Bună ziua! Doresc o ofertă pentru ${product}. Cantitate necesară: __ m³. Localitatea de livrare: __.`);});
   tween?.kill();if(animate&&!reduced.matches)tween=gsap.to(shape,{...state,duration:.45,ease:'power2.inOut',onUpdate:draw});else {Object.assign(shape,state);draw();}
   const url=new URL(location.href);for(const k of ['w','h','l']){if((k==='h'?heightOptions():options[k]).length)url.searchParams.set(keys[k],state[k]);else url.searchParams.delete(keys[k]);}history.replaceState(null,'',url);
 }
 for(const k of ['w','h','l'])controls[k].addEventListener('change',()=>{state[k]=Number(controls[k].value);if(k==='w'&&config.sections){if(!heightOptions().includes(state.h))state.h=heightOptions()[0];populate('h',heightOptions());}update();});
 function viewport(){svg.setAttribute('viewBox',mobile.matches?'0 0 480 720':'0 0 1000 340');draw();}
 mobile.addEventListener('change',viewport);reduced.addEventListener('change',()=>{tween?.kill();Object.assign(shape,state);draw();});Object.assign(shape,state);viewport();update(false);
})();
