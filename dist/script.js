(() => {
 const root = document.documentElement;
 const header = document.querySelector('.header');
 const opening = document.querySelector('.opening');
 const sky = document.querySelector('.sky');
 const journey = document.querySelector('.experience');
 const flights = [...document.querySelectorAll('.flight-depth')].map(element => ({element,started:false,failed:false}));
 const ownScript = document.currentScript || document.querySelector('script[src*="script.js"]');
 const sceneURL = new URL('flight-scene.js',new URL(ownScript.getAttribute('src'),location.href));
 sceneURL.search = '?v=cinema-2';
 const reduce = matchMedia('(prefers-reduced-motion: reduce)');
 const fine = matchMedia('(hover: hover) and (pointer: fine)');
 const narrow = matchMedia('(max-width: 650px)');
 const flowing = matchMedia('(max-width: 1000px)');
 const motion = window.Motion;
 const active = new Set();
 const revealTargets = new Set();
 const revealAnimations = new Map();
 const revealed = new WeakSet();
 const revealSelector = [
  '.hero-content > .eyebrow','.hero-content > h1','.hero-description','.hero-link','.hero-foot > span',
  '.section-label','section h2','.about-copy > p','.signature','.skills-row > div',
  '.expertise-list > article','.experience-heading > p','.career-number','.flight-depth',
  '.career > .date','.career > h3','.career > .role','.career > .role-detail','.career > .career-intro','.career > details',
  '.degree','.contact-intro > p','.contact-name','.contact-links > a','.address','.contact footer'
 ].join(',');
 const sections = [...document.querySelectorAll('section[id]')];
 const nav = [...document.querySelectorAll('nav a')];
 let stopClock;
 let observer;
 let frame;
 let sceneModule;
 let motionHealthy = true;
 let revealsStarted = false;
 let disposed = false;
 const clamp = (value,lo=0,hi=1) => Math.max(lo,Math.min(hi,value));
 function animate(element,keyframes,options) {
  if (!motion || !motionHealthy || reduce.matches) return;
  try {
   const animation = motion.animate(element,keyframes,options);
   active.add(animation);
   animation.finished.then(() => active.delete(animation),() => active.delete(animation));
   return animation;
  } catch {
   motionHealthy = false;observer?.disconnect();stopAnimations();
  }
 }
 function measure() {
  root.style.setProperty('--header-height',`${header.offsetHeight}px`);
  render();
  flights.forEach(flight => flight.scene?.resize());
 }
 function render() {
  const y = window.scrollY;
  const view = window.innerHeight;
  const max = root.scrollHeight - view;
  const track = Math.max(1,opening.offsetHeight - view);
  const fraction = clamp(y / track);
  root.style.setProperty('--page-progress',`${max > 0 ? clamp(y / max) : 0}`);
  // Motion's one scroll clock drives the atmosphere and the real 3D scene.
  if (!reduce.matches) {
   const travel = Math.min(90,y * (narrow.matches ? .15 : .08));
   sky.style.setProperty('--parallax',`${travel}px`);
   const atmosphere = flowing.matches ? clamp(y / Math.max(1,opening.offsetHeight * .65)) : fraction;
   sky.style.setProperty('--sky-scale',`${1.07 + atmosphere * .05}`);
   root.style.setProperty('--mist',`${.08 * (1-fraction)}`);
   root.style.setProperty('--fog-x',`${atmosphere * (narrow.matches ? 48 : 96)}px`);
   root.style.setProperty('--fog-y',`${atmosphere * -56}px`);
   root.style.setProperty('--fog-opacity',`${.18 + atmosphere * .34}`);
   root.style.setProperty('--hero-copy-y',`${atmosphere * (narrow.matches ? -10 : -24)}px`);
  } else {
   sky.style.removeProperty('--parallax');sky.style.removeProperty('--sky-scale');
   ['--fog-x','--fog-y','--fog-opacity','--hero-copy-y'].forEach(key => root.style.removeProperty(key));
  }
  flights.forEach(flight => {
   const rect = flight.element.getBoundingClientRect();
   const inOpening = flight.element.classList.contains('hero-flight');
   const stickyCareer = !inOpening && !narrow.matches && view > 780;
   const p = inOpening && !flowing.matches ? fraction
    : stickyCareer ? clamp((view * .9 - journey.getBoundingClientRect().top) / (journey.offsetHeight + view * .2))
    : clamp((view * .9 - rect.top) / (view * .75 + rect.height));
   flight.state = {progress:p,visible:rect.top < view && rect.bottom > 0,reducedMotion:reduce.matches,narrow:narrow.matches};
   // The bitmap stays responsive to scrolling when a browser cannot run WebGL.
   const fallbackProgress = reduce.matches ? .5 : p;
   flight.element.style.setProperty('--poster-x',`${(fallbackProgress-.5) * 26}px`);
   flight.element.style.setProperty('--poster-y',`${(fallbackProgress-.5) * -24}px`);
   flight.element.style.setProperty('--poster-rx',`${(fallbackProgress-.5) * 14}deg`);
   flight.element.style.setProperty('--poster-ry',`${(fallbackProgress-.5) * 36}deg`);
   flight.element.style.setProperty('--poster-rz',`${(fallbackProgress-.5) * 16}deg`);
   flight.scene?.update(flight.state);
   if (!flight.started && rect.top < view + 420 && rect.bottom > -420) loadScene(flight);
  });
  header.classList.toggle('floating',y > 24);
  header.classList.toggle('scrolled',y >= opening.offsetHeight - header.offsetHeight - 40);
  let current = '';
  sections.forEach(section => { if (section.getBoundingClientRect().top <= header.offsetHeight + 70) current = section.id; });
  nav.forEach(link => {if (link.hash === `#${current}`) link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
 }
 function fallbackScroll() {if (!frame) frame = requestAnimationFrame(() => {frame=0;render();});}
 function posterReady(flight) {
  const poster = flight.element.querySelector('img');
  poster.loading = 'eager';
  if (poster.complete && poster.naturalWidth > 0) return Promise.resolve(true);
  return new Promise(resolve => {
   let timer;
   const done = ok => {clearTimeout(timer);poster.removeEventListener('load',loaded);poster.removeEventListener('error',failed);resolve(ok);};
   const loaded = () => done(true);
   const failed = () => done(false);
   poster.addEventListener('load',loaded,{once:true});poster.addEventListener('error',failed,{once:true});
   timer = setTimeout(() => done(false),1500);
   if (poster.decode) poster.decode().then(loaded,failed);
  });
 }
 function fallbackScene(flight,error) {
  if (flight.failed || disposed) return;
  flight.failed = true;clearTimeout(flight.timeout);flight.scene?.dispose();flight.scene = undefined;
  flight.element.dataset.scene = 'loading';
  flight.element.dataset.sceneError = error?.message || 'Scene loading timed out';
  posterReady(flight).then(ready => {
   if (disposed) return;
   flight.element.dataset.poster = ready ? 'ready' : 'unavailable';
   flight.element.dataset.scene = 'fallback';
  });
 }
 function loadScene(flight) {
  flight.started = true;flight.element.dataset.scene = 'loading';
  flight.timeout = setTimeout(() => fallbackScene(flight),12000);
  // A failed module request leaves the permanent poster and every control usable.
  sceneModule ??= import(sceneURL.href);
  sceneModule.then(({mountFlightScene}) => {
   if (disposed || flight.failed) return;
   flight.scene = mountFlightScene(flight.element,{state:flight.state,onFailure:error => fallbackScene(flight,error)});
   clearTimeout(flight.timeout);
   flight.element.dataset.scene = 'ready';
   render();
  }).catch(error => fallbackScene(flight,error));
 }
 function splitTitles() {
  document.querySelectorAll('h1, h2').forEach(title => {
   if (title.querySelector('.title-line')) return;
   const lines = title.innerHTML.split(/<br\s*\/?\s*>/i);
   title.innerHTML = lines.map(line => `<span class="title-line">${line}</span>`).join(' ');
  });
 }
 function stopAnimations() {
  active.forEach(animation => animation.stop());active.clear();
  revealAnimations.clear();root.classList.remove('scroll-reveal-enabled');
  revealTargets.forEach(el => {
   el.removeAttribute('data-scroll-reveal');el.style.removeProperty('transform');el.style.removeProperty('opacity');
  });
  document.querySelectorAll('.title-line,.about-copy,.skills-row > div,.expertise-list article,.career,.degree,.flight-tilt,.contact-button,details ul').forEach(el => {
   el.style.removeProperty('transform');el.style.removeProperty('opacity');
  });
 }
 function showReveal(el) {
  const animation = revealAnimations.get(el);
  revealAnimations.delete(el);
  animation?.stop();active.delete(animation);
  el.setAttribute('data-scroll-reveal','shown');revealed.add(el);
  el.style.removeProperty('transform');el.style.removeProperty('opacity');
  observer?.unobserve(el);
 }
 function reveal(el,delay) {
  if (revealed.has(el)) return;
  revealed.add(el);el.setAttribute('data-scroll-reveal','active');
  const title = el.matches('h1,h2');
  const animation = animate(el,{opacity:[0,1],y:[title?18:14,0]}, {
   duration:title?1.45:1.25,delay,ease:[.22,1,.36,1]
  });
  if (!animation) {showReveal(el);return;}
  revealAnimations.set(el,animation);
  const done = () => {if (revealAnimations.get(el) === animation) showReveal(el);};
  animation.finished.then(done,done);
 }
 function setupReveals() {
  observer?.disconnect();stopAnimations();splitTitles();
  if (!motion || !motionHealthy || reduce.matches || !('IntersectionObserver' in window)) return;
  // Only managed blocks are concealed; failed/absent enhancement leaves ordinary HTML.
  try {
   observer = new IntersectionObserver(entries => {
    entries.filter(entry => entry.isIntersecting).forEach((entry,index) => {
     reveal(entry.target,Math.min(index*.075,.3));observer.unobserve(entry.target);
    });
   },{threshold:.015,rootMargin:'0px 0px -28px 0px'});
   root.classList.add('scroll-reveal-enabled');
   document.querySelectorAll(revealSelector).forEach(el => {
    revealTargets.add(el);
    const rect = el.getBoundingClientRect();
    const alreadyVisible = revealsStarted && rect.top < window.innerHeight && rect.bottom > 0;
    if (revealed.has(el) || rect.bottom <= 0 || alreadyVisible) {showReveal(el);return;}
    el.setAttribute('data-scroll-reveal','pending');observer.observe(el);
   });
   revealsStarted = true;
  } catch {motionHealthy = false;observer?.disconnect();stopAnimations();}
 }
 function focusReveal(event) {
  const el = event.target.closest?.('[data-scroll-reveal]');
  if (el && el.getAttribute('data-scroll-reveal') !== 'shown') showReveal(el);
 }
 function pointerMove(flight,event) {
  if (!flight.scene || reduce.matches || !fine.matches) return;
  const rect = flight.element.getBoundingClientRect();
  const x = clamp((event.clientX - rect.left)/rect.width)-.5;
  const y = clamp((event.clientY - rect.top)/rect.height)-.5;
  flight.scene.pointer(x,y);
 }
 function resetTilt() {flights.forEach(flight => flight.scene?.pointer(0,0));}
 const languageChanged = () => {setupReveals();measure();};
 const motionChanged = () => {setupReveals();resetTilt();render();};
 const pointerChanged = () => {if (!fine.matches) resetTilt();};
 function setupClock() {
  if (motion?.scroll) stopClock = motion.scroll(render);
  else window.addEventListener('scroll',fallbackScroll,{passive:true});
 }
 document.querySelectorAll('details').forEach(details => {
  details.addEventListener('toggle',() => {if(details.open) animate(details.querySelector('ul'),{opacity:[0,1],y:[6,0]},{duration:.7,ease:[.22,1,.36,1]});});
 });
 document.querySelectorAll('.contact-button').forEach(button => {
  button.addEventListener('pointerenter',() => {if(fine.matches) animate(button,{scale:1.025},{type:'spring',bounce:0,duration:.3});});
  button.addEventListener('pointerleave',() => animate(button,{scale:1},{type:'spring',bounce:0,duration:.3}));
 });
 flights.forEach(flight => {
  flight.move = event => pointerMove(flight,event);
  flight.leave = () => flight.scene?.pointer(0,0);
  flight.element.addEventListener('pointermove',flight.move);
  flight.element.addEventListener('pointerleave',flight.leave);
 });
 document.addEventListener('resume:language',languageChanged);
 document.addEventListener('focusin',focusReveal);
 window.addEventListener('resize',measure);
 reduce.addEventListener('change',motionChanged);
 fine.addEventListener('change',pointerChanged);
 narrow.addEventListener('change',measure);
 flowing.addEventListener('change',measure);
 function cleanup() {
  disposed=true;
  flights.forEach(flight => {
   clearTimeout(flight.timeout);flight.scene?.dispose();
   flight.element.removeEventListener('pointermove',flight.move);
   flight.element.removeEventListener('pointerleave',flight.leave);
  });
  stopClock?.();window.removeEventListener('scroll',fallbackScroll);
  observer?.disconnect();stopAnimations();if(frame) cancelAnimationFrame(frame);
  document.removeEventListener('resume:language',languageChanged);
  document.removeEventListener('focusin',focusReveal);
  window.removeEventListener('resize',measure);
  reduce.removeEventListener('change',motionChanged);narrow.removeEventListener('change',measure);flowing.removeEventListener('change',measure);fine.removeEventListener('change',pointerChanged);
 }
 window.addEventListener('pagehide',cleanup);
 window.addEventListener('pageshow',event => {if(event.persisted && disposed) location.reload();});
 setupReveals();setupClock();measure();
})();
