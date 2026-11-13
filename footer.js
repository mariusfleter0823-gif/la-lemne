(() => {
 const footer=document.querySelector('.site-footer'),main=document.querySelector('body>main');if(!footer||!main)return;
 const header=document.querySelector('.site-header');
 function fit(){document.body.dataset.footerReveal=String(footer.getBoundingClientRect().height<=innerHeight-20);}
 new ResizeObserver(fit).observe(footer);window.addEventListener('resize',fit,{passive:true});fit();
 function theme(){if(main.getBoundingClientRect().bottom<(header?.getBoundingClientRect().height||80)/2&&header)header.dataset.ink='light';}
 window.addEventListener('scroll',theme,{passive:true});theme();
 footer.addEventListener('focusin',event=>{if(event.target.matches(':focus-visible')&&event.target.getBoundingClientRect().top<main.getBoundingClientRect().bottom)window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});});
 footer.querySelector('[data-footer-year]').textContent=new Date().getFullYear();
})();

(() => {
 const details=document.querySelector('.footer-policies');if(!details)return;
 const summary=details.querySelector('summary'),panel=details.querySelector('.footer-legal');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let expanded=details.open,motion;
 summary.setAttribute('aria-expanded',String(expanded));
 function settle(show){details.open=show;panel.inert=!show;if(window.gsap)gsap.set(panel,{clearProps:'transform,opacity,visibility'});}
 function toggle(show){
  motion?.kill();expanded=show;summary.setAttribute('aria-expanded',String(show));
  if(!window.gsap||reduced.matches){settle(show);return;}
  const visible=details.open;details.open=true;panel.inert=!show;
  if(show&&!visible)gsap.set(panel,{autoAlpha:0,y:7,scale:.985,transformOrigin:'left bottom'});
  motion=gsap.to(panel,{autoAlpha:show?1:0,y:show?0:5,scale:show?1:.985,duration:show?.22:.16,ease:show?'power2.out':'power2.in',overwrite:'auto',onComplete:()=>settle(show)});
 }
 summary.addEventListener('click',event=>{event.preventDefault();toggle(!expanded);});
 details.addEventListener('keydown',event=>{if(event.key==='Escape'&&expanded){event.preventDefault();toggle(false);summary.focus({preventScroll:true});}});
 document.addEventListener('click',event=>{if(expanded&&!details.contains(event.target)&&!event.target.closest('#cookie-settings'))toggle(false);});
 reduced.addEventListener('change',()=>{motion?.kill();settle(expanded);});
})();


