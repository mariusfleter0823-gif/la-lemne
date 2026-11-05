(() => {
  if (!window.gsap) return;
  const motion = gsap.matchMedia();
  motion.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from('[data-company-enter]', {
      y: 14, autoAlpha: 0, duration: .65, stagger: .07,
      ease: 'power3.out', clearProps: 'transform,opacity,visibility'
    });
  });
})();
