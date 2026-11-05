(() => {
  const section=document.querySelector('#proiecte');
  const tabs=[...section.querySelectorAll('[role="tab"]')];
  const panels=[...section.querySelectorAll('[role="tabpanel"]')];
  const indicator=section.querySelector('.project-tab-indicator');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  section.querySelectorAll('.project-product-photo').forEach(photo=>{const ready=()=>{if(photo.naturalWidth)photo.classList.add('is-ready')};photo.addEventListener('load',ready,{once:true});if(photo.complete)ready();});
  let current=0,transition;
  function positionIndicator(){const tab=tabs[current];gsap.to(indicator,{x:tab.offsetLeft,width:tab.offsetWidth,duration:reduced.matches?0:.35,ease:'power2.out',overwrite:true})}
  function select(index,focus=false){
    if(focus)tabs[index].focus({preventScroll:true});
    if(index===current)return;
    transition?.kill();
    const previous=panels[current];
    gsap.set(previous,{clearProps:'opacity,transform'});
    previous.hidden=true;
    current=index;
    tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1});
    const next=panels[index];next.hidden=false;
    positionIndicator();
    const enquiry=section.querySelector('.project-enquiry [data-product]');if(enquiry)enquiry.dataset.product=['lemn pentru acoperiș','lemn pentru structura și acoperirea terasei','lemn pentru cofraje de elevații'][index];
    const items=next.querySelectorAll('.project-purpose,.project-product');
    gsap.killTweensOf(items);
    gsap.set(items,{clearProps:'opacity,transform,visibility'});
    if(!reduced.matches)transition=gsap.fromTo(items,{y:12,autoAlpha:0},{y:0,autoAlpha:1,duration:.38,stagger:.035,ease:'power2.out',clearProps:'opacity,transform,visibility'});
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>select(index));
    tab.addEventListener('keydown',event=>{let target;if(event.key==='ArrowRight')target=(index+1)%tabs.length;else if(event.key==='ArrowLeft')target=(index-1+tabs.length)%tabs.length;else if(event.key==='Home')target=0;else if(event.key==='End')target=tabs.length-1;else return;event.preventDefault();select(target,true)});
  });
  new ResizeObserver(positionIndicator).observe(section.querySelector('.project-tabs'));
  reduced.addEventListener('change',()=>{transition?.progress(1);positionIndicator()});
  positionIndicator();
})();
