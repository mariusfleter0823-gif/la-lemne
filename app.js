const video=document.querySelector('#hero-video');
const videoToggle=document.querySelector('#video-toggle');
const videoToggleText=document.querySelector('#video-toggle-text');
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let manuallyPaused=false;
let videoIsVisible=true;
function reflectVideoState(){const paused=video.paused;videoToggle.classList.toggle('is-paused',paused);videoToggle.setAttribute('aria-pressed',String(paused));videoToggle.setAttribute('aria-label',paused?'Redă videoclipul':'Pune videoclipul pe pauză');videoToggleText.textContent=paused?'Redă':'Pauză'}
function tryPlay(){if(!video){window.location.href='/la-lemne/';return}if(!videoIsVisible){video.pause();return}video.play().catch(()=>reflectVideoState())}
if(video){
video.muted=true;
if(reducedMotion.matches){video.autoplay=false;video.pause()}else{tryPlay()}
video.addEventListener('play',reflectVideoState);
video.addEventListener('pause',reflectVideoState);
video.addEventListener('error',()=>{video.style.opacity='0';document.querySelector('.hero').style.backgroundImage="url('assets/hero-poster.jpg')";document.querySelector('.hero').style.backgroundSize='cover';videoToggle.hidden=true});
videoToggle.addEventListener('click',()=>{if(video.paused){manuallyPaused=false;tryPlay()}else{manuallyPaused=true;video.pause()}});
reducedMotion.addEventListener('change',e=>{if(e.matches){video.pause()}else if(!manuallyPaused){tryPlay()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){video.pause()}else if(!manuallyPaused&&!reducedMotion.matches){tryPlay()}});
new IntersectionObserver(entries=>{videoIsVisible=entries[0].isIntersecting;if(!videoIsVisible)video.pause();else if(!manuallyPaused&&!reducedMotion.matches&&!document.hidden)tryPlay();},{threshold:0}).observe(video.closest('.hero'));
reflectVideoState();
}

