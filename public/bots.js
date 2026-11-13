/* Patient Zero: simple bot opponents + turn helper. Runs in the browser and in Node tests.
   Bots only look at what their seat is allowed to know (public state + their own private state). */
(function(root){
"use strict";
function pick(a,rnd){return a[Math.floor(rnd()*a.length)]}
function newMemory(){return {sus:{},seen:-1}}
// Update a bot's suspicion notes from the public state (call on every state change).
function observe(mem,pub,priv){
  const key=(pub.log||[]).length+':'+pub.phase;
  if(mem.seen===key)return;mem.seen=key;
  const add=(id,v)=>{if(id==null)return;mem.sus[id]=(mem.sus[id]||0)+v};
  if(pub.phase==='enact-pub'&&pub.pub&&!pub.pub.chaos){
    if(pub.pub.kind==='outbreak'){add(pub.prevLeader,1);add(pub.prevMedic,2)}
    if(pub.pub.kind==='cure'){add(pub.prevLeader,-1);add(pub.prevMedic,-1)}
  }
  if(priv&&priv.blood&&priv.blood.id!=null) add(priv.blood.id,priv.blood.result==='Infected'?10:-6);
  (pub.players||[]).forEach(p=>{if(p.knownNotZero&&mem.sus[p.id]==null)mem.sus[p.id]=-1});
}
function teamOf(priv){return priv.role==='human'?'human':'infected'}
function allyIds(priv){return (priv.allies||[]).map(a=>a.id)}
function zeroId(priv){const z=(priv.allies||[]).find(a=>a.role==='zero');return z?z.id:(priv.role==='zero'?priv.you:null)}
function sus(mem,id){return mem.sus[id]||0}
function byLowSus(mem,ids,rnd){return ids.slice().sort((a,b)=>sus(mem,a)-sus(mem,b)||rnd()-.5)}
function byHighSus(mem,ids,rnd){return ids.slice().sort((a,b)=>sus(mem,b)-sus(mem,a)||rnd()-.5)}

// Returns the action this seat should take now, or null if it has nothing to do.
function decide(pub,priv,mem,rnd){
  rnd=rnd||Math.random;mem=mem||newMemory();
  if(!priv||!priv.canAct)return null;
  const me=priv.you,team=teamOf(priv),allies=allyIds(priv),bad=team==='infected';
  const living=pub.players.filter(p=>p.alive).map(p=>p.id);
  const ph=pub.phase;
  if(ph==='night')return {type:'ready',pid:me};
  if(ph==='vote-results')return {type:'continueVotes',pid:me};
  if(ph==='enact-pub')return {type:'continue',pid:me};
  if(ph==='nominate'){
    const el=priv.eligible||[];if(!el.length)return null;
    let id;
    if(bad){
      const z=zeroId(priv);
      if(pub.outbreaks>=3&&z!=null&&z!==me&&el.includes(z))id=z;            // go for the win
      else{const a=el.filter(x=>allies.includes(x));id=a.length&&rnd()<.55?pick(a,rnd):byLowSus(mem,el,rnd)[0];}
    }else id=byLowSus(mem,el,rnd)[0];
    return {type:'nominate',pid:me,medicId:id};
  }
  if(ph==='vote'){
    const L=pub.leader,M=pub.medic;let yes;
    if(bad){
      const z=zeroId(priv);
      if(pub.outbreaks>=3&&M===z)yes=true;
      else if(allies.includes(L)||allies.includes(M)||L===me||M===me)yes=rnd()<.9;
      else yes=rnd()<.45;
    }else{
      if(L===me||M===me)yes=true;
      else{
        const s=sus(mem,L)+sus(mem,M)*1.5;
        const risky=pub.outbreaks>=3&&!(pub.players.find(p=>p.id===M)||{}).knownNotZero;
        yes=s<=1&&!(risky&&rnd()<.35);
        if(pub.fails>=2&&s<4)yes=true;          // avoid a panic draw
        if(rnd()<.1)yes=!yes;                     // humans are not perfect
      }
    }
    return {type:'vote',pid:me,yes};
  }
  if(ph==='discard'){
    const h=priv.hand||[];
    let i;
    if(bad){i=h.indexOf('cure');if(i<0||(rnd()<.2&&h.filter(c=>c==='outbreak').length>=2&&pub.cures<3))i=h.indexOf('outbreak');}
    else{i=h.indexOf('outbreak');}
    if(i<0)i=0;
    return {type:'bury',pid:me,index:i};
  }
  if(ph==='medic'){
    const h=priv.hand||[];
    const refused=/refused the veto/.test((pub.log||[]).slice(-1)[0]||'');
    if(!bad&&pub.vetoOn&&!refused&&h.every(c=>c==='outbreak'))return {type:'proposeVeto',pid:me};
    let i;
    if(bad){i=h.indexOf('outbreak');if(rnd()<.2&&pub.cures<=2&&h.includes('cure'))i=h.indexOf('cure');}
    else i=h.indexOf('cure');
    if(i<0)i=0;
    return {type:'enact',pid:me,index:i};
  }
  if(ph==='veto-leader'){
    const h=priv.hand||[];
    const agree=!bad&&h.every(c=>c==='outbreak')&&pub.fails<2;
    return {type:'vetoResponse',pid:me,agree};
  }
  if(ph==='power'){
    if(pub.power==='peek')return {type:'peekDone',pid:me};
    let ids=living.filter(id=>id!==me);
    if(pub.power==='blood')ids=ids.filter(id=>!pub.players.find(p=>p.id===id).investigated);
    if(!ids.length)return null;
    let id;
    if(pub.power==='special')id=bad?(ids.find(x=>allies.includes(x))??byLowSus(mem,ids,rnd)[0]):byLowSus(mem,ids,rnd)[0];
    else if(pub.power==='blood')id=bad?pick(ids.filter(x=>!allies.includes(x)).concat(ids).slice(0,Math.max(1,ids.length)),rnd):byHighSus(mem,ids,rnd)[0];
    else{ // quarantine
      if(bad){const t=ids.filter(x=>!allies.includes(x));id=t.length?byLowSus(mem,t,rnd)[0]:ids[0];}
      else{const t=ids.filter(x=>!(pub.players.find(p=>p.id===x).knownNotZero));id=byHighSus(mem,t.length?t:ids,rnd)[0];}
    }
    return {type:'powerTarget',pid:me,playerId:id};
  }
  if(ph==='power-result')return {type:'bloodDone',pid:me};
  return null;
}
// Who must act next in a one-device game (solo practice / pass-and-play), given the full engine state.
function actorOf(g){
  if(!g||g.phase==='win')return null;
  const ph=g.phase;
  if(ph==='night'){const p=g.players.find(p=>!g.ready[p.id]);return p?p.id:null}
  if(ph==='nominate'||ph==='discard'||ph==='power'||ph==='power-result'||ph==='veto-leader')return g.leader;
  if(ph==='medic')return g.medic;
  if(ph==='vote'){const p=g.players.find(p=>p.alive&&g.votes[p.id]===undefined);return p?p.id:null}
  if(ph==='vote-results'||ph==='enact-pub'){const p=g.players.find(p=>p.alive);return p?p.id:null}
  return null;
}
const BOT_NAMES=['Grim','Moxie','Hollow','Patch','Rusty','Dot','Vex','Bones','Sable'];
const API={decide,observe,newMemory,actorOf,BOT_NAMES};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
if(typeof window!=='undefined')root.PZBots=API;
})(typeof window!=='undefined'?window:globalThis);
