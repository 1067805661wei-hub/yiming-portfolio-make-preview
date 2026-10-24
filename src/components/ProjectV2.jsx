import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { reducedMotion } from '../lib/motion';
import './project-v2.css';

const tx = (value, lang) => typeof value === 'string' ? value : value?.[lang] ?? value?.en ?? value?.zh ?? '';
const num = value => String(value).padStart(2, '0');

function useReducedMotion() {
  const [reduced, setReduced] = useState(reducedMotion);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(reducedMotion());
    query.addEventListener('change', update);
    window.addEventListener('portfolio-motion-change', update);
    return () => {
      query.removeEventListener('change', update);
      window.removeEventListener('portfolio-motion-change', update);
    };
  }, []);
  return reduced;
}

function normaliseImages(items, title) {
  return (Array.isArray(items) ? items : []).map(image => typeof image === 'string'
    ? { src: image, caption: title }
    : { ...image, caption: image.caption || title });
}

export default function ProjectV2({ lang, go, project: p, onLightbox, projects = [], categoryOf, Arrow }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [transition, setTransition] = useState(null);
  const [version, setVersion] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [playRequested, setPlayRequested] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const incoming = useRef(null), outgoing = useRef(null), caption = useRef(null);
  const sequence = useRef(null), film = useRef(null), timeline = useRef(null), busy = useRef(false);
  const images = normaliseImages(p.images?.length ? p.images : p.cover ? [{ src: p.cover, caption: p.title }] : [], p.title);
  const process = normaliseImages(p.processImages || p.process, p.title);
  const safeIndex = Math.min(index, Math.max(images.length - 1, 0));
  const visibleIndex = transition?.to ?? safeIndex;
  const image = images[visibleIndex];
  // Keep the presentation mode stable while changing images. Portrait pages and
  // landscape details can coexist in the gallery without moving the metadata rail.
  const lead = images[0];
  const aspect = lead?.width && lead?.height ? lead.width / lead.height : 16 / 10;
  const paper = ['landscape', 'botanical'].includes(p.category);
  const panoramic = !paper && p.category !== 'digital' && aspect > 2.05;
  const portrait = !paper && aspect < 0.9;
  const category = categoryOf?.(p.category);
  const video = p.versions?.[version]?.src || p.video;
  const sameCategory = projects.filter(item => item.category === p.category && item.status !== 'placeholder');
  const position = sameCategory.findIndex(item => item.id === p.id);
  const next = position >= 0 && sameCategory.length > 1 ? sameCategory[(position + 1) % sameCategory.length] : null;
  const stageRatio = paper ? Math.max(0.82, Math.min(aspect, 1.65)) : portrait ? 1.04 : Math.min(aspect, 2.65);

  useLayoutEffect(() => {
    timeline.current?.kill();
    busy.current = false;
    setIndex(0); setTransition(null); setVersion(0); setSheet(false);
    setPlayRequested(false); setMediaFailed(false);
    return () => { timeline.current?.kill(); busy.current = false; };
  }, [p.id]);

  useEffect(() => { setMediaFailed(false); setPlayRequested(false); }, [video]);

  useEffect(() => {
    if (video || images.length < 2) return;
    const adjacent = [(safeIndex + 1) % images.length, (safeIndex - 1 + images.length) % images.length];
    adjacent.forEach(itemIndex => {
      const preload = new window.Image();
      preload.src = images[itemIndex].src;
      preload.decode?.().catch(() => {});
    });
  }, [p.id, safeIndex, video]);

  function change(direction) {
    if (busy.current || images.length < 2 || video) return;
    const to = (safeIndex + direction + images.length) % images.length;
    if (reduced) { setIndex(to); return; }
    busy.current = true;
    setTransition({ from: safeIndex, to, direction });
  }

  useLayoutEffect(() => {
    if (!transition || !incoming.current || !outgoing.current) return;
    const direction = transition.direction;
    const enterMask = direction > 0 ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)';
    const exitMask = direction > 0 ? 'inset(0% 0% 100% 0%)' : 'inset(100% 0% 0% 0%)';
    const previousPicture = outgoing.current.querySelector('img');
    const nextPicture = incoming.current.querySelector('img');
    const tl = gsap.timeline({ onComplete: () => {
      setIndex(transition.to); setTransition(null); busy.current = false;
    }});
    timeline.current = tl;
    tl.set(incoming.current, { clipPath: enterMask })
      .set(outgoing.current, { clipPath: 'inset(0% 0% 0% 0%)' })
      .fromTo(nextPicture, { yPercent: direction * 4, scale: 1.025 },
        { yPercent: 0, scale: 1, duration: 0.95, ease: 'power3.inOut' }, 0)
      .to(incoming.current, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.95, ease: 'power3.inOut' }, 0)
      .to(outgoing.current, { clipPath: exitMask, duration: 0.95, ease: 'power3.inOut' }, 0)
      .to(previousPicture, { yPercent: -direction * 4, scale: 1.02, duration: 0.95, ease: 'power3.inOut' }, 0)
      .fromTo(caption.current, { y: direction * 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.2);
    return () => tl.kill();
  }, [transition]);

  useEffect(() => {
    const onKey = event => {
      if (document.querySelector('.lightbox') || event.target.closest?.('input, textarea, select, video')) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); change(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); change(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [safeIndex, images.length, video, reduced]);

  const openLightbox = (items, itemIndex = 0) => onLightbox?.({ images: items, index: itemIndex });
  function showSequence() {
    const nextValue = !sheet;
    setSheet(nextValue);
    if (nextValue) requestAnimationFrame(() => requestAnimationFrame(() => sequence.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' })));
  }
  function requestPlay() {
    const player = film.current;
    if (!player) return;
    player.play().then(() => setPlayRequested(true)).catch(() => setPlayRequested(true));
  }
  function changeVersion(newVersion) {
    film.current?.pause();
    setVersion(newVersion); setPlayRequested(false);
  }
  const classes = ['v2-project', `v2-project--${p.category}`, paper && 'v2-project--paper',
    portrait && 'v2-project--portrait', panoramic && 'v2-project--panoramic'].filter(Boolean).join(' ');

  return <article className={classes} lang={lang === 'zh' ? 'zh-CN' : 'en'}>
    <section className="v2-project-stage" aria-label={lang === 'zh' ? '项目展示' : 'Project presentation'}>
      <header className="v2-project-heading">
        <div className="v2-project-kicker"><span>{category?.n || '—'} / {tx(category?.title, lang)}</span></div>
        <h1>{tx(p.title, lang)}</h1>
        <p>{tx(p.subtitle, lang)}</p>
      </header>

      <dl className="v2-project-meta">
        <div className="v2-project-contribution"><dt>{lang === 'zh' ? '参与内容' : 'CONTRIBUTION'}</dt><dd>{tx(p.role, lang) || '—'}</dd></div>
        <div><dt>{lang === 'zh' ? '工具 / 媒介' : 'TOOLS / MEDIUM'}</dt><dd>{p.tools?.length ? p.tools.join(', ') : tx(p.subtitle, lang)}</dd></div>
        <div><dt>{lang === 'zh' ? '状态' : 'STATUS'}</dt><dd>{p.status === 'ready' ? (lang === 'zh' ? '现有成果' : 'Available work') : p.status === 'wip' ? (lang === 'zh' ? '进行中' : 'In progress') : (lang === 'zh' ? '待补充' : 'To come')}</dd></div>
      </dl>

      <div className="v2-project-media">
        {video ? <div className="v2-film-stage">
          <video ref={film} key={video} src={video} poster={p.poster || p.cover} controls={playRequested} playsInline preload="metadata"
            onPlay={() => setPlayRequested(true)} onError={() => setMediaFailed(true)} aria-label={tx(p.title, lang)} />
          {!playRequested && !mediaFailed && <button className="v2-film-play" onClick={requestPlay} aria-label={lang === 'zh' ? '播放影片' : 'Play film'}><span aria-hidden="true">▶</span><small>{lang === 'zh' ? '播放影片' : 'PLAY FILM'}</small></button>}
          {mediaFailed && <div className="v2-film-error"><p>{lang === 'zh' ? '此影片暂时无法播放。' : 'This film could not be played.'}</p><a href={video} target="_blank" rel="noreferrer">{lang === 'zh' ? '单独打开影片' : 'Open film separately'} ↗</a></div>}
        </div> : image ? <button className="v2-image-stage" style={{ '--v2-frame-ratio': stageRatio }} onClick={() => { if (!busy.current) openLightbox(images, safeIndex); }}
          aria-label={lang === 'zh' ? '放大当前图像' : 'Enlarge current image'}>
          {transition ? <>
            <div className="v2-image-layer v2-image-outgoing" ref={outgoing}><img src={images[transition.from].src} alt="" /></div>
            <div className="v2-image-layer v2-image-incoming" ref={incoming}><img src={images[transition.to].src} alt={tx(image.caption, lang)} /></div>
          </> : <div className="v2-image-layer" key={image.src}><img src={image.src} alt={tx(image.caption, lang)} /></div>}
          <span className="v2-enlarge-indicator" aria-hidden="true">↗</span>
        </button> : <div className="v2-project-empty"><span>{category?.n || '—'}</span><p>{lang === 'zh' ? '一个等待展开的项目。' : 'A project, waiting to unfold.'}</p></div>}

        <div className="v2-media-caption" ref={caption}>
          <div className="v2-media-count" aria-live="polite"><span className="v2-figure-label">{video ? 'FILM' : 'FIG.'}</span><span>{String(video ? version + 1 : image ? visibleIndex + 1 : 0).padStart(3, '0')}</span>{!video && <><span className="v2-count-divider">/</span><span>{String(images.length).padStart(3, '0')}</span></>}</div>
          <p>{video ? tx(p.subtitle, lang) : tx(image?.caption, lang)}</p>
          {!video && images.length > 1 && <div className="v2-media-arrows"><button onClick={() => change(-1)} disabled={!!transition} aria-label={lang === 'zh' ? '上一张' : 'Previous image'}><Arrow direction="left" /></button><button onClick={() => change(1)} disabled={!!transition} aria-label={lang === 'zh' ? '下一张' : 'Next image'}><Arrow /></button></div>}
        </div>
        {video && p.versions?.length > 1 && <div className="v2-version-picker" aria-label={lang === 'zh' ? '影片版本' : 'Film versions'}>{p.versions.map((item, itemIndex) => <button key={item.src || itemIndex} onClick={() => changeVersion(itemIndex)} className={itemIndex === version ? 'is-active' : ''} aria-pressed={itemIndex === version}>{tx(item.label, lang)}</button>)}</div>}
      </div>

      <aside className="v2-project-info">
        <div className="v2-project-description"><span className="v2-label">{lang === 'zh' ? '关于项目' : 'ABOUT THE PROJECT'}</span><p>{tx(p.description, lang)}</p></div>
        <div className="v2-project-footnote">
          <div className="v2-project-year"><span className="v2-label">{lang === 'zh' ? '年份' : 'YEAR'}</span><span>{p.year}</span></div>
          <div className="v2-project-actions">
            {images.length > 1 && <button onClick={showSequence} aria-expanded={sheet}><span>{sheet ? (lang === 'zh' ? '收起图像序列' : 'Close image sequence') : (lang === 'zh' ? '展开图像序列' : 'View image sequence')} <small>({images.length})</small></span><Arrow direction={sheet ? 'right' : 'down'} /></button>}
            {video && <a href={video} target="_blank" rel="noreferrer">{lang === 'zh' ? '单独打开影片' : 'Open film separately'} <span aria-hidden="true">↗</span></a>}
          </div>
        </div>
      </aside>
    </section>

    {sheet && <section className="v2-project-sequence" ref={sequence}><div className="v2-section-heading"><h2>{lang === 'zh' ? '图像序列' : 'The image sequence'}</h2><span>{num(images.length)} {lang === 'zh' ? '幅图像' : 'IMAGES'}</span></div>
      <div className="v2-sequence-grid">{images.map((item, itemIndex) => <figure key={item.src + itemIndex} className={(item.width / item.height > 1.8 ? 'v2-sequence-wide ' : '') + (paper ? 'v2-sequence-paper' : '')}><button onClick={() => openLightbox(images, itemIndex)} aria-label={(lang === 'zh' ? '放大图像 ' : 'Enlarge image ') + (itemIndex + 1)}><img src={item.src} alt={tx(item.caption, lang)} loading="lazy" /></button><figcaption><span>{num(itemIndex + 1)}</span><p>{tx(item.caption, lang)}</p></figcaption></figure>)}</div>
    </section>}

    {process.length > 0 && <section className="v2-project-process"><div className="v2-section-heading"><h2>{lang === 'zh' ? '制作过程' : 'Behind the work'}</h2><span>{lang === 'zh' ? '工作流记录' : 'PROCESS / WORKFLOW'}</span></div><div className="v2-process-grid">{process.map((item, itemIndex) => <figure key={item.src + itemIndex}><button onClick={() => openLightbox(process, itemIndex)} aria-label={(lang === 'zh' ? '放大过程图 ' : 'Enlarge process image ') + (itemIndex + 1)}><img src={item.src} alt={tx(item.caption, lang)} loading="lazy" /><span aria-hidden="true">↗</span></button><figcaption>{tx(item.caption, lang)}</figcaption></figure>)}</div></section>}

    {next && <nav className="v2-next-project" aria-label={lang === 'zh' ? '下一个项目' : 'Next project'}><button onClick={() => go('/project/' + next.id)}><span className="v2-label">{lang === 'zh' ? '继续浏览 / 下一个项目' : 'CONTINUE / NEXT PROJECT'}</span><span className="v2-next-title">{tx(next.title, lang)}<Arrow /></span><span className="v2-next-subtitle">{tx(next.subtitle, lang)}</span></button></nav>}
  </article>;
}
