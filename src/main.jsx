import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import personal from './personal.json';
import Preloader from './components/Preloader';
import ProjectV2 from './components/ProjectV2';
import HomeV3 from './components/HomeV3';
import { reducedMotion, scrollToY, scrollToElement, useSmoothWheel } from './lib/motion';
import './fonts.css';
import './style.css';
import './v2.css';
import './v3.css';

gsap.registerPlugin(ScrollTrigger);
const modules = import.meta.glob('./data/*.json', { eager: true, import: 'default' });
const projects = Object.values(modules).flatMap(x => Array.isArray(x) ? x : x.projects || []);
const categories = [
  ['landscape','01','Landscape & space','景观与空间','Places, systems and the life in between.','场地、生态与空间之间的关系。'],
  ['graphic','02','Graphic & visual','平面与视觉','Images made to communicate.','图像、信息与视觉表达。'],
  ['photography','03','Photography','摄影','An archive of looking, still in the making.','关于观看的档案，正在慢慢形成。'],
  ['spatial','04','3D & atmospheres','三维与空间实验','Imagined places, light and atmosphere.','虚构的场景，真实的光影与氛围。'],
  ['botanical','05','Plants & pages','植物与编辑','Observations collected, drawn and arranged.','观察、绘制与编排。'],
  ['motion','06','Generative motion','生成式影像','Moving images and evolving processes.','运动的图像与持续演变的制作方法。'],
  ['digital','07','Web & interaction','网页与交互','Small interfaces, different possibilities.','小型界面，新的可能。'],
].map(([id,n,en,zh,descriptionEn,descriptionZh]) => ({ id,n,title:{en,zh},description:{en:descriptionEn,zh:descriptionZh} }));
const categoryOf = id => categories.find(c => c.id === id) || categories[0];
const tx = (v,lang) => typeof v === 'string' ? v : v?.[lang] ?? v?.en ?? v?.zh ?? '';
const num = n => String(n).padStart(2,'0');
const isReduced = reducedMotion;
try { document.documentElement.dataset.motion = localStorage.getItem('portfolio-motion') || 'auto'; } catch {}
const routeNow = () => location.hash.slice(1) || '/';
const count = id => projects.filter(p => p.category === id && p.status !== 'placeholder').length;
const Arrow = ({direction='right'}) => <svg viewBox="0 0 28 28" className={'arrow arrow-'+direction} aria-hidden="true"><path d="M4 14h19M15 6l8 8-8 8" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>;

function useDialogFocus(ref){
  useEffect(()=>{
    const previous=document.activeElement;
    const elements=()=>Array.from(ref.current?.querySelectorAll('button:not([disabled]),a[href],input,[tabindex="0"]')||[]);
    elements()[0]?.focus();
    const trap=e=>{if(e.key!=='Tab')return;const nodes=elements();if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};
    ref.current?.addEventListener('keydown',trap);
    const node=ref.current;
    return()=>{node?.removeEventListener('keydown',trap);if(previous&&document.contains(previous))requestAnimationFrame(()=>previous.focus({preventScroll:true}));};
  },[]);
}

function Media({ src, alt='', className='', onClick, eager=false, ...rest }) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[src]);
  return <div className={'media '+className+(onClick?' clickable':'')} {...rest}>
    {src && !failed ? <img src={src} alt={alt} loading={eager?'eager':'lazy'} decoding="async" onError={()=>setFailed(true)} onClick={onClick}/> : <div className="empty-image" aria-label={alt}><span className="registration a"/><span className="registration b"/><span className="empty-image-number">↗</span></div>}
  </div>;
}