const menu=document.querySelector('#site-menu');
const menuToggle=document.querySelector('.menu-toggle');
const closeMenu=document.querySelector('.menu-close');
const offer=document.querySelector('#offer-dialog');
const offerClose=document.querySelector('.offer-close');
let offerOpener=null;
function syncDialogState(){document.body.classList.toggle('dialog-is-open',menu.open||offer.open)}
let menuTimeline=null;
let menuPhase='closed';
let afterMenuClose=null;
const navigation=window.laLemneNavigation;
let menuItems=[];
let menuSupporting=[];
function setMenuPhase(phase){menuPhase=phase;menu.dataset.motion=phase}
function finishMenuClose(){
  const next=afterMenuClose;
  afterMenuClose=null;
  menuTimeline?.pause(0);
  setMenuPhase('closed');
  if(menu.open)menu.close();
  syncDialogState();
  next?.();
}
function buildMenuTimeline(atEnd=false){
    menuTimeline?.kill();
    menuItems=navigation.getItems();menuSupporting=navigation.getSupporting();
    menuTimeline=gsap.timeline({
      id:'navigation-menu',paused:true,defaults:{ease:'power3.out'},
      onComplete:()=>setMenuPhase('open'),onReverseComplete:finishMenuClose
    });
    menuTimeline.addLabel('panel',0)
      .fromTo(menu,{yPercent:-100},{yPercent:0,duration:.34,ease:'power3.inOut'},'panel')
      .addLabel('links',.26)
      .fromTo(menuItems,{x:-42,autoAlpha:0},{x:0,autoAlpha:1,duration:.24,stagger:menuItems.length>4?.025:.045},'links');
    if(menuSupporting.length)menuTimeline.fromTo(menuSupporting,{autoAlpha:0},{autoAlpha:1,duration:.16},'links+=0.04');
    if(atEnd){menuTimeline.progress(1).pause();setMenuPhase('open')}
}
navigation.onPageChange=()=>{if(menu.open&&menuPhase==='open'&&window.gsap&&!reducedMotion.matches)buildMenuTimeline(true)};
if(window.gsap){
  const menuMedia=gsap.matchMedia();
  menuMedia.add({all:'(min-width: 0px)',isMobile:'(max-width: 700px)',reduceMotion:'(prefers-reduced-motion: reduce)'},context=>{
    if(menuPhase==='closing')finishMenuClose();
    if(context.conditions.reduceMotion){
      menuTimeline=null;
      gsap.set([menu,...navigation.getItems(),...navigation.getSupporting()],{clearProps:'transform,opacity,visibility'});
      if(menu.open)setMenuPhase('open');
      return;
    }
    buildMenuTimeline(menu.open);
    return ()=>{menuTimeline?.kill();menuTimeline=null};
  });
}
function requestMenuClose(next){
  if(next)afterMenuClose=next;
  navigation.settle();
  if(!menu.open||!menuTimeline||reducedMotion.matches||menuTimeline.time()<=.001){finishMenuClose();return}
  if(menuPhase==='closing')return;
  setMenuPhase('closing');
  // Reverse the same sequence, slightly faster: links left, panel up.
  menuTimeline.timeScale(1.25).reverse();
}
menuToggle.addEventListener('click',()=>{
  afterMenuClose=null;
  navigation.reset();
  if(window.gsap&&!reducedMotion.matches)buildMenuTimeline();
  menu.style.setProperty('--nav-toggle-width',menuToggle.offsetWidth+'px');menu.showModal();menu.scrollTop=0;
  menuToggle.setAttribute('aria-expanded','true');syncDialogState();
  closeMenu.focus({preventScroll:true});
  if(menuTimeline&&!reducedMotion.matches){setMenuPhase('opening');menuTimeline.timeScale(1).restart()}
  else setMenuPhase('open');
});
closeMenu.addEventListener('click',()=>requestMenuClose());
menu.addEventListener('cancel',event=>{event.preventDefault();requestMenuClose()});
menu.addEventListener('close',()=>{menuTimeline?.pause(0);setMenuPhase('closed');menuToggle.setAttribute('aria-expanded','false');syncDialogState();if(!offer.open)menuToggle.focus({preventScroll:true})});
document.querySelectorAll('[data-home-link]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();requestMenuClose(()=>{if(location.pathname==='/la-lemne/'||location.pathname==='/la-lemne/index.html')window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'});else location.assign('/la-lemne/');})}));
document.querySelector('.film-link').addEventListener('click',()=>requestMenuClose(()=>{manuallyPaused=false;tryPlay()}));
let offerMotion;
let offerPhase='closed';
const offerContent=[...offer.children].filter(el=>el!==offerClose);
function requestOfferClose(){
 if(!offer.open||offerPhase==='closing')return;
 offerMotion?.kill();offerPhase='closing';
 if(reducedMotion.matches||!window.gsap){offer.close();return;}
 offerMotion=gsap.timeline({onComplete:()=>offer.close()})
  .to(offer,{opacity:0,y:12,scale:.985,duration:.22,ease:'power2.in'},0)
  .to(offer,{'--offer-dim':0,'--offer-blur':'0px',duration:.22,ease:'power2.inOut'},0);
}
function openOffer(opener,product){
 if(offer.open)return;
 offerOpener=menu.open?menuToggle:opener;
 const showOffer=()=>{
  document.querySelector('#offer-description').textContent=product?`Pentru ${product.toLowerCase()}, trimite-ne dimensiunile, cantitățile și localitatea de livrare.`:'Trimite-ne lista cu produsele, dimensiunile, cantitățile și localitatea de livrare.';
  document.querySelector('.offer-whatsapp').href=`https://wa.me/40758901523?text=${encodeURIComponent(product?`Bună ziua! Doresc o ofertă pentru ${product.toLowerCase()}.`:'Bună ziua! Doresc o ofertă pentru material lemnos.')}`;
  offerMotion?.kill();offerPhase='opening';
  if(!reducedMotion.matches&&window.gsap){
   gsap.set(offer,{opacity:0,y:24,scale:.965,'--offer-dim':0,'--offer-blur':'0px',transformOrigin:'50% 50%'});
   gsap.set(offerContent,{opacity:0,y:8});
  }
  offer.showModal();syncDialogState();
  if(!reducedMotion.matches&&window.gsap){
   offerMotion=gsap.timeline({onComplete:()=>{offerPhase='open';gsap.set(offerContent,{clearProps:'opacity,transform'});}})
    .to(offer,{'--offer-dim':.48,'--offer-blur':'4px',duration:.35,ease:'power2.out'},0)
    .to(offer,{opacity:1,y:0,scale:1,duration:.44,ease:'power3.out'},0)
    .to(offerContent,{opacity:1,y:0,duration:.28,stagger:.025,ease:'power2.out'},.08);
  }else offerPhase='open';
  offerClose.focus({preventScroll:true});
 };
 if(menu.open)requestMenuClose(showOffer);else showOffer();
}
document.querySelectorAll('[data-offer-link],[data-product]').forEach(link=>link.addEventListener('click',e=>{if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();openOffer(link,link.dataset.product)}));
offerClose.addEventListener('click',requestOfferClose);
offer.addEventListener('cancel',e=>{e.preventDefault();requestOfferClose();});
offer.addEventListener('close',()=>{offerMotion?.kill();offerPhase='closed';if(window.gsap){gsap.set(offer,{clearProps:'opacity,transform,--offer-dim,--offer-blur'});gsap.set(offerContent,{clearProps:'opacity,transform'});}syncDialogState();offerOpener?.focus({preventScroll:true})});
offer.addEventListener('click',e=>{if(e.target!==offer)return;const r=offer.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)requestOfferClose()});
for(const dialog of [menu,offer])dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[...dialog.querySelectorAll('button,a[href],summary')].filter(el=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden');const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}});

// Sections declare their text colour; the transparent header follows it.
const header=document.querySelector('.site-header');
// Reveal navigation on upward intent; ignore tiny scroll reversals and mobile overscroll.
(()=>{
 let previous=scrollY,direction=0,distance=0,hidden=false,scheduled=false;
 const limit=()=>Math.max(0,document.documentElement.scrollHeight-innerHeight);
 function reveal(hide){
  if(hidden===hide)return;hidden=hide;header.dataset.scrollHidden=String(hide);
  if(window.gsap)gsap.to(header,{yPercent:hide?-125:0,duration:reducedMotion.matches?0:(hide?.24:.3),ease:'power2.out',overwrite:true});
  else header.style.transform=hide?'translateY(-125%)':'';
 }
 function reset(){previous=Math.min(limit(),Math.max(0,scrollY));distance=0;direction=0;reveal(false);}
 function update(){
  scheduled=false;const y=Math.min(limit(),Math.max(0,scrollY)),delta=y-previous;previous=y;
  if(menu.open||offer.open||header.querySelector(':focus-visible')||y<80){distance=0;direction=0;reveal(false);return;}
  if(!delta)return;const next=Math.sign(delta);if(next!==direction){distance=0;direction=next;}distance+=Math.abs(delta);
  if(next>0&&y>header.offsetHeight+24&&distance>=12)reveal(true);
  else if(next<0&&distance>=8)reveal(false);
 }
 window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}},{passive:true});
 header.addEventListener('focusin',()=>reveal(false));
 new MutationObserver(()=>{if(menu.open||offer.open)reset();}).observe(document.body,{attributes:true,attributeFilter:['class']});
 window.addEventListener('pageshow',reset);window.addEventListener('resize',reset,{passive:true});
})();
let sectionObserver;
function headerSample(){return (parseFloat(getComputedStyle(header).top)||0)+header.offsetHeight/2;}
function resolveHeaderTheme(theme){if(theme!=='split'||innerWidth>700)return theme;const sample=headerSample();return document.querySelector('.depot-contact').getBoundingClientRect().bottom>sample?'dark':'light'}
function observeHeaderTheme(){sectionObserver?.disconnect();const sample=Math.round(headerSample());sectionObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)header.dataset.ink=resolveHeaderTheme(entry.target.dataset.headerTheme)},{rootMargin:`-${sample}px 0px -${Math.max(0,window.innerHeight-sample-1)}px 0px`,threshold:0});document.querySelectorAll('[data-header-theme]').forEach(section=>sectionObserver.observe(section))}
observeHeaderTheme();
new ResizeObserver(observeHeaderTheme).observe(header);
window.addEventListener('resize',observeHeaderTheme,{passive:true});
window.addEventListener('scroll',()=>{const split=document.querySelector('[data-header-theme="split"]');if(!split)return;const rect=split.getBoundingClientRect(),sample=headerSample();if(rect.top<=sample&&rect.bottom>sample)header.dataset.ink=resolveHeaderTheme('split')},{passive:true});

// Product breadcrumbs retain the catalogue filters they were opened from.
(() => {
  const back=document.querySelector('.beam-breadcrumb>a');
  if(!back)return;
  const params=new URLSearchParams(location.search);
  let destination=null;
  function catalogueUrl(value){
    if(!value)return null;
    try{const url=new URL(value,location.origin);return url.origin===location.origin&&url.pathname==='/la-lemne/produse.html'?url.pathname+url.search+url.hash:null}catch{return null}
  }
  destination=catalogueUrl(params.get('inapoi'))||catalogueUrl(document.referrer);
  if(!destination&&['roof','terrace','elevation'].includes(params.get('proiect'))){back.href='/la-lemne/#proiecte';back.textContent='Înapoi la proiecte';return;}
  back.href=destination||'/la-lemne/produse.html';
  back.textContent='Înapoi la produse';
})();
