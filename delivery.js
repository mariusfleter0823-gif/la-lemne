(() => {
 const section=document.querySelector('#livrare');if(!section)return;
 const svg=section.querySelector('.delivery-map-svg'),routes=[...section.querySelectorAll('.delivery-route')],cities=[...section.querySelectorAll('.delivery-city')],counties=[...section.querySelectorAll('.delivery-county')],traveller=section.querySelector('.delivery-traveller'),quote=section.querySelector('.delivery-quote'),arrival=section.querySelector('.delivery-arrival'),halo=arrival.querySelector('.delivery-arrival-halo'),ripple=arrival.querySelector('.delivery-arrival-ripple');
 const compact=matchMedia('(max-width:1100px)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const lengths=new Map(routes.map(path=>[path,path.getTotalLength()]));
 let active='cs',selected=null,visible=false,entered=false,ready=false,packet,entrance,remaining=[];
 function shuffle(keys){for(let i=keys.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[keys[i],keys[j]]=[keys[j],keys[i]];}return keys;}
 function next(){if(!remaining.length)remaining=shuffle(cities.map(c=>c.dataset.destination));if(remaining[0]===active&&remaining.length>1)[remaining[0],remaining[1]]=[remaining[1],remaining[0]];return remaining.shift();}
 function highlight(key){active=key;const city=cities.find(c=>c.dataset.destination===key);routes.forEach(r=>r.classList.toggle('is-active',r.dataset.route===key));cities.forEach(c=>c.classList.toggle('is-active',c===city));counties.forEach(c=>c.classList.toggle('is-active',c.dataset.mapCounty===city.dataset.county));svg.dataset.activeDestination=key;}
 function stop(){packet?.kill();packet=null;traveller.style.opacity='0';halo.style.opacity='0';ripple.style.opacity='0';}
 function run(){
  stop();if(!ready||!visible||document.hidden||reduced.matches||!window.gsap)return;
  const path=routes.find(r=>r.dataset.route===active),length=lengths.get(path),end=path.getPointAtLength(length),travel={t:0};
  const position=()=>{const p=path.getPointAtLength(length*travel.t);traveller.setAttribute('cx',p.x);traveller.setAttribute('cy',p.y);};
  position();arrival.setAttribute('transform',`translate(${end.x},${end.y})`);
  packet=gsap.timeline({delay:.15,onComplete:()=>{packet=null;highlight(next());run();}});
  packet.set(traveller,{opacity:1},0)
   .to(travel,{t:1,duration:2.15,ease:'power1.inOut',onUpdate:position},0)
   .addLabel('arrive')
   .set(halo,{attr:{r:6},opacity:.26},'arrive')
   .set(ripple,{attr:{r:11},opacity:.65},'arrive')
   .to(halo,{attr:{r:35},opacity:0,duration:.85,ease:'power2.out'},'arrive')
   .to(ripple,{attr:{r:40},opacity:0,duration:.95,ease:'power2.out'},'arrive')
   .to(traveller,{opacity:0,duration:.18},'arrive+=.08');
 }
 function setPreview(city){const key=city.dataset.destination;if(active===key&&packet)return;highlight(key);run();}
 function select(city){selected=city.dataset.destination;cities.forEach(c=>{const isSelected=c===city;c.classList.toggle('is-selected',isSelected);c.setAttribute('aria-pressed',String(isSelected));});quote.dataset.product='material lemnos cu livrare în '+city.dataset.city+' ('+city.dataset.countyName+')';if(active!==selected){highlight(selected);run();}}
 cities.forEach(city=>{city.setAttribute('aria-pressed','false');city.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')setPreview(city);});city.addEventListener('focus',()=>setPreview(city));city.addEventListener('click',()=>select(city));city.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(city);}});});
 quote.dataset.product='material lemnos cu livrare';remaining=shuffle(cities.map(c=>c.dataset.destination).filter(key=>key!==active));highlight(active);
 function viewport(){svg.setAttribute('viewBox',compact.matches?'45 100 550 550':'0 0 860 700');}viewport();compact.addEventListener('change',viewport);
 function reveal(){if(entered)return;entered=true;if(reduced.matches||!window.gsap){ready=true;return;}routes.forEach(path=>gsap.set(path,{strokeDasharray:lengths.get(path),strokeDashoffset:lengths.get(path)}));entrance=gsap.to(routes,{strokeDashoffset:0,duration:1.1,stagger:.1,ease:'power2.out',onComplete:()=>{routes.forEach(path=>{path.style.strokeDasharray='';path.style.strokeDashoffset='';});ready=true;run();}});}
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)reveal();run();},{threshold:.15}).observe(section.querySelector('.delivery-map'));
 document.addEventListener('visibilitychange',run);
 reduced.addEventListener('change',()=>{if(reduced.matches){entrance?.progress(1);stop();}else run();});
})();
