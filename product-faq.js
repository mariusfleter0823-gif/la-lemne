(() => {
  const section=document.querySelector('.product-faq');
  if(!section)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const items=[...section.querySelectorAll('.product-faq-item')];
  function toggle(item,open){
    const panel=item.querySelector('.product-faq-answer');
    item.dataset.expanded=String(open);
    if(window.gsap)gsap.killTweensOf(panel);
    if(!window.gsap||reduced.matches){item.open=open;panel.style.height='';return;}
    const from=item.open?panel.getBoundingClientRect().height:0;
    if(open)item.open=true;
    panel.style.height=from+'px';
    const to=open?panel.scrollHeight:0;
    gsap.to(panel,{height:to,duration:.34,ease:'power2.inOut',overwrite:true,onComplete:()=>{item.open=open;panel.style.height='';}});
  }
  items.forEach(item=>{
    item.dataset.expanded=String(item.open);
    item.querySelector('summary').addEventListener('click',event=>{
      event.preventDefault();
      const open=item.dataset.expanded!=='true';
      if(open)items.filter(other=>other!==item&&other.dataset.expanded==='true').forEach(other=>toggle(other,false));
      toggle(item,open);
    });
  });
  reduced.addEventListener('change',()=>{items.forEach(item=>{if(window.gsap)gsap.killTweensOf(item.querySelector('.product-faq-answer'));item.open=item.dataset.expanded==='true';item.querySelector('.product-faq-answer').style.height='';});});
})();
