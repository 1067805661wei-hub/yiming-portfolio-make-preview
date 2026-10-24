import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { reducedMotion } from '../lib/motion';
import './home-v3.css';

const tx = (value, lang) => typeof value === 'string' ? value : value?.[lang] || value?.en || value?.zh || '';
const pad = value => String(value).padStart(2, '0');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const modulo = (value, limit) => ((value % limit) + limit) % limit;
const picks = ['graphic-k-black', 'spatial-moroccan-courtyard', 'living-edge', 'dune-remake', 'plant-reference', 'sleeve'];
const portrait = '/assets/personal/designer-portrait-v3.png';
// Retained across route unmounts in this app session, without persisting a
// visitor's browsing position across a fresh load.
let rememberedHomePosition = 0;

function Portrait({ className = '', decorative = true, lang, eager = false }) {
  return <img className={className} src={portrait} alt={decorative ? '' : lang === 'zh' ? '魏一鸣 · AI 辅助创作的人像' : 'Yiming Wei · AI-assisted portrait'} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable="false" onError={event => { if (!event.currentTarget.dataset.fallback) { event.currentTarget.dataset.fallback = 'true'; event.currentTarget.src = '/assets/personal/life-portrait.webp'; } }} />;
}

function Intro({ lang, go, ready, navigate, scenic, duplicate = false }) {
  const Heading = duplicate ? 'h2' : 'h1';
  return <section className={'v3-intro v3-scene ' + (ready ? 'is-ready ' : '') + (duplicate ? 'v3-intro-clone' : '')} aria-label={duplicate ? undefined : lang === 'zh' ? '个人网站介绍' : 'Introduction'} aria-hidden={duplicate ? true : undefined} inert={duplicate ? '' : undefined}>
    <div className="v3-intro-left">
      <div className="v3-portrait" aria-hidden="true"><Portrait lang={lang} eager /><div className="v3-portrait-shade" /></div>
      <div className="v3-grain" aria-hidden="true" />
      <article className="v3-identity-card">
        <div className="v3-identity-top"><button onClick={() => go('/about')} tabIndex={duplicate ? -1 : undefined}>{lang === 'zh' ? '魏一鸣' : 'Yiming Wei'} <sup>↗</sup></button><span>{lang === 'zh' ? <>香港<br />深圳</> : <>Hong Kong<br />Shenzhen</>}</span></div>
        <div className="v3-identity-bottom"><div className="v3-identity-label"><span>{lang === 'zh' ? '景观 · 视觉 · 数字创作' : 'Landscape · Visual · Digital'}</span><span>{'{ 1* }'}</span></div><Heading>{lang === 'zh' ? <><span>在空间与</span><span>图像间表达。</span></> : <><span>Tracing ideas</span><span>across mediums.</span></>}</Heading></div>
      </article>
      <div className="v3-intro-footnote"><span>{'{ 1* }'}</span><p>{lang === 'zh' ? <>通过景观、图像、三维场景与数字交互，<br />探索不同的表达方式。</> : <>EXPLORING LANDSCAPE, VISUAL COMMUNICATION,<br />3D WORLDS AND DIGITAL EXPERIENCES.</>}</p></div>
      <button className="v3-scroll-cue" onClick={() => navigate('work')} tabIndex={duplicate ? -1 : undefined}><i /><span>{lang === 'zh' ? '向下探索' : 'Scroll to explore'}</span></button>
    </div>
    <div className="v3-intro-right">
      <img className="v3-scenic-image" src={scenic?.cover} alt="" draggable="false" decoding="async" />
      <div className="v3-scenic-shade" aria-hidden="true" />
      <div className="v3-scenic-credit"><span>{lang === 'zh' ? '空间实验' : 'IMAGINED SPACES'}</span><span>{lang === 'zh' ? '光，场所，以及另一种观看。' : 'Light, place, and another way of seeing.'}</span></div>
      <button className="v3-lens-title" onClick={() => navigate('archive')} tabIndex={duplicate ? -1 : undefined} aria-label={lang === 'zh' ? '探索七个作品维度' : 'Explore seven creative disciplines'}>
        <small>{'{ 2* }'}</small><span className="v3-lens-line">{lang === 'zh' ? '换个角度' : 'THROUGH'}</span><span className="v3-lens-line v3-lens-bottom">{lang !== 'zh' && <span>MY</span>}<span className="v3-lens-inset"><img src="/assets/personal/coastal-atmosphere-preview.webp" alt="" draggable="false" loading="lazy" decoding="async" /></span><span>{lang === 'zh' ? '观看' : 'LENS'}</span></span>
      </button>
      <div className="v3-lens-footnote"><span>{'{ 2* }'}</span><p>{lang === 'zh' ? <>从场地到页面，从实体到屏幕。<br />不同媒介之间，保持同一份好奇。</> : <>FROM PLACES TO PAGES. FROM OBJECTS TO SCREENS.<br />DIFFERENT MEDIUMS, THE SAME CURIOSITY.</>}</p></div>
      <span className="v3-scene-label">{lang === 'zh' ? 'UE5 · 日式废寺' : 'UE5 · ABANDONED JAPANESE TEMPLE'}</span>
    </div>
  </section>;
}

