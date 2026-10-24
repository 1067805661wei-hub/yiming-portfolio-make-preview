import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { reducedMotion } from '../lib/motion';

export default function Preloader({ lang, onReveal, onComplete }) {
  const root=useRef(null), number=useRef(null);
  useLayoutEffect(()=>{
    let disposed=false;
    const tracks=[],timers=[];
    const delay=ms=>new Promise(resolve=>timers.push(setTimeout(resolve,ms)));
    const progress={value:0};
    const update=()=>{if(number.current)number.current.textContent=String(Math.floor(progress.value));};
    const imageReady=src=>new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>{if(img.decode)img.decode().catch(()=>{}).then(resolve);else resolve();};
      img.onerror=resolve;img.src=src;
    });
    const reduced=reducedMotion();
    const assets=Promise.race([Promise.allSettled([imageReady('/assets/personal/designer-portrait-v3.png'),document.fonts.ready]),delay(2800)]);
    const first=gsap.to(progress,{value:89,duration:reduced?.55:1.1,ease:'power1.out',onUpdate:update});
    tracks.push(first);
    Promise.all([assets,delay(reduced?600:1150)]).then(()=>{
      if(disposed)return;
      first.kill();
      const sequence=gsap.timeline();tracks.push(sequence);
      sequence.to(progress,{value:100,duration:reduced?.12:.32,ease:'power2.out',onUpdate:update})
        .call(onReveal)
        .to(root.current,{opacity:0,duration:reduced?.12:.18,delay:reduced?.06:.2,ease:'none'})
        .call(onComplete);
    });
    return()=>{disposed=true;timers.forEach(clearTimeout);tracks.forEach(t=>t.kill());};
  },[]);
  return <div ref={root} className="preloader preloader-v3" aria-label={lang==='zh'?'正在载入作品集':'Loading portfolio'} aria-busy="true">
    <span className="loader-v3-name">w.</span>
    <div className="loader-v3-count"><span ref={number} data-loader-count>0</span><span className="loader-v3-label">{lang==='zh'?'即将展开':'COMING INTO VIEW'}</span></div>
  </div>;
}
