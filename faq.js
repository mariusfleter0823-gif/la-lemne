(() => {
 const section=document.querySelector('#intrebari');if(!section)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),items=[...section.querySelectorAll('.faq-item')];
 function toggle(item,open){
  item.dataset.expanded=String(open);
  const panel=item.querySelector('.faq-answer');
  if(!window.gsap||reduced.matches){item.open=open;panel.style.height='';return;}
  gsap.killTweensOf(panel);
  if(open){const from=item.open?panel.getBoundingClientRect().height:0;panel.style.height=from+'px';item.open=true;const to=panel.scrollHeight;gsap.to(panel,{height:to,duration:.4,ease:'power2.inOut',onComplete:()=>{panel.style.height='';}});}
  else gsap.to(panel,{height:0,duration:.4,ease:'power2.inOut',onComplete:()=>{item.open=false;panel.style.height='';}});
 }
 items.forEach(item=>item.querySelector('summary').addEventListener('click',e=>{e.preventDefault();const open=item.dataset.expanded!=='true';items.filter(other=>other!==item&&other.dataset.expanded==='true').forEach(other=>toggle(other,false));toggle(item,open);}));
 if(window.gsap&&window.ScrollTrigger){gsap.registerPlugin(ScrollTrigger);gsap.matchMedia().add({motion:'(prefers-reduced-motion: no-preference)',desktop:'(min-width:1101px)',tablet:'(min-width:701px) and (max-width:1100px)',phone:'(max-width:700px)'},context=>{if(!context.conditions.motion)return;section.querySelectorAll('[data-faq-drift]').forEach(photo=>{const drift=context.conditions.phone?-65:Number(photo.dataset.faqDrift)*2.8;if(getComputedStyle(photo).display!=='none')gsap.fromTo(photo,{y:-drift/2},{y:drift/2,ease:'none',scrollTrigger:{trigger:section,start:'top bottom',end:'bottom top',scrub:.75,invalidateOnRefresh:true}});});});}
})();
