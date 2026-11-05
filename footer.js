(() => {
 const footer=document.querySelector('.site-footer'),main=document.querySelector('body>main');if(!footer||!main)return;
 const header=document.querySelector('.site-header');
 function fit(){document.body.dataset.footerReveal=String(footer.getBoundingClientRect().height<=innerHeight-20);}
 new ResizeObserver(fit).observe(footer);window.addEventListener('resize',fit,{passive:true});fit();
 function theme(){if(main.getBoundingClientRect().bottom<(header?.getBoundingClientRect().height||80)/2&&header)header.dataset.ink='light';}
 window.addEventListener('scroll',theme,{passive:true});theme();
 footer.addEventListener('focusin',event=>{if(event.target.matches(':focus-visible')&&event.target.getBoundingClientRect().top<main.getBoundingClientRect().bottom)window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});});
 footer.querySelector('[data-footer-year]').textContent=new Date().getFullYear();
})();


