/* Consent-first measurement. No Google scripts load before an optional choice. */
(() => {
  'use strict';
  const GTM = 'GTM-5GRVH474';
  const KEY = 'la_lemne_consent_v1';
  const TTL = 180 * 864e5;
  const denied = {analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'};
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  gtag('consent', 'default', {...denied, functionality_storage:'granted', security_storage:'granted'});
  gtag('set', 'ads_data_redaction', true);
  let consent = null, loaded = false, viewed = false, started = false;
  try { const saved=JSON.parse(localStorage.getItem(KEY)); if(saved?.version===1 && Date.now()-saved.time<TTL && typeof saved.analytics==='boolean' && typeof saved.marketing==='boolean') consent=saved; } catch {}
  const productNames = {grinzi:'Grinzi din lemn','dulapi-dimensionati':'Dulapi dimensionați','dulapi-nedimensionati':'Dulapi nedimensionați','scandura-dimensionata':'Scândură dimensionată','scandura-nedimensionata':'Scândură nedimensionată',lateti:'Leațuri / lăteți',rigle:'Rigle din lemn',lambriu:'Lambriu din lemn',pazie:'Pazie din lemn'};
  const slug = location.pathname.split('/la-lemne/').pop().replace(/\.html$/,'');
  const product = productNames[slug];
  function dimensions(){
    const result={};
    for(const [id,key,mult] of [['beam-width','width_cm',1],['beam-height','height_cm',1],['beam-length','length_cm',100]]){
      const value=Number(document.getElementById(id)?.value); if(value>0)result[key]=value*mult;
    }
    return result;
  }
  function event(name,params={}) {
    if(!consent?.analytics)return;
    window.dataLayer.push({event:'ll_analytics',ll_event_name:name,ll_event_params:{page_type:product?'product':slug==='produse'?'catalog':slug||'home',...(product?{product_id:slug,product_name:product}:{}),...params}});
  }
  function productView(){
    if(!product||viewed||!consent?.analytics)return;
    viewed=true; event('view_item',{items:[{item_id:slug,item_name:product}],...dimensions()});
  }
  function activate(){
    if(!consent)return;
    gtag('consent','update',{analytics_storage:consent.analytics?'granted':'denied',ad_storage:consent.marketing?'granted':'denied',ad_user_data:consent.marketing?'granted':'denied',ad_personalization:consent.marketing?'granted':'denied'});
    window.dataLayer.push({ll_analytics_consent:consent.analytics,ll_marketing_consent:consent.marketing});
    if((consent.analytics||consent.marketing)&&!loaded){
      loaded=true;
      window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js',ll_analytics_consent:consent.analytics, ll_marketing_consent:consent.marketing});
      const script=document.createElement('script'); script.async=true; script.src='https://www.googletagmanager.com/gtm.js?id='+GTM; document.head.append(script);
    }
    if(consent.analytics&&!started){started=true;window.dataLayer.push({event:'ll_start_analytics'});}
    if(document.readyState!=='loading')productView();
  }
  function clearMeasurementCookies(analytics,marketing){
    const names=document.cookie.split(';').map(c=>c.split('=')[0].trim()).filter(n=>(!analytics&&/^(_ga|_gid|_gat)/.test(n))||(!marketing&&/^_gcl/.test(n)));
    const domains=['',location.hostname,'.'+location.hostname,'.lalemne.ro'];
    for(const name of names)for(const domain of domains)document.cookie=name+'=; Max-Age=0; path=/'+(domain?'; domain='+domain:'')+'; SameSite=Lax; Secure';
  }
  function save(analytics,marketing){
    const previous=consent;
    consent={version:1,time:Date.now(),analytics,marketing};
    try{localStorage.setItem(KEY,JSON.stringify(consent));}catch{}
    clearMeasurementCookies(analytics,marketing);
    activate();
    document.querySelector('#cookie-banner').hidden=true;
    document.querySelector('#cookie-settings').close();
    // A fresh document prevents already-loaded tags from continuing after revocation.
    if(loaded&&previous&&((previous.analytics&&!analytics)||(previous.marketing&&!marketing)))location.reload();
  }
  activate();
  document.addEventListener('DOMContentLoaded',()=>{
    const root=document.createElement('div'); root.className='consent-ui';
    root.innerHTML=`<section id="cookie-banner" class="cookie-banner" aria-labelledby="cookie-title" hidden><button type="button" class="cookie-banner-close" data-consent="dismiss" aria-label="Închide fără a accepta cookie-uri">×</button><h2 id="cookie-title">Tu alegi cookie-urile.</h2><p>Cookie-uri pentru analiză și publicitate, doar cu acordul tău.</p><div class="cookie-actions"><button type="button" data-consent="accept">Acceptă</button><button type="button" data-consent="reject">Refuză</button><button type="button" class="cookie-text-button" data-consent="settings">Preferințe</button></div></section><dialog id="cookie-settings" class="cookie-settings" aria-labelledby="cookie-settings-title"><div class="cookie-settings-heading"><h2 id="cookie-settings-title">Preferințe cookies</h2><button type="button" class="cookie-close" aria-label="Închide preferințele">×</button></div><p>Site-ul funcționează și fără cookie-urile opționale. Alegerea ta este păstrată în acest browser timp de 180 de zile și o poți schimba din subsolul oricărei pagini.</p><div class="cookie-option"><span><strong>Necesare</strong><small>Memorează alegerea ta și permit funcționarea site-ului.</small></span><span class="cookie-required">Mereu active</span></div><label class="cookie-option"><span><strong>Analiză</strong><small>Google Analytics: pagini vizitate, produse consultate, dimensiuni selectate și clickuri de contact. Cookie-uri _ga și _ga_* (până la 2 ani).</small></span><input id="cookie-analytics" type="checkbox"></label><label class="cookie-option"><span><strong>Publicitate</strong><small>Permite stocarea și folosirea datelor de către etichetele Google pentru măsurarea și personalizarea reclamelor, dacă acestea sunt configurate. Cookie-uri _gcl_* (de regulă până la 90 de zile).</small></span><input id="cookie-marketing" type="checkbox"></label><p class="cookie-provider">Furnizor: Google Ireland Limited. Datele pot fi prelucrate și în afara SEE. <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">Cum folosește Google datele</a>. Pentru întrebări despre site, <a href="contact.html">contactează La Lemne</a>.</p><div class="cookie-actions"><button type="button" data-consent="save">Salvează preferințele</button><button type="button" data-consent="reject">Refuză opționalele</button></div></dialog>`;
    document.body.append(root);
    const banner=root.querySelector('#cookie-banner'), dialog=root.querySelector('dialog'), analytics=root.querySelector('#cookie-analytics'), marketing=root.querySelector('#cookie-marketing');
    function settings(){analytics.checked=!!consent?.analytics; marketing.checked=!!consent?.marketing;dialog.showModal();}
    root.addEventListener('click',e=>{const action=e.target.closest('[data-consent]')?.dataset.consent;if(action==='dismiss')banner.hidden=true;else if(action==='accept')save(true,true);else if(action==='reject')save(false,false);else if(action==='save')save(analytics.checked,marketing.checked);else if(action==='settings')settings();else if(e.target.closest('.cookie-close'))dialog.close();});
    const footer=document.querySelector('.footer-brand-bottom')||document.querySelector('.site-footer');
    if(footer){const button=document.createElement('button');button.type='button';button.className='cookie-footer-button';button.textContent='Preferințe cookies';button.addEventListener('click',settings);footer.append(button);}
    banner.hidden=!!consent;
    document.addEventListener('click',e=>{
      const a=e.target.closest('a[href]');if(!a)return;
      const href=a.getAttribute('href');
      const method=/^tel:/i.test(href)?'phone':/^https:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(href)?'whatsapp':null;
      if(method)event('contact_'+method,{contact_method:method,button_location:a.closest('.site-footer')?'footer':a.closest('.site-menu')?'menu':a.closest('.offer-dialog')?'offer_dialog':a.closest('.beam-page')?'product':'page',...dimensions()});
    });
    document.addEventListener('change',e=>{if(e.target.matches('#beam-width,#beam-height,#beam-length'))event('select_dimensions',dimensions());});
    productView();
  });
})();