function WorkStage({ featured, index, lang, go, navigate, categories, hoverProps, stageRef, mobile = false, total }) {
  const project = featured[index] || featured[0];
  if (!project) return null;
  const category = categories.find(item => item.id === project.category);
  return <div className={'v3-work-stage ' + (mobile ? 'v3-work-mobile' : '')} ref={stageRef}>
    <div className="v3-work-art">
      <div className="v3-work-atmospheres" aria-hidden="true">{(mobile ? [project] : featured).map(item => <img key={item.id} className={item.id === project.id ? 'is-current' : ''} src={item.cover} alt="" draggable="false" loading="lazy" />)}</div>
      <div className="v3-work-vignette" aria-hidden="true" />
      <div className="v3-art-stack">{(mobile ? [project] : featured).map(item => <button key={item.id} className={'v3-art-frame v3-art-' + item.category + (item.id === project.id ? ' is-current' : '')} onClick={() => go('/project/' + item.id)} aria-label={(lang === 'zh' ? '查看项目：' : 'View project: ') + tx(item.title, lang)} tabIndex={item.id === project.id ? 0 : -1} aria-hidden={item.id !== project.id ? true : undefined} {...hoverProps}><img src={item.cover} alt={tx(item.title, lang)} draggable="false" loading="lazy" decoding="async" /><span className="v3-art-open">↗</span></button>)}</div>
      <div className="v3-art-caption"><span>FIG. {pad(index + 1)}</span><span>{tx(project.subtitle, lang)}</span></div>
    </div>
    <aside className="v3-work-information">
      <div className="v3-work-index"><nav aria-label={lang === 'zh' ? '精选作品' : 'Selected projects'}>{featured.map((item, position) => <button key={item.id} className={position === index ? 'is-current' : ''} onClick={() => navigate(position + 1)} aria-current={position === index ? 'true' : undefined}><span>{pad(position + 1)}</span><span>{tx(item.title, lang)}</span></button>)}</nav><span className="v3-work-number" aria-hidden="true">{pad(index + 1)}</span></div>
      <div className="v3-work-detail"><button className="v3-view-project" onClick={() => go('/project/' + project.id)}><span>{lang === 'zh' ? '进入项目' : 'View more'}</span><span>↗</span></button><div className="v3-work-title" key={project.id}><small>{tx(category?.title, lang)} <span>/ {project.year}</span></small><h2>{tx(project.title, lang)}</h2></div></div>
      <button className="v3-all-work" onClick={() => go('/work')}>{lang === 'zh' ? '全部作品' : 'All projects'} <span>{pad(total)} ↗</span></button>
    </aside>
  </div>;
}

