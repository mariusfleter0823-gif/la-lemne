(() => {
  const menu=document.querySelector('#site-menu');
  const desktopNav=menu.querySelector('.large-nav');
  const mobileMedia=window.matchMedia('(max-width: 700px)');
  const reduceMedia=window.matchMedia('(prefers-reduced-motion: reduce)');
  const dropdowns=new Map();
  let pageMotion=null;
  let finishPageMotion=null;
  let currentPage='root';
  let pageStack=['root'];
  let pageReturnFocus=[];
  const pages=new Map();

  // Generate mobile screens from the desktop product tree, keeping one
  // authoritative product list for both navigation behaviours.
  const mobile=document.createElement('div');
  mobile.className='mobile-navigation';
  mobile.innerHTML='<div class="mobile-backbar" hidden><button class="mobile-back" type="button"><span class="back-chevron" aria-hidden="true"></span><span>Înapoi</span></button><span class="mobile-parent-label"></span></div><div class="mobile-stage"></div>';
  desktopNav.after(mobile);
  const stage=mobile.querySelector('.mobile-stage');
  const backbar=mobile.querySelector('.mobile-backbar');
  const back=mobile.querySelector('.mobile-back');
  const parentLabel=mobile.querySelector('.mobile-parent-label');
  function makePage(id,title){
    const page=document.createElement('section');
    page.className='mobile-page';page.id=`mobile-page-${id}`;page.dataset.page=id;
    page.hidden=id!=='root';page.inert=id!=='root';
    page.setAttribute('aria-label',title);page.tabIndex=-1;
    if(id!=='root'){const h=document.createElement('h2');h.className='mobile-page-title';h.textContent=title;page.append(h)}
    const links=document.createElement('nav');links.className='mobile-page-links';links.setAttribute('aria-label',title);page.append(links);
    stage.append(page);pages.set(id,{element:page,links,title});return pages.get(id);
  }
  function pageButton(parent,label,destination){
    const b=document.createElement('button');b.type='button';b.className='mobile-row has-next';b.dataset.mobileNext=destination;b.textContent=label;b.setAttribute('aria-controls',`mobile-page-${destination}`);parent.links.append(b);return b;
  }
  function copyLink(parent,source){const a=source.cloneNode(true);a.className='mobile-row';a.querySelectorAll('img,.current-marker').forEach(n=>n.remove());if(a.hasAttribute('data-product')||a.hasAttribute('data-offer-link'))a.classList.add('is-destination');parent.links.append(a);return a}
  const root=makePage('root','Meniu');
  copyLink(root,desktopNav.querySelector('[data-home-link]'));
  pageButton(root,'Produse','products');
  const aboutLink=desktopNav.querySelector('[data-about-link]');
  if(aboutLink)copyLink(root,aboutLink);else pageButton(root,'Despre noi','about');
  copyLink(root,desktopNav.querySelector('[data-contact-link]')||desktopNav.querySelector(':scope > [data-offer-link]'));
  const info=menu.querySelector('.menu-info').cloneNode(true);info.classList.add('mobile-root-info');root.element.append(info);
  const products=makePage('products','Produse');
  [...menu.querySelector('#products-submenu').children].forEach((source,index)=>{
    if(source.tagName==='DETAILS'){
      const title=source.querySelector('summary').textContent.trim();const id=`category-${index}`;
      pageButton(products,title,id);const category=makePage(id,title);
      source.querySelectorAll('a[href]').forEach(link=>copyLink(category,link));
    }else if(source.matches('a[href]'))copyLink(products,source);
  });
  if(!aboutLink){
  const about=makePage('about','Despre noi');
  const aboutCopy=document.createElement('p');aboutCopy.className='mobile-about-copy';aboutCopy.textContent=menu.querySelector('#about-submenu p').textContent;about.element.append(aboutCopy);
  const aboutCta=document.createElement('a');aboutCta.className='quote-cta mobile-about-cta';aboutCta.href='/la-lemne/contact';aboutCta.dataset.offerLink='';aboutCta.textContent='Cere ofertă';about.element.append(aboutCta);
  }

  function updateBackbar(){backbar.hidden=pageStack.length===1;const parent=pageStack.at(-2);parentLabel.textContent=parent?pages.get(parent).title:'';back.setAttribute('aria-label',parent?`Înapoi la ${pages.get(parent).title}`:'Înapoi')}
  function finishTransition(focus=false){if(finishPageMotion)finishPageMotion(focus)}
  function changePage(id,isBack=false,opener=null){
    if(currentPage===id)return;
    finishTransition(false);
    const from=pages.get(currentPage).element,to=pages.get(id).element;
    const previousFocus=isBack?pageReturnFocus.pop():null;
    if(isBack)pageStack.pop();else{pageStack.push(id);pageReturnFocus.push(opener)}
    currentPage=id;updateBackbar();
    from.inert=true;from.setAttribute('aria-hidden','true');
    to.hidden=false;to.inert=false;to.removeAttribute('aria-hidden');to.scrollTop=0;
    const nodes=[...to.querySelectorAll('.mobile-page-title,.mobile-row,.mobile-about-copy,.mobile-about-cta')];
    menu.dataset.pageMotion=isBack?'back':'forward';
    let finished=false;
    finishPageMotion=(focus)=>{
      if(finished)return;finished=true;
      pageMotion?.kill();pageMotion=null;
      from.hidden=true;from.inert=true;from.removeAttribute('aria-hidden');
      if(window.gsap)gsap.set([from,to,...nodes],{clearProps:'transform,opacity,visibility'});
      menu.dataset.pageMotion='idle';finishPageMotion=null;
      // Destination focus stays visible beneath the persistent back bar.
      if(focus){const target=previousFocus?.isConnected?previousFocus:to;target.focus({preventScroll:true})}
      window.laLemneNavigation?.onPageChange?.();
    };
    if(!window.gsap||reduceMedia.matches){finishPageMotion(true);return}
    const direction=isBack?-1:1;
    gsap.set(to,{xPercent:direction*100,autoAlpha:1});
    gsap.set(nodes,{x:direction*16,autoAlpha:0});
    pageMotion=gsap.timeline({defaults:{ease:'power3.inOut'},onComplete:()=>finishPageMotion?.(true)})
      .to(from,{xPercent:-direction*24,autoAlpha:0,duration:.28},0)
      .to(to,{xPercent:0,duration:.32},0)
      .to(nodes,{x:0,autoAlpha:1,duration:.2,stagger:.025,ease:'power3.out'},.09);
  }
  mobile.addEventListener('click',event=>{const next=event.target.closest('[data-mobile-next]');if(next)changePage(next.dataset.mobileNext,false,next)});
  back.addEventListener('click',()=>{if(pageStack.length>1)changePage(pageStack.at(-2),true)});

  // Keep spacing inside the animated shell so its height can truly reach
  // zero; padding on the shell would otherwise make the first frame jump.
  desktopNav.querySelectorAll('.nav-submenu,.product-links').forEach(panel=>{
    const body=document.createElement('div');body.className=panel.classList.contains('product-links')?'dropdown-products-body':'dropdown-body';
    while(panel.firstChild)body.append(panel.firstChild);
    panel.append(body);
  });

  function dropdown(panel,show,{button=null,details=null}={}){
    dropdowns.get(panel)?.kill();
    button?.setAttribute('aria-expanded',String(show));
    const start=panel.hidden?0:panel.getBoundingClientRect().height;
    if(details&&show)details.open=true;
    panel.hidden=false;panel.inert=!show;
    const children=[...panel.firstElementChild.children];
    const finish=()=>{
      panel.hidden=!show;if(details&&!show){details.open=false;panel.hidden=false}
      if(window.gsap)gsap.set([panel,...children],{clearProps:'height,overflow,transform,opacity,visibility'});
      dropdowns.delete(panel);
    };
    if(!window.gsap||reduceMedia.matches){finish();return}
    gsap.set(panel,{height:'auto'});const end=show?panel.getBoundingClientRect().height:0;
    gsap.set(panel,{height:start,overflow:'hidden',autoAlpha:show?1:gsap.getProperty(panel,'opacity')});
    const tl=gsap.timeline({defaults:{ease:'power3.inOut'},onComplete:finish})
      .to(panel,{height:end,autoAlpha:show?1:0,duration:show?.28:.2},0);
    if(show)tl.fromTo(children,{x:-12,autoAlpha:0},{x:0,autoAlpha:1,duration:.2,stagger:.025,ease:'power3.out'},.04);
    dropdowns.set(panel,tl);
  }
  const disclosureButtons=[...desktopNav.querySelectorAll('.nav-disclosure')];
  disclosureButtons.forEach(button=>button.addEventListener('click',()=>{
    if(mobileMedia.matches)return;
    const show=button.getAttribute('aria-expanded')!=='true';
    disclosureButtons.forEach(other=>{if(other!==button&&other.getAttribute('aria-expanded')==='true')dropdown(document.getElementById(other.getAttribute('aria-controls')),false,{button:other})});
    dropdown(document.getElementById(button.getAttribute('aria-controls')),show,{button});
  }));
  desktopNav.querySelectorAll('details').forEach(details=>details.querySelector('summary').addEventListener('click',event=>{if(mobileMedia.matches)return;event.preventDefault();const panel=details.querySelector('.product-links');dropdown(panel,!details.open,{details})}));
  function reset(){
    finishTransition(false);pageStack=['root'];pageReturnFocus=[];currentPage='root';
    pages.forEach(({element},id)=>{element.hidden=id!=='root';element.inert=id!=='root';element.removeAttribute('aria-hidden');element.scrollTop=0;if(window.gsap)gsap.set([element,...element.querySelectorAll('.mobile-row,.mobile-page-title')],{clearProps:'transform,opacity,visibility'})});
    updateBackbar();menu.dataset.pageMotion='idle';
  }
  mobileMedia.addEventListener('change',()=>{reset();window.laLemneNavigation?.onPageChange?.()});
  reduceMedia.addEventListener('change',()=>{finishTransition(true);dropdowns.forEach(tl=>tl.progress(1));dropdowns.clear()});
  window.laLemneNavigation={
    reset,
    settle:()=>finishTransition(false),
    getItems:()=>mobileMedia.matches?[...pages.get(currentPage).element.querySelectorAll('.mobile-page-title,.mobile-row,.mobile-about-copy,.mobile-about-cta')]:[...desktopNav.children],
    getSupporting:()=>mobileMedia.matches?[...(currentPage==='root'?[info]:[]),...(pageStack.length>1?[backbar]:[])]:[menu.querySelector('.menu-story'),menu.querySelector('.menu-info')],
    onPageChange:null
  };
  reset();
})();

