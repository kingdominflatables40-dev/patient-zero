'use strict';
// Tests for Play-with-bots and Solo practice (client-side modes) + client syntax check.
const fs=require('fs'),path=require('path'),assert=require('assert');
const E=require('./engine.js'),B=require('./public/bots.js'),ART=require('./public/art.js');
let passed=0;const ok=(c,m)=>{assert.ok(c,m);passed++};
function rng(seed){let x=seed>>>0||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%100000)/100000}}

// 1) Bots mode: every seat is a bot that sees only its own private state.
const wins={humans:0,infected:0};
for(let n=5;n<=10;n++){
  for(let k=0;k<60;k++){
    const names=['You'].concat(B.BOT_NAMES.slice(0,n-1));
    const g=E.createGame(names);const r=rng(n*1000+k+7);
    const mems=names.map(()=>B.newMemory());
    let steps=0;
    while(g.phase!=='win'&&steps<2000){
      steps++;
      const pub=E.publicState(g);let acted=false;
      for(const p of g.players){
        const priv=E.privateState(g,p.id);
        B.observe(mems[p.id],pub,priv);
        const a=B.decide(pub,priv,mems[p.id],r);
        if(!a)continue;
        ok(!a.pid||a.pid===p.id,'bot acts only for its own seat');
        const res=E.applyAction(g,p.id,a);
        ok(!(res&&res.error),'bot action legal: '+JSON.stringify(a)+' '+(res&&res.error));
        acted=true;break;
      }
      ok(acted,'someone could act in phase '+g.phase);
    }
    ok(g.phase==='win','bot game '+n+'p #'+k+' finished');
    wins[g.winner]++;
  }
}
ok(wins.humans>10&&wins.infected>10,'both sides can win vs bots '+JSON.stringify(wins));
console.log('bots mode: 360 games, wins',wins);

// 2) Solo practice: one person drives every seat; actorOf must always name a seat that can act.
for(let n=5;n<=10;n++){
  for(let k=0;k<30;k++){
    const g=E.createGame(B.BOT_NAMES.slice(0,n).map(s=>'S'+s));const r=rng(n*77+k);
    const mems=g.players.map(()=>B.newMemory());
    let steps=0;
    while(g.phase!=='win'&&steps<2000){
      steps++;
      const id=B.actorOf(g);
      ok(id!=null,'solo: actor exists in '+g.phase);
      const priv=E.privateState(g,id);
      ok(priv.canAct,'solo: actor can act ('+g.phase+')');
      B.observe(mems[id],E.publicState(g),priv);
      const a=B.decide(E.publicState(g),priv,mems[id],r);
      ok(a,'solo: action chosen');
      const res=E.applyAction(g,id,a);
      ok(!(res&&res.error),'solo action legal '+(res&&res.error));
    }
    ok(g.phase==='win','solo game finished');
    ok(B.actorOf(g)===null,'no actor after win');
  }
}
console.log('solo mode: 180 games ok');

// 3) Privacy: bots never get other hands/roles from privateState.
{
  const g=E.createGame(['A','B','C','D','E','F','G']);
  const humans=g.players.filter(p=>p.role==='human');
  for(const h of humans){const pv=E.privateState(g,h.id);ok(!pv.allies,'human bot has no ally list')}
}

// 4) Art: every card renders an SVG.
for(const k of Object.keys(ART.CARDS)){const s=ART.CARDS[k]();ok(/^<svg[\s\S]*<\/svg>$/.test(s.trim()),'card svg '+k)}
ok(['human','infected','zero','teamHuman','teamInfected','cure','outbreak','leader','medic','yes','no','back'].every(k=>ART.CARDS[k]),'full card set');

// 5) Client inline script parses.
const html=fs.readFileSync(path.join(__dirname,'public','index.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
ok(scripts.length>=1,'inline script found');
scripts.forEach((s,i)=>{new Function(s);passed++});
ok(/src="\/art\.js"/.test(html)&&/src="\/bots\.js"/.test(html),'client loads art.js and bots.js');

console.log('\nMODE TESTS PASSED',passed,'assertions');