function AboutChapter({ lang, go, personal, projects, categories }) {
  const [hovered, setHovered] = useState(null), left = useRef(null), preview = useRef(null);
  const lenses = [
    { category: 'landscape', project: 'living-edge', label: 'Landscape' },
    { category: 'graphic', project: 'graphic-k-black', label: 'Visual' },
    { category: 'digital', project: 'sleeve', label: 'Digital' },
  ].map(lens => ({ ...lens, work: projects.find(project => project.id === lens.project), title: lang === 'zh' ? tx(categories.find(category => category.id === lens.category)?.title, lang) : lens.label }));
  const hover = (event, lens) => {
    if (event.pointerType === 'touch' || !left.current || !preview.current) return;
    setHovered(lens.category);
    const area = left.current.getBoundingClientRect(), word = event.currentTarget.getBoundingClientRect(), reduce = reducedMotion();
    const px = !reduce && Number.isFinite(event.clientX) ? event.clientX : word.left + word.width / 2;
    const py = !reduce && Number.isFinite(event.clientY) ? event.clientY : word.top;
    const width = preview.current.offsetWidth, height = preview.current.offsetHeight;
    const x = clamp(px - area.left + 24, 20, Math.max(20, area.width - width - 24));
    const y = clamp(py - area.top - height - 24, 80, Math.max(80, area.height - height - 24));
    if (reduce) gsap.set(preview.current, { x, y, rotation: 0 });
    else gsap.to(preview.current, { x, y, rotation: -2, duration: .8, ease: 'power3.out', overwrite: true });
  };
  useEffect(() => {
    const node = preview.current;
    const reset = () => { setHovered(null); if (node) gsap.killTweensOf(node); };
    window.addEventListener('resize', reset); window.addEventListener('portfolio-motion-change', reset);
    return () => { window.removeEventListener('resize', reset); window.removeEventListener('portfolio-motion-change', reset); if (node) gsap.killTweensOf(node); };
  }, []);
  return <section className="v3-about v3-scene" data-chapter="about"><div className="v3-about-left" ref={left}><small>{'{ 3* }'} / {lang === 'zh' ? '关于我' : 'A LITTLE ABOUT ME'}</small><h2>{lang === 'zh' ? <>不止一种<br /><em>观看方式。</em></> : <>Not one<br /><em>single lens.</em></>}</h2><div className="v3-about-lenses" aria-label={lang === 'zh' ? '作品维度' : 'Creative disciplines'}>{lenses.map(lens => <button key={lens.category} onPointerEnter={event => hover(event, lens)} onPointerMove={event => hover(event, lens)} onPointerLeave={() => setHovered(null)} onFocus={event => hover(event, lens)} onBlur={() => setHovered(null)} onClick={() => go('/work/' + lens.category)}><span>[</span> {lens.title} <span>]</span></button>)}</div><div className={'v3-about-preview ' + (hovered ? 'is-visible' : '')} ref={preview} aria-hidden="true">{lenses.map(lens => <figure key={lens.category} className={hovered === lens.category ? 'is-current' : ''}><img src={lens.work?.cover} alt="" loading="lazy" draggable="false" /><figcaption>{tx(lens.work?.title, lang)}</figcaption></figure>)}</div><div className="v3-about-marginal"><span>HONG KONG<br />SHENZHEN</span><span>LANDSCAPE<br />VISUAL<br />DIGITAL</span></div></div><div className="v3-about-right"><p className="v3-about-lead">{lang === 'zh' ? '跨越不同媒介，保留同一份好奇。' : 'Different mediums. The same curiosity.'}</p><div className="v3-about-copy"><p>{lang === 'zh' ? '我目前在香港大学攻读 MLA，本科毕业于华南农业大学风景园林专业。我的实践在空间、平面视觉、三维场景与数字交互之间展开。' : 'I’m Yiming Wei, an MLA student at the University of Hong Kong with a background in landscape architecture. My practice moves between space, visual communication, 3D worlds and digital interaction.'}</p><p>{lang === 'zh' ? '这个网站收录课程项目、实习成果与个人实验，也为仍在发展的想法保留空间。' : 'This site brings together academic projects, internship work and personal experiments, with space for ideas still taking shape.'}</p></div><div className="v3-about-links"><button onClick={() => go('/about')}>{lang === 'zh' ? '更多关于我' : 'More about me'} ↗</button><a href={personal.resume} target="_blank" rel="noreferrer">{lang === 'zh' ? '个人简历 · 中文 PDF' : 'CV · Chinese PDF'} ↗</a></div></div></section>;
}