function App(){
  const [lang,setLang]=useState(()=>localStorage.getItem('portfolio-language')||'en');
  const [route,setRoute]=useState(routeNow);
  const [baseRoute,setBaseRoute]=useState(()=>routeNow().startsWith('/project/')?'/work':routeNow());
  const [menu,setMenu]=useState(false);
  const [motion,setMotion]=useState(()=>document.documentElement.dataset.motion || 'auto');
  const [lightbox,setLightbox]=useState(null);
  const [ready,setReady]=useState(false),[loading,setLoading]=useState(true);
  const [transitionText,setTransitionText]=useState('');
  const [cursor,setCursor]=useState(false);
  const rootRef=useRef(null), overlay=useRef(null), cursorRef=useRef(null), busy=useRef(false),panel=useRef(null),nav=useRef(null);
  const positions=useRef({}), pendingScroll=useRef(0), origin=useRef('/work'),routeRef=useRef(route),baseRef=useRef(baseRoute),lastFocus=useRef(null);
  routeRef.current=route;baseRef.current=baseRoute;
  const activeProject=route.startsWith('/project/') ? projects.find(p=>p.id===route.split('/')[2]) : null;
  const dark=!!activeProject;
  useSmoothWheel(baseRoute!=='/'&&!loading&&!dark&&!menu&&!lightbox,baseRoute);
  useEffect(()=>{
    document.documentElement.dataset.motion=motion;
    localStorage.setItem('portfolio-motion',motion);
    window.dispatchEvent(new Event('portfolio-motion-change'));
  },[motion]);
  useEffect(()=>{ localStorage.setItem('portfolio-language',lang); document.documentElement.lang=lang==='zh'?'zh-CN':'en'; document.title=lang==='zh'?'魏一鸣 — 个人作品与持续探索':'Yiming Wei — Works & ongoing explorations'; },[lang]);
  useEffect(()=>{
    const pop=()=>{
      const path=routeNow();if(path===routeRef.current||busy.current)return;
      setMenu(false);setLightbox(null);setCursor(false);
      if(routeRef.current.startsWith('/project/')&&!path.startsWith('/project/'))dismiss(path,true);
      else applyRoute(path,true);
    };
    window.addEventListener('popstate',pop);window.addEventListener('hashchange',pop);
    return()=>{window.removeEventListener('popstate',pop);window.removeEventListener('hashchange',pop);};
  },[]);
  useLayoutEffect(()=>{scrollToY(pendingScroll.current,true);ScrollTrigger.refresh();},[baseRoute]);
  useEffect(()=>{
    const locked=dark||menu||lightbox||loading;
    document.body.style.backgroundColor='#000';document.body.style.overflow=locked?'hidden':'';
    if(rootRef.current)rootRef.current.inert=!!locked;
    if(nav.current)nav.current.inert=dark||loading;
    return()=>{document.body.style.overflow='';};
  },[dark,menu,lightbox,loading]);
  useEffect(()=>{
    const key=e=>{if(e.key==='Escape'){if(lightbox)setLightbox(null);else if(menu)setMenu(false);else if(dark)closeProject();}};
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[route,menu,lightbox,dark]);
  useEffect(()=>{
    const move=e=>{if(cursorRef.current)gsap.to(cursorRef.current,{x:e.clientX,y:e.clientY,duration:.22,ease:'power2.out',overwrite:true});};
    window.addEventListener('pointermove',move);return()=>window.removeEventListener('pointermove',move);
  },[]);
  useLayoutEffect(()=>{
    if(isReduced())return;
    const ctx=gsap.context(()=>{
      const enters=gsap.utils.toArray('.page-enter');
      if(enters.length)gsap.from(enters,{y:28,autoAlpha:0,duration:.85,stagger:.06,ease:'power3.out'});
      gsap.utils.toArray('.reveal').forEach(el=>gsap.from(el,{y:40,autoAlpha:0,duration:1,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 93%',once:true}}));
    },rootRef);
    return()=>ctx.revert();
  },[baseRoute,lang]);
  function applyRoute(path,restore=false){
    const project=path.startsWith('/project/');
    if(project){
      if(!routeRef.current.startsWith('/project/')){
        origin.current=history.state?.origin||baseRef.current;
        positions.current[baseRef.current]=window.scrollY;lastFocus.current=document.activeElement;
      }
      routeRef.current=path;setRoute(path);
    }else{
      pendingScroll.current=restore?(positions.current[path]||0):0;
      routeRef.current=path;baseRef.current=path;setRoute(path);setBaseRoute(path);
      requestAnimationFrame(()=>{scrollToY(pendingScroll.current,true);ScrollTrigger.refresh();lastFocus.current?.focus?.({preventScroll:true});});
    }
  }
  function dismiss(path,restore){
    if(busy.current)return;
    const done=()=>{
      busy.current=false;
      const latest=routeNow();
      if(latest.startsWith('/project/')&&projects.some(project=>project.id===latest.split('/')[2])){
        const shell=panel.current?.querySelector('.project-shell'),backdrop=panel.current?.querySelector('.project-backdrop');
        if(shell)gsap.set(shell,{clipPath:'inset(0% 0% 0% 0%)',y:0});
        if(backdrop)gsap.set(backdrop,{opacity:.76});
      }
      applyRoute(latest,latest===path?restore:true);
    };
    if(isReduced()||!panel.current){done();return;}
    busy.current=true;
    const shell=panel.current.querySelector('.project-shell'),backdrop=panel.current.querySelector('.project-backdrop');
    gsap.killTweensOf([shell,backdrop]);
    gsap.timeline({onComplete:done})
      .to(shell,{clipPath:'inset(100% 0 0 0)',y:26,duration:.62,ease:'power3.inOut'},0)
      .to(backdrop,{opacity:0,duration:.55,ease:'power2.inOut'},.1);
  }
  function closeProject(){
    if(busy.current)return;
    setLightbox(null);setMenu(false);setCursor(false);
    if(history.state?.portfolioProject){history.back();}
    else{const path=origin.current;history.replaceState(null,'','#'+path);dismiss(path,true);}
  }
  function go(path,restore=false){
    if(busy.current||loading)return;
    setMenu(false);setLightbox(null);setCursor(false);
    if(path===routeRef.current){if(path==='/'&&window.__portfolioHomeNavigate)window.__portfolioHomeNavigate('intro');else scrollToY(0);return;}
    const project=path.startsWith('/project/'),wasProject=routeRef.current.startsWith('/project/');
    if(project){
      const state={portfolioProject:true,origin:wasProject?origin.current:baseRef.current};
      history[wasProject?'replaceState':'pushState'](state,'','#'+path);applyRoute(path);return;
    }
    if(wasProject){
      if(path===origin.current&&restore){closeProject();return;}
      history.pushState(null,'','#'+path);dismiss(path,restore);return;
    }
    positions.current[baseRef.current]=window.scrollY;
    const departure=routeNow();
    const commit=()=>{
      const latest=routeNow();
      if(latest!==departure){applyRoute(latest,true);return;}
      history.pushState(null,'','#'+path);applyRoute(path,restore);
    };
    if(isReduced()){commit();return;}
    busy.current=true;
    const label=path.startsWith('/project/')?tx(projects.find(p=>p.id===path.split('/')[2])?.title,lang):path==='/about'?(lang==='zh'?'关于我':'About'):path.startsWith('/work/')?tx(categoryOf(path.split('/')[2]).title,lang):(lang==='zh'?'作品与探索':'Works & explorations');
    setTransitionText(label);
    gsap.timeline({onComplete:()=>{busy.current=false;if(routeNow()!==routeRef.current)applyRoute(routeNow(),true);}})
      .set(overlay.current,{yPercent:-102})
      .to(overlay.current,{yPercent:0,duration:.35,ease:'power3.inOut'})
      .call(commit)
      .to(overlay.current,{yPercent:102,duration:.5,ease:'power3.inOut'},'+=.03')
      .set(overlay.current,{yPercent:-102});
  }
  const hoverProps={onMouseEnter:()=>setCursor(true),onMouseLeave:()=>setCursor(false)};
  const common={lang,go,hoverProps};
  return <>
    <a className="skip-link" href="#main-content" onClick={e=>{e.preventDefault();rootRef.current?.focus();rootRef.current?.scrollIntoView();}}>{lang==='zh'?'跳至内容':'Skip to content'}</a>
    <header ref={nav} className={'site-nav '+(menu?'inverse':'')} aria-hidden={dark||loading?true:undefined}>
      <div className="nav-left"><button className="wordmark" onClick={()=>go('/')} aria-label={lang==='zh'?'返回首页':'Go home'}>w.</button><button className={'menu-toggle '+(menu?'open':'')} onClick={()=>setMenu(!menu)} aria-label={menu?(lang==='zh'?'关闭菜单':'Close menu'):(lang==='zh'?'打开菜单':'Open menu')} aria-expanded={menu}><i/><i/></button></div>
      <div className="nav-right"><div className="language-switch" aria-label={lang==='zh'?'切换语言':'Language'}><button lang="en" onClick={()=>setLang('en')} className={lang==='en'?'active':''} aria-pressed={lang==='en'}>EN</button><span>/</span><button lang="zh-CN" onClick={()=>setLang('zh')} className={lang==='zh'?'active':''} aria-pressed={lang==='zh'}>中文</button></div>{dark&&<button className="close-project" onClick={()=>go(origin.current,true)}>{lang==='zh'?'关闭':'Close'} <span>×</span></button>}</div>
    </header>
    {menu&&<Menu {...common} close={()=>setMenu(false)} motion={motion} setMotion={setMotion}/>}
    <main ref={rootRef} id="main-content" tabIndex={-1} className={'v3-page '+(baseRoute==='/'?'v3-home-page':'')} aria-hidden={dark||menu||loading?true:undefined}>
      {baseRoute==='/' ? <HomeV3 {...common} ready={ready} projects={projects} categories={categories} personal={personal} active={!loading&&!dark&&!menu&&!lightbox}/> : baseRoute==='/about' ? <About {...common}/> : baseRoute==='/work'||baseRoute.startsWith('/work/') ? <Work {...common} category={baseRoute.split('/')[2]||'all'}/> : <NotFound {...common}/>}
    </main>
    {activeProject&&<ProjectLayer panelRef={panel} {...common} setLang={setLang} project={activeProject} onClose={closeProject} onLightbox={setLightbox} blocked={!!lightbox}/>}
    {lightbox&&<Lightbox {...common} item={lightbox} onClose={()=>setLightbox(null)}/>}
    <div className="transition-sheet" ref={overlay} aria-hidden="true"><span>{transitionText}</span><small>WEI YIMING / {lang==='zh'?'作品与探索':'WORKS & EXPLORATIONS'}</small></div>
    <div ref={cursorRef} className={'custom-cursor '+(cursor?'visible':'')} aria-hidden="true">{lang==='zh'?'查看':'View'} ↗</div>
    {loading&&<Preloader lang={lang} onReveal={()=>setReady(true)} onComplete={()=>setLoading(false)}/>}
  </>;
}

function ProjectLayer({panelRef,lang,setLang,go,project,onClose,onLightbox,blocked}){
  const dialog=useRef(null);
  useDialogFocus(dialog);
  useLayoutEffect(()=>{
    const layer=panelRef.current;
    if(!layer||isReduced())return;
    const ctx=gsap.context(()=>{
      gsap.fromTo('.project-backdrop',{opacity:0},{opacity:.76,duration:.75,ease:'power2.out'});
      gsap.fromTo('.project-shell',{clipPath:'inset(100% 0 0 0)',y:0},{clipPath:'inset(0% 0 0 0)',y:0,duration:.95,ease:'power3.inOut'});
      gsap.from('.v2-project-heading,.v2-project-meta,.v2-project-media,.v2-project-info',{y:90,opacity:0,duration:1,ease:'power3.out',delay:.24,stagger:.06});
    },layer);
    return()=>ctx.revert();
  },[]);
  useLayoutEffect(()=>{if(dialog.current)dialog.current.scrollTop=0;},[project.id]);
  return <div className="project-layer" ref={panelRef}><div className="project-backdrop" aria-hidden="true" onClick={onClose}/><div className="project-shell" role="dialog" aria-modal={blocked?undefined:true} aria-hidden={blocked||undefined} inert={blocked?'':undefined} aria-label={tx(project.title,lang)} ref={dialog}>
    <div className="project-topbar"><button className="project-close" onClick={onClose}>{lang==='zh'?'关闭':'Close'} <span>×</span></button><button className="wordmark" onClick={()=>go('/',true)} aria-label={lang==='zh'?'返回首页':'Go home'}>w.</button><div className="language-switch"><button onClick={()=>setLang('en')} lang="en" className={lang==='en'?'active':''} aria-pressed={lang==='en'}>EN</button><span>/</span><button onClick={()=>setLang('zh')} lang="zh-CN" className={lang==='zh'?'active':''} aria-pressed={lang==='zh'}>中文</button></div></div>
    <ProjectV2 key={project.id} lang={lang} go={go} project={project} onLightbox={onLightbox} projects={projects} categoryOf={categoryOf} Arrow={Arrow}/>
  </div></div>;
}

function Menu({lang,go,close,motion,setMotion}){
  const ref=useRef(null);
  useDialogFocus(ref);
  const cover=projects.find(p=>p.id==='graphic-k-black')?.cover;
  const full=motion==='full'||(motion==='auto'&&!isReduced());
  return <div className="menu-panel menu-v3" role="dialog" aria-modal="true" aria-label={lang==='zh'?'网站导航':'Site navigation'} ref={ref}>
    <div className="menu-v3-stories">
      <button className="menu-v3-story" onClick={()=>go('/work')}>
        <span className="menu-v3-kicker">01 / {lang==='zh'?'作品与探索':'WORK & EXPLORATIONS'}</span>
        <span className="menu-v3-phrase">{lang==='zh'?<>想法，<span className="menu-v3-inset"><img src={cover} alt=""/></span><em>成形。</em></>:<>Ideas, <span className="menu-v3-inset"><img src={cover} alt=""/></span><em>taking shape.</em></>}</span>
        <span className="menu-v3-action">{lang==='zh'?'进入作品索引':'Explore the work'} <Arrow/></span>
      </button>
      <button className="menu-v3-story" onClick={()=>go('/work/photography')}>
        <span className="menu-v3-kicker">02 / {lang==='zh'?'摄影 · 整理中':'PHOTOGRAPHY · IN THE MAKING'}</span>
        <span className="menu-v3-phrase">{lang==='zh'?<>另一种<span className="menu-v3-inset"><img src="/assets/personal/coastal-atmosphere-preview.webp" alt=""/></span><em>观看。</em></>:<>Another<span className="menu-v3-inset"><img src="/assets/personal/coastal-atmosphere-preview.webp" alt=""/></span><em>way of seeing.</em></>}</span>
        <span className="menu-v3-action">{lang==='zh'?'摄影档案':'The photographic archive'} <Arrow/></span>
      </button>
    </div>
    <div className="menu-v3-bottom">
      <nav className="menu-v3-index" aria-label={lang==='zh'?'七个作品维度':'Seven dimensions of work'}>{categories.map(c=><button key={c.id} onClick={()=>go('/work/'+c.id)}><span>{c.n}</span>{tx(c.title,lang)}<span>↗</span></button>)}</nav>
      <div className="menu-v3-personal"><button onClick={()=>go('/about')}>{lang==='zh'?'关于与联系':'About & contact'} ↗</button><a href={personal.resume} target="_blank" rel="noreferrer">{lang==='zh'?'个人简历 · 中文 PDF':'Curriculum vitae · Chinese PDF'} ↗</a><a href={'mailto:'+personal.email}>{personal.email}</a></div>
      <div className="menu-v3-note"><span>WEI YIMING © 2026</span><span>{lang==='zh'?'香港 / 深圳':'HONG KONG / SHENZHEN'}</span><button className="motion-choice" onClick={()=>setMotion(full?'reduced':'full')} aria-pressed={full}>{lang==='zh'?'动态效果':'Motion'} <span>{full?(lang==='zh'?'完整':'Full'):(lang==='zh'?'轻量':'Reduced')}</span></button><button onClick={close}>{lang==='zh'?'返回当前页面':'Back to the page'} ↑</button></div>
    </div>
  </div>;
}

function Work({lang,go,hoverProps,category}){
  const [view,setView]=useState('grid');
  const current=categories.find(c=>c.id===category);
  const list=category==='all'?projects:projects.filter(p=>p.category===category);
  const title=current?tx(current.title,lang):(lang==='zh'?'作品与探索':'Work & explorations');
  return <><section className="work-heading"><small className="page-enter">{lang==='zh'?'作品索引':'INDEX OF WORK'} / {current?.n||'01—07'}</small><h1 className="page-enter">{title}<span>{num(list.filter(p=>p.status!=='placeholder').length)}</span></h1><p className="page-enter">{current?tx(current.description,lang):(lang==='zh'?'空间、图像与数字媒介之间，完成的作品与仍在发展的想法。':'Across space, image and digital media. Finished work, and ideas still unfolding.')}</p></section><div className="work-toolbar"><nav className="category-tabs" aria-label={lang==='zh'?'作品维度':'Work categories'}><button className={category==='all'?'active':''} onClick={()=>go('/work')}>{lang==='zh'?'全部':'All'}<sup>{projects.filter(p=>p.status!=='placeholder').length}</sup></button>{categories.map(c=><button key={c.id} className={c.id===category?'active':''} onClick={()=>go('/work/'+c.id)}>{tx(c.title,lang)}<sup>{count(c.id)}</sup></button>)}</nav><div className="view-switch"><button onClick={()=>setView('grid')} className={view==='grid'?'active':''} aria-pressed={view==='grid'}>{lang==='zh'?'图像':'Grid'}</button><button onClick={()=>setView('list')} className={view==='list'?'active':''} aria-pressed={view==='list'}>{lang==='zh'?'目录':'Index'}</button></div></div>
    {list.length?<section className={'project-collection '+view} aria-label={title}>{list.map((p,i)=><button key={p.id} className={'project-item '+(p.status==='placeholder'?'placeholder-project':'')} onClick={()=>go('/project/'+p.id)} {...hoverProps}><div className="project-thumbnail"><Media src={p.cover} alt={tx(p.title,lang)}/><span className="project-open">↗</span>{p.status!=='ready'&&<span className="project-status">{p.status==='placeholder'?(lang==='zh'?'待补充':'TO COME'):(lang==='zh'?'进行中':'IN PROGRESS')}</span>}</div><div className="project-item-caption"><span className="item-number">{num(i+1)}</span><div><h2>{tx(p.title,lang)}</h2><p>{tx(p.subtitle,lang)}</p></div><span className="project-item-year">{p.year}</span><Arrow/></div></button>)}</section>:<EmptyArchive lang={lang}/>}
    <Footer lang={lang} go={go}/></>;
}

function EmptyArchive({lang}){return <section className="empty-archive"><div className="empty-contact-sheet">{[1,2,3,4].map(n=><div key={n}><span>FRAME {num(n)}</span><i>+</i><span>{lang==='zh'?'尚未选入':'NOT YET SELECTED'}</span></div>)}</div><p>{lang==='zh'?'这一页留给真正的个人摄影作品。作品整理好后，图像会慢慢填进来。':'A place for personal photographs. The images will arrive as the collection takes shape.'}</p></section>;}

function Lightbox({lang,item,onClose}){
  const [i,setI]=useState(item.index||0),[zoom,setZoom]=useState(false),ref=useRef(null);
  useDialogFocus(ref);
  const im=item.images[i];
  useEffect(()=>{ref.current?.querySelector('button')?.focus();const key=e=>{if(e.key==='ArrowRight'){e.preventDefault();setI(v=>(v+1)%item.images.length);setZoom(false);}if(e.key==='ArrowLeft'){e.preventDefault();setI(v=>(v-1+item.images.length)%item.images.length);setZoom(false);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
  const advance=d=>{setI((i+d+item.images.length)%item.images.length);setZoom(false);};
  return <div className="lightbox" role="dialog" aria-modal="true" aria-label={lang==='zh'?'图像查看器':'Image viewer'} ref={ref}><div className="lightbox-toolbar"><span>{num(i+1)} / {num(item.images.length)}</span><button onClick={()=>setZoom(!zoom)}>{zoom?(lang==='zh'?'适合屏幕':'Fit to screen'):(lang==='zh'?'放大':'Zoom in')} {zoom?'−':'+'}</button><button onClick={onClose}>{lang==='zh'?'关闭':'Close'} ×</button></div><div className={'lightbox-canvas '+(zoom?'zoomed':'')}><img src={im.src} alt={tx(im.caption,lang)} onClick={()=>setZoom(!zoom)}/></div><div className="lightbox-bottom"><button onClick={()=>advance(-1)} disabled={item.images.length<2} aria-label={lang==='zh'?'上一张':'Previous image'}><Arrow direction="left"/></button><p>{tx(im.caption,lang)}</p><button onClick={()=>advance(1)} disabled={item.images.length<2} aria-label={lang==='zh'?'下一张':'Next image'}><Arrow/></button></div></div>;
}

function About({lang,go}){
  const jobs=[['2026.03—05','Fairland / iGarden','视觉设计实习','Visual design internship'],['2025.06—08','熊猫同学 / Panda','海外运营实习','Overseas social media operations'],['2024.09—12','即来互娱 / Jilai','海外广告投放实习','Overseas advertising internship'],['2023.07—09','兔展 / Rabbitpre','产品经理实习','Product management internship']];
  return <><section className="about-page"><div className="about-portrait page-enter"><Media src={personal.portrait} alt={lang==='zh'?'魏一鸣个人肖像':'Portrait of Yiming Wei'} eager/><small>WEI YIMING / {lang==='zh'?'个人肖像':'PORTRAIT'}</small></div><div className="about-main"><small className="page-enter">{lang==='zh'?'关于我':'A LITTLE ABOUT ME'}</small><h1 className="page-enter">{lang==='zh'?<>你好，<br/>我是<em>魏一鸣。</em></>:<>Hello, I’m<br/><em>Yiming Wei.</em></>}</h1><p className="about-lead page-enter">{lang==='zh'?'我本科毕业于华南农业大学风景园林专业，目前在香港大学攻读 Master of Landscape Architecture（MLA）。':'I studied landscape architecture at South China Agricultural University and am currently pursuing a Master of Landscape Architecture at the University of Hong Kong.'}</p><p className="page-enter">{lang==='zh'?'我的实践从景观与空间延伸到平面视觉、编辑排版、三维场景和数字交互。在深圳的实习中，我接触过产品体验、海外广告投放、社媒运营及视觉资料制作。':'My practice extends from landscape and space into graphic communication, editorial design, 3D scenes and digital interaction. Internships in Shenzhen have introduced me to product experiences, overseas advertising, social media and visual production.'}</p><p className="page-enter">{lang==='zh'?'我持续尝试生成式 AI 和 AI 辅助网页制作，关注图像、信息与空间如何被组织。这里既展示作品，也记录方法和仍在发展的想法。':'I continue to experiment with generative media and AI-assisted web projects, interested in how images, information and spaces are organised. This site is both a collection of work and a record of ongoing methods and ideas.'}</p><a className="text-arrow" href={personal.resume} target="_blank" rel="noreferrer">{lang==='zh'?'下载个人简历 · 中文 PDF':'Download CV · Chinese PDF'}<Arrow/></a><a className="about-email" href={'mailto:'+personal.email}>{personal.email} ↗</a></div></section>
    <section className="experience-section"><div className="section-kicker"><small>{lang==='zh'?'经历':'EXPERIENCE'}</small><h2>{lang==='zh'?'学习与实践':'Learning & practice'}</h2></div><div className="experience-list"><div><span>2026—</span><h3>{lang==='zh'?'香港大学':'The University of Hong Kong'}</h3><p>Master of Landscape Architecture</p></div><div><span>2022—2026</span><h3>{lang==='zh'?'华南农业大学':'South China Agricultural University'}</h3><p>{lang==='zh'?'风景园林 本科':'Undergraduate studies in Landscape Architecture'}</p></div>{jobs.map(j=><div key={j[0]}><span>{j[0]}</span><h3>{j[1]}</h3><p>{lang==='zh'?j[2]:j[3]}</p></div>)}</div></section>
    <section className="personal-photo-placeholder"><small>{lang==='zh'?'生活与创作':'LIFE & PRACTICE'}</small><div className="empty-contact-sheet">{[1,2,3].map(i=><div key={i}><span>PERSONAL / {num(i)}</span><i>+</i><span>{lang==='zh'?'照片整理中':'IMAGES TO COME'}</span></div>)}</div></section><Footer lang={lang} go={go}/></>;
}

function Footer({lang,go}){return <footer><div className="footer-title"><small>{lang==='zh'?'继续保持好奇':'STAY CURIOUS'}</small><button onClick={()=>go('/work')}>{lang==='zh'?<>继续<em>探索。</em></>:<>Keep <em>looking.</em></>}<Arrow/></button></div><div className="footer-bottom"><span>© 2026 WEI YIMING</span><span>{lang==='zh'?'香港 / 深圳':'HONG KONG / SHENZHEN'}</span><button onClick={()=>go('/about')}>{lang==='zh'?'关于与联系':'ABOUT & CONTACT'} ↗</button><button onClick={()=>window.scrollTo({top:0,behavior:isReduced()?'instant':'smooth'})}>{lang==='zh'?'返回顶部':'BACK TO TOP'} ↑</button></div></footer>;}
function NotFound({lang,go}){return <section className="not-found"><small>404 /</small><h1>{lang==='zh'?'这一页尚未展开。':'This page hasn’t unfolded.'}</h1><button className="text-arrow" onClick={()=>go('/work')}>{lang==='zh'?'返回作品':'Back to work'}<Arrow/></button></section>;}

createRoot(document.getElementById('root')).render(<App/>);
