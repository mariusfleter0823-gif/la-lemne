(() => {
  const wheel=document.querySelector('.benefits-wheel');
  if(!wheel)return;
  const windowEl=wheel.querySelector('.benefits-window');
  const lines=[...wheel.querySelectorAll('.benefit-line')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const phase={value:0};
  let focused=false,visible=false,hovered=false,tween,radius=140;
  function draw(){
    lines.forEach((line,index)=>{
      const slot=gsap.utils.wrap(-lines.length/2,lines.length/2,index-phase.value);
      const angle=slot*56,radians=angle*Math.PI/180;
      const facing=Math.max(0,Math.cos(radians));
      gsap.set(line,{y:radius*Math.sin(radians),z:radius*(Math.cos(radians)-1),rotationX:-angle,opacity:Math.pow(facing,2.7)});
    });
  }
  function sync(){if(tween)tween.paused(focused||hovered||!visible||document.hidden||reduced.matches);}
  function setup(){
    tween?.kill();tween=null;
    windowEl.classList.toggle('is-static',reduced.matches);
    gsap.set(lines,{clearProps:'transform,opacity,visibility'});
    if(reduced.matches)return;
    phase.value=0;radius=windowEl.clientHeight*.37;draw();
    tween=gsap.to(phase,{value:lines.length,duration:24,repeat:-1,ease:'none',paused:true,onUpdate:draw});
    sync();
  }
  wheel.addEventListener('focusin',()=>{focused=true;sync()});
  wheel.addEventListener('focusout',()=>{focused=false;sync()});
  wheel.addEventListener('pointerenter',()=>{hovered=true;sync()});
  wheel.addEventListener('pointerleave',()=>{hovered=false;sync()});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()},{threshold:.1}).observe(wheel);
  new ResizeObserver(()=>{if(!reduced.matches){radius=windowEl.clientHeight*.37;draw();}}).observe(windowEl);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',setup);
  setup();
})();