function PhotographyChapter({ lang, go }) {
  return <section className="v3-photography v3-scene" data-chapter="photography"><div className="v3-photo-title"><small>{'{ 4* }'} / {lang === 'zh' ? '摄影档案' : 'THE PHOTOGRAPHIC ARCHIVE'}</small><h2>{lang === 'zh' ? <>为新的<br /><em>观察留白。</em></> : <>Room for<br /><em>new observations.</em></>}</h2><span className="v3-photo-caption">{lang === 'zh' ? '一种正在形成的观看方式。' : 'A way of looking, still in the making.'}</span></div><div className="v3-photo-space"><div className="v3-photo-empty" aria-label={lang === 'zh' ? '摄影作品待补充' : 'Photographs forthcoming'}><span>FRAME 001</span><i>+</i><small>{lang === 'zh' ? '尚未选入' : 'NOT YET SELECTED'}</small></div><div className="v3-photo-description"><p>{lang === 'zh' ? '摄影作品正在整理。这里先留下一页空白。' : 'A photographic archive is taking shape. A little space, for now.'}</p><button onClick={() => go('/work/photography')}>{lang === 'zh' ? '进入摄影档案' : 'The photographic archive'} ↗</button></div></div></section>;
}

function ArchiveChapter({ lang, go, categories, personal, navigate }) {
  return <section className="v3-archive v3-scene" data-chapter="archive"><div className="v3-archive-left"><small>01—07 / {lang === 'zh' ? '作品与探索' : 'WORKS & EXPLORATIONS'}</small><h2>{lang === 'zh' ? <>始终保持<br /><em>好奇。</em></> : <>Keep<br /><em>looking.</em></>}</h2><a href={'mailto:' + personal.email}>{personal.email} ↗</a><span className="v3-archive-signature">© 2026 WEI YIMING</span></div><div className="v3-archive-right"><p>{lang === 'zh' ? '七个维度，一段持续的探索。' : 'Seven lenses. One ongoing exploration.'}</p><nav aria-label={lang === 'zh' ? '七个作品维度' : 'Seven creative disciplines'}>{categories.map(category => <button key={category.id} onClick={() => go('/work/' + category.id)}><span>{category.n}</span><span>{tx(category.title, lang)}</span><span>↗</span></button>)}</nav><button className="v3-begin-again" onClick={() => navigate('intro')}><span>{lang === 'zh' ? '继续滚动，重新发现。' : 'Keep scrolling. See things again.'}</span><span>↓</span></button></div></section>;
}

/** One virtual coordinate drives every desktop scene. The trailing Intro is a
 * purely visual seam; modulo wrapping works in either direction, including
 * reduced-motion mode. The accessible mobile version uses native scrolling. */
