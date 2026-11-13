/* Patient Zero card art: original hand-built SVG, retro poster style. CC BY-NC-SA 4.0 */
(function(root){
"use strict";
let uid=0;
const INK='#16180f',BONE='#e8dcbc';
const C={
  human:{bg:'#2f5a3a',ray:'#9fd37a',band:'#1f3d27',txt:'#e8f3c8'},
  infected:{bg:'#5b1f1b',ray:'#e0584c',band:'#3a1210',txt:'#ffd9d2'},
  zero:{bg:'#5a4513',ray:'#f0c04a',band:'#3a2c0b',txt:'#ffeab0'},
  cure:{bg:'#24503a',ray:'#b6e05a',band:'#17321f',txt:'#e8f7c4'},
  outbreak:{bg:'#4e1714',ray:'#d9483d',band:'#320d0b',txt:'#ffd2cb'},
  leader:{bg:'#2c3d4f',ray:'#e3b34f',band:'#1b2633',txt:'#ffe7a8'},
  medic:{bg:'#38404a',ray:'#e8e0cc',band:'#22282e',txt:'#fff4dc'},
  yes:{bg:'#2e5a2c',ray:'#8ed08a',band:'#1c3a1b',txt:'#e4ffd9'},
  no:{bg:'#5c1d19',ray:'#e3685f',band:'#3a110e',txt:'#ffdcd6'}
};
function rays(cx,cy,col,n){
  let s='';n=n||14;
  for(let i=0;i<n;i++){
    const a1=(i/n)*Math.PI*2,a2=a1+Math.PI/n,r=120;
    s+=`M${cx} ${cy}L${(cx+r*Math.cos(a1)).toFixed(1)} ${(cy+r*Math.sin(a1)).toFixed(1)}L${(cx+r*Math.cos(a2)).toFixed(1)} ${(cy+r*Math.sin(a2)).toFixed(1)}Z`;
  }
  return `<path d="${s}" fill="${col}" opacity=".22"/>`;
}
function grain(){ // little speckles for printed look
  let s='';for(let i=0;i<26;i++){const x=(i*37%86)+8,y=(i*53%88)+8;s+=`M${x} ${y}h1v1h-1z`;}
  return `<path d="${s}" fill="#000" opacity=".25"/>`;
}
function frame(k,title,sub,art,cls){
  const c=C[k],id='pzc'+(++uid);
  return `<svg class="${cls||'cardsvg'}" viewBox="0 0 100 140" role="img" aria-label="${title}">
<defs><clipPath id="${id}"><rect x="6" y="6" width="88" height="94" rx="5"/></clipPath></defs>
<rect x="1" y="1" width="98" height="138" rx="9" fill="${BONE}" stroke="${INK}" stroke-width="2"/>
<g clip-path="url(#${id})"><rect x="6" y="6" width="88" height="94" fill="${c.bg}"/>${rays(50,56,c.ray)}${art}${grain()}</g>
<rect x="6" y="6" width="88" height="94" rx="5" fill="none" stroke="${INK}" stroke-width="1.5"/>
<rect x="6" y="104" width="88" height="19" rx="3" fill="${c.band}"/>
<text x="50" y="118.5" text-anchor="middle" font-family="Impact,'Arial Black',sans-serif" font-size="${title.length>9?10.5:13}" letter-spacing="${title.length>9?0.3:1}"${title.length>9?' textLength="82" lengthAdjust="spacingAndGlyphs"':''} fill="${c.txt}">${title}</text>
<text x="50" y="133" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="7.5" fill="${INK}">${sub}</text>
</svg>`;
}
/* ---- illustrations (drawn in the 6..94 x 6..100 window) ---- */
const A={};
A.human=()=>`<path d="M14 100c2-20 16-28 36-28s34 8 36 28z" fill="#1d2b22"/>
<path d="M30 76l20 10 20-10" stroke="#9fd37a" stroke-width="3" fill="none"/>
<ellipse cx="50" cy="50" rx="17" ry="20" fill="#d9b48c"/>
<path d="M32 44c0-14 8-22 18-22s18 8 18 22c-6-5-30-5-36 0z" fill="#e3b34f" stroke="${INK}" stroke-width="1.5"/>
<rect x="30" y="41" width="40" height="5" rx="2" fill="#c59a2e" stroke="${INK}" stroke-width="1"/>
<circle cx="50" cy="31" r="4.5" fill="#fff6c4" stroke="${INK}" stroke-width="1.2"/>
<circle cx="43" cy="53" r="2.2" fill="${INK}"/><circle cx="57" cy="53" r="2.2" fill="${INK}"/>
<path d="M44 62q6 4 12 0" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<path d="M33 52q-3 6 1 10M67 52q3 6-1 10" stroke="#b68e66" stroke-width="2" fill="none"/>`;
A.zombie=(skin,eye)=>`<path d="M12 100c3-21 17-30 38-30s35 9 38 30z" fill="#2a1d1a"/>
<path d="M26 82l6 8 4-9 6 10 4-8M58 80l5 9 5-7 6 9" stroke="#5a4038" stroke-width="2.5" fill="none"/>
<path d="M32 50c-2-18 8-28 19-28 12 0 20 10 18 27-1 12-6 22-18 23-11 0-18-9-19-22z" fill="${skin}" stroke="${INK}" stroke-width="1.5"/>
<path d="M36 30l5 6 3-8 5 7 4-9 4 8 5-5" stroke="${INK}" stroke-width="1.5" fill="none"/>
<path d="M54 37l8 7M56 35l-3 4M59 38l-3 4M62 41l-3 4" stroke="${INK}" stroke-width="1.3"/>
<circle cx="43" cy="50" r="4.5" fill="${INK}"/><circle cx="43" cy="50" r="2" fill="${eye}"/>
<circle cx="58" cy="49" r="5" fill="${INK}"/><circle cx="58" cy="49" r="2.3" fill="${eye}"/>
<path d="M41 63h20l-2 5h-16z" fill="${INK}"/><path d="M44 63v3M48 63v4M52 63v4M56 63v3" stroke="${BONE}" stroke-width="1.4"/>
<path d="M36 58q-2 8 0 12M66 56q2 6 1 10" stroke="#3d5a2a" stroke-width="2" fill="none"/>
<circle cx="66" cy="70" r="2" fill="#7a1e18"/><path d="M66 72v5" stroke="#7a1e18" stroke-width="2" stroke-linecap="round"/>`;
A.infected=()=>A.zombie('#9aa37a','#ff5a4a');
function bio(cx,cy,r,col,bg){
  let s='';
  for(let i=0;i<3;i++){const a=-Math.PI/2+i*2*Math.PI/3,x=cx+Math.cos(a)*r*.55,y=cy+Math.sin(a)*r*.55,x2=cx+Math.cos(a)*r*.75,y2=cy+Math.sin(a)*r*.75;
    s+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r*.5).toFixed(1)}" fill="${col}"/><circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="${(r*.36).toFixed(1)}" fill="${bg}"/>`;}
  return s+`<circle cx="${cx}" cy="${cy}" r="${(r*.32).toFixed(1)}" fill="none" stroke="${col}" stroke-width="${(r*.12).toFixed(1)}"/><circle cx="${cx}" cy="${cy}" r="${(r*.14).toFixed(1)}" fill="${bg}"/>`;
}
A.zero=()=>`<g opacity=".55">${bio(50,40,30,'#f0c04a','#5a4513')}</g>`+A.zombie('#a8b07a','#f0c04a')+
`<path d="M34 26l4-12 6 9 6-13 6 13 6-9 4 12z" fill="#f0c04a" stroke="${INK}" stroke-width="1.5"/><circle cx="50" cy="18" r="2" fill="#c4453c"/>`;
A.teamHuman=()=>`<path d="M50 18l28 9v22c0 20-12 32-28 40-16-8-28-20-28-40V27z" fill="#1d3a26" stroke="${BONE}" stroke-width="3"/>
<path d="M44 34h12v12h12v12H56v12H44V58H32V46h12z" fill="#b6e05a" stroke="${INK}" stroke-width="1.5"/>`;
A.teamInfected=()=>bio(50,52,30,'#e0584c','#4e1714')+`<path d="M22 86q4 6 0 12M78 84q-3 6 1 12M50 92v8" stroke="#e0584c" stroke-width="3" stroke-linecap="round"/>`;
A.cure=()=>`<g transform="rotate(-35 50 52)"><rect x="42" y="18" width="16" height="54" rx="3" fill="#dff1f0" stroke="${INK}" stroke-width="2"/>
<rect x="44" y="40" width="12" height="30" fill="#b6e05a"/><path d="M42 30h7M42 40h7M42 50h7M42 60h7" stroke="${INK}" stroke-width="1.3"/>
<rect x="38" y="12" width="24" height="6" rx="2" fill="#8c937f" stroke="${INK}" stroke-width="1.5"/><rect x="47" y="2" width="6" height="10" fill="#8c937f" stroke="${INK}" stroke-width="1.5"/>
<path d="M50 72v18" stroke="${INK}" stroke-width="2.4"/></g>
<circle cx="26" cy="28" r="2.4" fill="#e8f7c4"/><circle cx="76" cy="78" r="3" fill="#e8f7c4"/><path d="M72 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#e8f7c4"/>`;
function virus(cx,cy,r,col){
  let s='';for(let i=0;i<12;i++){const a=i*Math.PI/6,x1=cx+Math.cos(a)*r,y1=cy+Math.sin(a)*r,x2=cx+Math.cos(a)*(r+9),y2=cy+Math.sin(a)*(r+9);
    s+=`<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${INK}" stroke-width="2.4"/><circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="3.4" fill="${col}" stroke="${INK}" stroke-width="1.3"/>`;}
  return s+`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}" stroke="${INK}" stroke-width="2"/><circle cx="${cx-6}" cy="${cy-5}" r="4" fill="${INK}" opacity=".35"/><circle cx="${cx+7}" cy="${cy+4}" r="3" fill="${INK}" opacity=".35"/><circle cx="${cx+2}" cy="${cy-9}" r="2" fill="${INK}" opacity=".35"/>`;
}
A.outbreak=()=>`<path d="M16 84q8-6 14 2t14-2q8 4 14-2t26 4v20H16z" fill="#7a1e18"/>`+virus(50,48,18,'#9fbf4a')+
`<circle cx="22" cy="24" r="3" fill="#d9483d"/><circle cx="80" cy="30" r="4" fill="#d9483d"/><circle cx="76" cy="20" r="2" fill="#d9483d"/>`;
A.leader=()=>`<path d="M50 14l9 18 20 3-14 14 3 20-18-9-18 9 3-20-14-14 20-3z" fill="#e3b34f" stroke="${INK}" stroke-width="2"/>
<path d="M30 74l34-12v32L30 82z" fill="#c4453c" stroke="${INK}" stroke-width="2"/><rect x="22" y="72" width="9" height="12" fill="#8c937f" stroke="${INK}" stroke-width="1.5"/>
<path d="M68 70q6 8 0 16M74 66q10 12 0 24" stroke="#ffe7a8" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
A.medic=()=>`<rect x="22" y="38" width="56" height="44" rx="6" fill="#ece4d0" stroke="${INK}" stroke-width="2"/>
<path d="M38 38v-8a4 4 0 014-4h16a4 4 0 014 4v8" fill="none" stroke="${INK}" stroke-width="3"/>
<path d="M45 46h10v8h8v10h-8v8H45v-8h-8V54h8z" fill="#c4453c" stroke="${INK}" stroke-width="1.4"/>
<path d="M22 50h56" stroke="${INK}" stroke-width="1" opacity=".4"/>`;
A.yes=()=>`<circle cx="50" cy="50" r="30" fill="none" stroke="#e4ffd9" stroke-width="4" stroke-dasharray="6 3"/>
<path d="M33 52l12 12 23-26" stroke="#e4ffd9" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M33 52l12 12 23-26" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/>`;
A.no=()=>`<circle cx="50" cy="50" r="30" fill="none" stroke="#ffdcd6" stroke-width="4" stroke-dasharray="6 3"/>
<path d="M36 36l28 28M64 36L36 64" stroke="#ffdcd6" stroke-width="9" stroke-linecap="round"/>
<path d="M36 36l28 28M64 36L36 64" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".5"/>`;
function back(cls){
  const id='pzb'+(++uid);
  return `<svg class="${cls||'cardsvg'}" viewBox="0 0 100 140" aria-label="Face-down card"><defs><pattern id="${id}" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M0 10h20M10 0v20" stroke="#2c3a26" stroke-width="1"/><circle cx="10" cy="10" r="2" fill="#2c3a26"/></pattern></defs>
<rect x="1" y="1" width="98" height="138" rx="9" fill="#18201a" stroke="${INK}" stroke-width="2"/><rect x="6" y="6" width="88" height="128" rx="6" fill="url(#${id})" stroke="#b6e05a" stroke-width="1.5"/>
<circle cx="50" cy="70" r="28" fill="#18201a" stroke="#b6e05a" stroke-width="2"/>${bio(50,70,24,'#b6e05a','#18201a')}
<text x="50" y="124" text-anchor="middle" font-family="Impact,'Arial Black',sans-serif" font-size="9" letter-spacing="2" fill="#b6e05a">PATIENT ZERO</text></svg>`;
}
const CARDS={
  human:()=>frame('human','HUMAN','Still uninfected',A.human()),
  infected:()=>frame('infected','INFECTED','Already turning',A.infected()),
  zero:()=>frame('zero','PATIENT ZERO','The source',A.zero()),
  teamHuman:()=>frame('human','TEAM HUMAN','Loyalty card',A.teamHuman()),
  teamInfected:()=>frame('infected','TEAM INFECTED','Loyalty card',A.teamInfected()),
  cure:()=>frame('cure','CURE','Supply card',A.cure()),
  outbreak:()=>frame('outbreak','OUTBREAK','Supply card',A.outbreak()),
  leader:()=>frame('leader','SQUAD LEADER','Picks the Medic',A.leader()),
  medic:()=>frame('medic','MEDIC','Plays the card',A.medic()),
  yes:()=>frame('yes','YES','Ballot',A.yes()),
  no:()=>frame('no','NO','Ballot',A.no()),
  back:()=>back()
};
/* small icons for track slots / tips */
const ICON={
  peek:'<svg viewBox="0 0 24 24" class="ico"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>',
  blood:'<svg viewBox="0 0 24 24" class="ico"><path d="M12 2s7 8 7 13a7 7 0 01-14 0c0-5 7-13 7-13z" fill="currentColor"/></svg>',
  special:'<svg viewBox="0 0 24 24" class="ico"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" fill="currentColor"/></svg>',
  quarantine:'<svg viewBox="0 0 24 24" class="ico"><rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor"/><path d="M8 10V7a4 4 0 018 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
  skull:'<svg viewBox="0 0 24 24" class="ico"><path d="M12 2a9 9 0 00-9 9c0 3 1.5 5 3 6v3h12v-3c1.5-1 3-3 3-6a9 9 0 00-9-9z" fill="currentColor"/><circle cx="8.5" cy="11" r="2.3" fill="#000"/><circle cx="15.5" cy="11" r="2.3" fill="#000"/><path d="M10 20v-3M14 20v-3" stroke="#000" stroke-width="1.5"/></svg>',
  heart:'<svg viewBox="0 0 24 24" class="ico"><path d="M12 21l-8-8a5 5 0 017-7l1 1 1-1a5 5 0 017 7z" fill="currentColor"/><path d="M12 8v8M8 12h8" stroke="#000" stroke-width="2"/></svg>',
  veto:'<svg viewBox="0 0 24 24" class="ico"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M6 18L18 6" stroke="currentColor" stroke-width="2.4"/></svg>'
};
function avatar(name,mode){ // mode: '', 'zombie','zero' (only when revealed)
  let h=7;for(const ch of String(name))h=(h*131+ch.charCodeAt(0)*977)%100003;h=(h*137)%360;
  const skin=mode==='zombie'||mode==='zero'?'#9aa37a':`hsl(${(h%40)+15},45%,${62+(h%12)}%)`;
  const shirt=`hsl(${h},35%,32%)`;
  return `<svg viewBox="0 0 48 48" class="avsvg"><circle cx="24" cy="24" r="23" fill="hsl(${h},25%,18%)"/><path d="M6 46c2-10 9-14 18-14s16 4 18 14z" fill="${shirt}"/><circle cx="24" cy="20" r="10" fill="${skin}"/>`+
  (mode?`<circle cx="20" cy="19" r="2" fill="${mode==='zero'?'#f0c04a':'#ff5a4a'}"/><circle cx="28" cy="19" r="2" fill="${mode==='zero'?'#f0c04a':'#ff5a4a'}"/><path d="M19 25h10" stroke="#16180f" stroke-width="2"/>`:`<circle cx="20.5" cy="19" r="1.4" fill="#16180f"/><circle cx="27.5" cy="19" r="1.4" fill="#16180f"/>`)+
  `<text x="24" y="44" text-anchor="middle" font-family="Impact,'Arial Black',sans-serif" font-size="9" fill="#fff" opacity=".9">${String(name).slice(0,1).toUpperCase().replace(/[<&>"]/g,'')}</text></svg>`;
}
const API={CARDS,ICON,avatar};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
if(typeof window!=='undefined')root.PZArt=API;
})(typeof window!=='undefined'?window:globalThis);
