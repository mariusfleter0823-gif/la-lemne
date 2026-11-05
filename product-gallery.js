(() => {
  const stage = document.querySelector('.beam-drawing-stage');
  const photos = [...(stage?.querySelectorAll('.product-gallery-photo') || [])];
  if (!photos.length) return;
  stage.classList.add('has-product-gallery');
  const prev = stage.querySelector('.product-gallery-prev');
  const next = stage.querySelector('.product-gallery-next');
  const dotnav = stage.querySelector('.product-gallery-dots');
  const dots = [...dotnav.querySelectorAll('button[data-gallery-index]')];
  const drawings = [...stage.querySelectorAll('svg[role="img"]')];
  const lastIndex = photos.length;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const indicator = document.createElement('span');
  indicator.className = 'product-gallery-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  dotnav.append(indicator);
  let index = 0, indicatorMotion, initialized = false;

  function moveIndicator() {
    const target = dots[index].offsetLeft + dots[index].offsetWidth / 2 - 3.5;
    indicatorMotion?.kill();
    if (!window.gsap) {
      indicator.style.transform = `translateX(${target}px)`;
      return;
    }
    if (!initialized || reduced.matches) {
      gsap.set(indicator, {x: target, scaleX: 1});
      initialized = true;
      return;
    }
    if (Math.abs(Number(gsap.getProperty(indicator, 'x')) - target) < .5) return;
    indicatorMotion = gsap.timeline()
      .to(indicator, {x: target, duration: .34, ease: 'power3.inOut'}, 0)
      .to(indicator, {scaleX: 2.6, duration: .14, ease: 'power2.out'}, 0)
      .to(indicator, {scaleX: 1, duration: .2, ease: 'power2.out'}, .14);
  }

  function show(value) {
    index = Math.max(0, Math.min(lastIndex, value));
    stage.dataset.galleryIndex = String(index);
    photos.forEach((photo, i) => {
      const active = index === i + 1;
      photo.classList.toggle('is-active', active);
      photo.setAttribute('aria-hidden', String(!active));
    });
    drawings.forEach(svg => svg.setAttribute('aria-hidden', String(index !== 0)));
    prev.disabled = index === 0;
    next.disabled = index === lastIndex;
    prev.setAttribute('aria-label', index === 1 ? 'Vezi desenul cu dimensiuni' : 'Imaginea precedentă');
    next.setAttribute('aria-label', index === 0 ? 'Vezi fotografia produsului' : 'Imaginea următoare');
    dots.forEach((button, i) => button.setAttribute('aria-current', String(i === index)));
    moveIndicator();
  }

  prev.addEventListener('click', () => {
    show(index - 1);
    if (prev.disabled) next.focus({preventScroll: true});
  });
  next.addEventListener('click', () => {
    show(index + 1);
    if (next.disabled) prev.focus({preventScroll: true});
  });
  dots.forEach(button => button.addEventListener('click', () => show(Number(button.dataset.galleryIndex))));
  let gesture;
  stage.addEventListener('pointerdown', event => {
    if(event.pointerType==='mouse'||event.target.closest('button')||!event.isPrimary)return;
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY};
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointerup', event => {
    if(!gesture||gesture.id!==event.pointerId)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    gesture=null;
    if(Math.abs(dx)>=45&&Math.abs(dx)>Math.abs(dy)*1.3)show(index+(dx<0?1:-1));
  });
  stage.addEventListener('pointercancel',()=>{gesture=null});
  stage.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || !event.target.closest('button')) return;
    event.preventDefault();
    show(event.key === 'Home' ? 0 : event.key === 'End' ? lastIndex : index + (event.key === 'ArrowRight' ? 1 : -1));
    if (event.target.closest('.product-gallery-dots')) dots[index].focus({preventScroll: true});
    else if (document.activeElement.disabled) dots[index].focus({preventScroll: true});
  });
  document.querySelectorAll('.beam-selects select').forEach(select => select.addEventListener('change', () => show(0)));
  new ResizeObserver(moveIndicator).observe(dotnav);
  reduced.addEventListener('change', moveIndicator);
  show(0);
})();