export default function HomeV3({ lang, go, ready, hoverProps, projects, categories, personal, active = true }) {
  const featured = useMemo(() => picks.map(id => projects.find(project => project.id === id)).filter(Boolean), [projects]);
  const scenic = projects.find(project => project.id === 'spatial-abandoned-temple') || featured[1];
  const total = projects.filter(project => project.status !== 'placeholder').length;
  const [desktop, setDesktop] = useState(() => matchMedia('(min-width: 801px)').matches);
  const [workIndex, setWorkIndex] = useState(0);
  const root = useRef(null), strip = useRef(null), workStage = useRef(null), controller = useRef(null);
  const position = useRef(rememberedHomePosition), currentWork = useRef(0), activeRef = useRef(active), readyRef = useRef(ready);
  activeRef.current = active; readyRef.current = ready;
  const navigate = section => {
    if (controller.current) { controller.current(section); return; }
    const name = typeof section === 'number' ? '[data-mobile-work="' + Math.max(0, section - 1) + '"]' : section === 'intro' ? '.v3-intro' : section === 'work' ? '[data-mobile-work="0"]' : '[data-chapter="' + section + '"]';
    root.current?.querySelector(name)?.scrollIntoView({ behavior: reducedMotion() ? 'instant' : 'smooth', block: 'start' });
  };
  useEffect(() => { const query = matchMedia('(min-width: 801px)'); const resize = () => setDesktop(query.matches); query.addEventListener('change', resize); return () => query.removeEventListener('change', resize); }, []);
  useEffect(() => { const move = section => navigate(section); window.__portfolioHomeNavigate = move; return () => { if (window.__portfolioHomeNavigate === move) delete window.__portfolioHomeNavigate; }; }, [desktop]);
  useLayoutEffect(() => {
    if (!desktop || !root.current || !strip.current) return;
    const element = root.current, track = strip.current, stage = workStage.current;
    let height = window.innerHeight, current = position.current * height, target = current, frame = 0, focusFrame = 0, lastTime = 0, reduced = reducedMotion(), drag = null, suppressClick = false;
    const sceneCount = featured.length + 4;
    let pointerX = 0, pointerY = 0, easedX = 0, easedY = 0, theme = '';
    const chapterNodes = Array.from(track.children);
    const chapterBounds = [[0, 1], [1, featured.length + 1], [featured.length + 1, featured.length + 2], [featured.length + 2, featured.length + 3], [featured.length + 3, featured.length + 4]];
    document.documentElement.classList.add('v3-virtual-home');
    const paint = () => {
      const period = height * sceneCount, normalized = modulo(current, period), chapter = normalized / height;
      track.style.transform = 'translate3d(0,' + (-normalized).toFixed(3) + 'px,0)';
      if (stage) stage.style.transform = 'translate3d(0,' + clamp(normalized - height, 0, (featured.length - 1) * height).toFixed(3) + 'px,0)';
      const index = clamp(Math.floor(chapter - 1), 0, featured.length - 1);
      if (chapter >= 1 && chapter < featured.length + 1 && currentWork.current !== index) { currentWork.current = index; setWorkIndex(index); }
      const nextTheme = chapter >= featured.length + 2 && chapter < featured.length + 3 ? 'light' : 'dark';
      if (theme !== nextTheme) { theme = nextTheme; document.documentElement.dataset.homeTheme = theme; }
      element.dataset.position = normalized.toFixed(2); element.dataset.virtualPosition = current.toFixed(2); element.dataset.cycleLength = String(period);
      element.dataset.scene = chapter < 1 ? 'intro' : chapter < featured.length + 1 ? 'work-' + (index + 1) : chapter < featured.length + 2 ? 'about' : chapter < featured.length + 3 ? 'photography' : 'archive';
      chapterNodes.forEach((node, i) => { const bounds = chapterBounds[i]; const hidden = !bounds || chapter + 1 <= bounds[0] || chapter >= bounds[1]; if (node.inert !== hidden) node.inert = hidden; });
      element.style.setProperty('--v3-pointer-x', (reduced ? 0 : easedX).toFixed(3));
      element.style.setProperty('--v3-pointer-y', (reduced ? 0 : easedY).toFixed(3));
      element.style.setProperty('--v3-work-progress', String(clamp(chapter - 1 - index, 0, 1)));
      element.style.setProperty('--v3-parallax', String(reduced ? 0 : clamp(chapter - 1 - index, 0, 1) - .5));
      position.current = current / height;
    };
    const tick = time => {
      const dt = lastTime ? Math.min(time - lastTime, 48) : 16.67; lastTime = time;
      if (!activeRef.current || !readyRef.current) { target = current; pointerX = pointerY = 0; }
      const ease = reduced ? 1 : 1 - Math.exp(-dt / 145);
      current += (target - current) * ease;
      if (Math.abs(target - current) < .025) current = target;
      easedX += (pointerX - easedX) * .075; easedY += (pointerY - easedY) * .075;
      paint(); frame = requestAnimationFrame(tick);
    };
    const accepts = event => activeRef.current && readyRef.current && !event.defaultPrevented && !event.target.closest?.('.project-layer,.menu-panel,.lightbox,input,textarea,select,video,[contenteditable="true"]');
    const wheel = event => { if (!accepts(event) || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return; event.preventDefault(); const scale = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? height : 1; target += clamp(event.deltaY * scale, -height * .9, height * .9); if (reduced) { current = target; paint(); } };
    const key = event => {
      if (!accepts(event) || event.metaKey || event.ctrlKey || event.altKey) return;
      const keys = { ArrowDown: height * .16, ArrowUp: -height * .16, PageDown: height * .9, PageUp: -height * .9, ' ': height * (event.shiftKey ? -.9 : .9) };
      if (!(event.key in keys)) return;
      if (event.key === ' ' && event.target.closest?.('button,a')) return;
      event.preventDefault(); target += keys[event.key]; if (reduced) { current = target; paint(); }
    };
    const down = event => { if (!accepts(event) || event.button !== 0 || event.target.closest?.('a,input,textarea,select')) return; drag = { y: event.clientY, startY: event.clientY, position: current, moved: false, id: event.pointerId }; suppressClick = false; };
    const move = event => {
      const bounds = element.getBoundingClientRect(); pointerX = clamp((event.clientX - bounds.left) / bounds.width - .5, -.5, .5); pointerY = clamp((event.clientY - bounds.top) / bounds.height - .5, -.5, .5);
      if (!drag || drag.id !== event.pointerId || !activeRef.current) return;
      const distance = drag.startY - event.clientY;
      if (Math.abs(distance) > 5) { drag.moved = true; element.classList.add('is-dragging'); element.setPointerCapture?.(event.pointerId); }
      if (drag.moved) { event.preventDefault(); target = drag.position + distance; if (reduced) { current = target; paint(); } }
    };
    const up = event => { if (!drag || drag.id !== event.pointerId) return; suppressClick = drag.moved; if (element.hasPointerCapture?.(event.pointerId)) element.releasePointerCapture(event.pointerId); drag = null; element.classList.remove('is-dragging'); };
    const click = event => { if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; } };
    const leave = () => { pointerX = pointerY = 0; };
    const restoreNativePosition = () => { if (element.scrollTop) element.scrollTop = 0; if (track.scrollTop) track.scrollTop = 0; if (window.scrollY) window.scrollTo({ top: 0, behavior: 'instant' }); };
    const focus = () => { cancelAnimationFrame(focusFrame); focusFrame = requestAnimationFrame(restoreNativePosition); };
    const resize = () => { const oldHeight = height; height = window.innerHeight; current = current / oldHeight * height; target = target / oldHeight * height; paint(); };
    const motionChange = () => { reduced = reducedMotion(); target = current; paint(); };
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', motionChange);
    controller.current = section => {
      const destinations = { intro: 0, work: 1, about: featured.length + 1, photography: featured.length + 2, archive: featured.length + 3 };
      const unit = typeof section === 'number' ? clamp(section, 0, sceneCount - 1) : destinations[section] ?? 0;
      const period = sceneCount * height, base = Math.floor(current / period) * period, candidates = [-1, 0, 1].map(offset => base + unit * height + offset * period);
      const currentUnit = modulo(current, period) / height;
      target = typeof section === 'number' && currentUnit >= 1 && currentUnit < featured.length + 1 ? base + unit * height : candidates.reduce((best, candidate) => Math.abs(candidate - current) < Math.abs(best - current) ? candidate : best, candidates[0]);
      if (reduced) { current = target; paint(); }
    };
    window.addEventListener('wheel', wheel, { passive: false }); window.addEventListener('keydown', key); window.addEventListener('resize', resize); window.addEventListener('portfolio-motion-change', motionChange); window.addEventListener('scroll', restoreNativePosition, { passive: true });
    element.addEventListener('pointerdown', down); element.addEventListener('pointermove', move); element.addEventListener('pointerup', up); element.addEventListener('pointercancel', up); element.addEventListener('pointerleave', leave); element.addEventListener('click', click, true);
    element.addEventListener('focusin', focus); element.addEventListener('scroll', restoreNativePosition, { passive: true });
    restoreNativePosition();
    paint(); frame = requestAnimationFrame(tick);
    return () => { rememberedHomePosition = position.current; cancelAnimationFrame(frame); cancelAnimationFrame(focusFrame); window.removeEventListener('wheel', wheel); window.removeEventListener('keydown', key); window.removeEventListener('resize', resize); window.removeEventListener('portfolio-motion-change', motionChange); motionQuery.removeEventListener('change', motionChange); window.removeEventListener('scroll', restoreNativePosition); element.removeEventListener('pointerdown', down); element.removeEventListener('pointermove', move); element.removeEventListener('pointerup', up); element.removeEventListener('pointercancel', up); element.removeEventListener('pointerleave', leave); element.removeEventListener('click', click, true); element.removeEventListener('focusin', focus); element.removeEventListener('scroll', restoreNativePosition); controller.current = null; chapterNodes.forEach(node => { if (!node.classList.contains('v3-intro-clone')) node.inert = false; }); track.style.removeProperty('transform'); if (stage) stage.style.removeProperty('transform'); element.style.setProperty('--v3-pointer-x', '0'); element.style.setProperty('--v3-pointer-y', '0'); element.style.setProperty('--v3-parallax', '0'); ['position','virtualPosition','cycleLength','scene'].forEach(key => delete element.dataset[key]); document.documentElement.classList.remove('v3-virtual-home'); delete document.documentElement.dataset.homeTheme; };
  }, [desktop, featured.length]);
  return <div className={'v3-home ' + (desktop ? 'is-desktop' : 'is-mobile') + (ready ? ' is-ready' : '')} data-language={lang} ref={root}>
    <div className="v3-home-strip" ref={strip}>
      <Intro lang={lang} go={go} ready={ready} navigate={navigate} scenic={scenic} />
      {desktop ? <section className="v3-works" id="selected" style={{ height: `calc(${featured.length} * 100dvh)` }} aria-label={lang === 'zh' ? '精选作品' : 'Selected works'}><WorkStage featured={featured} index={workIndex} lang={lang} go={go} navigate={navigate} categories={categories} hoverProps={hoverProps} stageRef={workStage} total={total} /></section> : <section className="v3-works" id="selected" aria-label={lang === 'zh' ? '精选作品' : 'Selected works'}>{featured.map((project, index) => <div key={project.id} data-mobile-work={index}><WorkStage featured={featured} index={index} lang={lang} go={go} navigate={navigate} categories={categories} hoverProps={hoverProps} mobile total={total} /></div>)}</section>}
      <AboutChapter lang={lang} go={go} personal={personal} projects={projects} categories={categories} />
      <PhotographyChapter lang={lang} go={go} />
      <ArchiveChapter lang={lang} go={go} categories={categories} personal={personal} navigate={navigate} />
      {desktop && <Intro lang={lang} go={go} ready={true} navigate={navigate} scenic={scenic} duplicate />}
    </div>
  </div>;
}
