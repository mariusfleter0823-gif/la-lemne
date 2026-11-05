(() => {
  const gallery=document.querySelector('.collection-gallery');
  const panels=[...gallery.querySelectorAll('.collection-panel')];
  const hover=window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const reveals=new Map();
  gsap.registerPlugin(SplitText);
  let active=null;
  function sizeDetails(panel){
    const paragraph=panel.querySelector('.collection-details p');
    const content=panel.querySelector('.collection-content');
    const gap=parseFloat(getComputedStyle(gallery).gap)||0;
    const mobile=matchMedia('(max-width:700px)').matches;
    const weight=matchMedia('(max-width:1000px)').matches?1.75:1.6;
    const panelWidth=mobile?panel.clientWidth:(gallery.clientWidth-gap*2)*weight/(weight+.78*2);
    const inset=parseFloat(getComputedStyle(content).left)+parseFloat(getComputedStyle(content).right);
    const measure=paragraph.cloneNode(false);
    measure.removeAttribute('id');
    measure.removeAttribute('aria-label');
    measure.textContent=paragraph.getAttribute('aria-label')||paragraph.textContent;
    Object.assign(measure.style,{position:'absolute',visibility:'hidden',width:`${panelWidth-inset}px`,margin:'0',height:'auto'});
    paragraph.parentElement.append(measure);
    const height=measure.getBoundingClientRect().height;
    measure.remove();
    const linkHeight=panel.querySelector('.collection-details a').offsetHeight;
    content.style.setProperty('--details-height',`${Math.ceil(18+height+18+linkHeight+2)}px`);
  }
  function clearReveal(panel){
    const reveal=reveals.get(panel);
    if(!reveal)return;
    reveal.split.revert();
    gsap.set(panel.querySelector('.collection-details a'),{clearProps:'transform,opacity,visibility'});
    reveals.delete(panel);
  }
  function revealParagraph(panel){
    if(reduced.matches)return;
    const link=panel.querySelector('.collection-details a');
    const split=SplitText.create(panel.querySelector('.collection-details p'),{
      type:'lines',mask:'lines',linesClass:'collection-line',autoSplit:true,
      onSplit(self){
        return gsap.timeline({id:'collection-lines',delay:.2})
          .fromTo(self.lines,{yPercent:105,autoAlpha:0},{yPercent:0,autoAlpha:1,duration:.48,stagger:.085,ease:'power2.out'})
          .fromTo(link,{y:7,autoAlpha:0},{y:0,autoAlpha:1,duration:.3,ease:'power2.out'},'<0.16');
      }
    });
    reveals.set(panel,{split});
  }
  function activate(panel){
    if(active===panel)return;
    if(active)clearReveal(active);
    active=panel;gallery.classList.toggle('has-active',Boolean(panel));
    if(panel)sizeDetails(panel);
    panels.forEach(item=>{const expanded=item===panel;item.classList.toggle('is-active',expanded);item.querySelector('.collection-expand').setAttribute('aria-expanded',String(expanded));const details=item.querySelector('.collection-details');details.inert=!expanded;details.setAttribute('aria-hidden',String(!expanded))});
    if(panel)revealParagraph(panel);
  }
  panels.forEach(panel=>{
    panel.addEventListener('pointerenter',()=>{if(hover.matches)activate(panel)});
    panel.querySelector('.collection-expand').addEventListener('click',()=>activate(panel));
  });
  // One collection always stays selected, including after pointer/focus leave.
  hover.addEventListener('change',()=>{if(active)sizeDetails(active)});
  activate(panels[0]);
  document.fonts.ready.then(()=>{if(active)sizeDetails(active)});
  let resizeTimer;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(active)sizeDetails(active)},150)});
  reduced.addEventListener('change',()=>{if(active){clearReveal(active);if(!reduced.matches)revealParagraph(active)}});
})();
