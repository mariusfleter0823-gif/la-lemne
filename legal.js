(() => {
 document.addEventListener('click',event=>{
  const settings=event.target.closest('[data-open-cookie-settings]');
  if(settings)document.querySelector('.cookie-footer-button')?.click();
  const load=event.target.closest('[data-load-map]');
  if(load){const container=load.closest('.contact-map'),template=container.querySelector('[data-map-template]');if(template){container.append(template.content.cloneNode(true));container.querySelector('.map-privacy')?.remove();template.remove();}}
 });
})();
