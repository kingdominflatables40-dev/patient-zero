'use strict';
/**
 * Patient Zero — authoritative rules engine.
 * Mechanics follow official Secret Hitler (CC BY-NC-SA 4.0); theme and wording are original.
 */
const ROLES = {5:[3,1],6:[4,1],7:[4,2],8:[5,2],9:[5,3],10:[6,3]};

function powerTrack(n){
  if(n<=6) return [null,null,'peek','quarantine','quarantine'];
  if(n<=8) return [null,'blood','special','quarantine','quarantine'];
  return ['blood','blood','special','quarantine','quarantine'];
}
function powerLabel(p){
  return p==='peek'?'Supply peek':p==='blood'?'Blood test':p==='special'?'Appoint Leader':p==='quarantine'?'Quarantine':'';
}
function shuffle(a){
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function living(s){return s.players.filter(p=>p.alive);}
function byId(s,id){return s.players.find(p=>p.id===id);}
function nm(s,id){const p=byId(s,id);return p?p.name:'?';}
function log(s,t){s.log.push(t);if(s.log.length>80)s.log.shift();}
function nextLivingAfter(s,id){
  const n=s.players.length;
  const i=s.players.findIndex(p=>p.id===id);
  for(let k=1;k<=n;k++){
    const p=s.players[(i+k+n)%n];
    if(p.alive)return p.id;
  }
  return id;
}
function maybeReshuffle(s){
  if(s.deck.length<3){
    s.deck=shuffle(s.deck.concat(s.discard));
    s.discard=[];
    log(s,'Discarded supply was shuffled into a new deck.');
  }
}

function eligibleMedics(s){
  const alive=living(s), n=alive.length;
  return alive.filter(p=>{
    if(p.id===s.leader)return false;
    if(s.prevMedic!=null&&p.id===s.prevMedic)return false;
    if(n>5&&s.prevLeader!=null&&p.id===s.prevLeader)return false;
    return true;
  });
}

function passLeader(s){
  if(s.inSpecial){
    const ret=s.specialReturnTo;
    s.inSpecial=false;
    s.specialReturnTo=null;
    if(ret!=null) s.leader=nextLivingAfter(s,ret);
    else s.leader=nextLivingAfter(s,s.leader);
    return;
  }
  s.leader=nextLivingAfter(s,s.leader);
}

function startNominate(s){
  s.phase='nominate';
  s.medic=null;
  s.hand=[];
  s.votes={};
  s.power=null;
  s.pub=null;
  s.bloodResult=null;
  s.peekCards=null;
  s.vetoOffered=false;
}

function win(s,side,why){
  s.winner=side;
  s.winWhy=why;
  s.phase='win';
  s.hand=[];
  s.power=null;
  log(s,(side==='humans'?'Humans win. ':'The Infected win. ')+why);
}

function enactCard(s,card,grantPower){
  if(card==='cure'){
    s.cures++;
    log(s,'A Cure was administered ('+s.cures+'/5).');
    s.pub={kind:'cure',chaos:!grantPower};
    if(s.cures>=5){win(s,'humans','Five Cures were completed. The outpost is stable.');return;}
  }else{
    s.outbreaks++;
    log(s,'An Outbreak spread ('+s.outbreaks+'/6).');
    const pwr=grantPower?powerTrack(s.playerCount)[s.outbreaks-1]:null;
    s.pub={kind:'outbreak',chaos:!grantPower,pwr};
    if(s.outbreaks>=6){win(s,'infected','Six Outbreaks overwhelmed the outpost.');return;}
    if(pwr) s.power=pwr;
  }
  s.fails=0;
  s.phase='enact-pub';
}

function doChaos(s){
  maybeReshuffle(s);
  const c=s.deck.shift();
  log(s,'Three failed confirmations caused a panic. The top supply card was used automatically. Term limits were cleared.');
  s.prevLeader=null;
  s.prevMedic=null;
  s.fails=0;
  enactCard(s,c,false);
  maybeReshuffle(s);
}

function afterPublicContinue(s){
  if(s.winner)return;
  if(s.power){s.phase='power';return;}
  passLeader(s);
  startNominate(s);
}

function createGame(names){
  const arr=names.map(n=>String(n).trim()).filter(Boolean);
  if(arr.length<5||arr.length>10)throw new Error('Need 5 to 10 players');
  const seen=new Set();
  for(const n of arr){const k=n.toLowerCase();if(seen.has(k))throw new Error('Names must be unique');seen.add(k);}
  const n=arr.length,[h,inf]=ROLES[n];
  const roles=shuffle([...Array(h).fill('human'),...Array(inf).fill('infected'),'zero']);
  const s={
    playerCount:n,
    players:arr.map((name,i)=>({id:i,name,role:roles[i],alive:true,investigated:false})),
    cures:0,outbreaks:0,fails:0,
    deck:shuffle([...Array(6).fill('cure'),...Array(11).fill('outbreak')]),
    discard:[],
    leader:Math.floor(Math.random()*n),
    medic:null,prevLeader:null,prevMedic:null,
    inSpecial:false,specialReturnTo:null,
    votes:{},hand:[],
    phase:'night',
    ready:{},
    power:null,pub:null,winner:null,winWhy:'',
    bloodResult:null,peekCards:null,
    knownNotZero:[],
    vetoOffered:false,
    log:['The night shift begins. Roles were dealt in secret.']
  };
  return s;
}

function roleInfo(s,p){
  if(p.role==='human'){
    return {tag:'HUMAN',team:'human',body:'You are still uninfected. Finish five Cures, or quarantine Patient Zero. You do not know anyone else’s role.'};
  }
  if(p.role==='infected'){
    const allies=s.players.filter(x=>x.id!==p.id&&(x.role==='infected'||x.role==='zero'));
    const list=allies.map(x=>x.name+(x.role==='zero'?' — Patient Zero':' — Infected')).join('; ');
    return {tag:'INFECTED',team:'infected',body:'You already carry the outbreak. Your allies: '+list+'. Spread Outbreaks, protect Patient Zero, and try to get Patient Zero confirmed as Medic once three Outbreaks are on the board.'};
  }
  if(s.playerCount<=6){
    const allies=s.players.filter(x=>x.id!==p.id&&x.role==='infected');
    const list=allies.length?allies.map(x=>x.name).join(', '):'none in this count';
    return {tag:'PATIENT ZERO',team:'zero',body:'You are the source of the outbreak. In this smaller game you know the other Infected: '+list+'. Stay hidden. After three Outbreaks, if you are confirmed as Medic, your side wins. If you are quarantined, the Humans win.'};
  }
  return {tag:'PATIENT ZERO',team:'zero',body:'You are the source of the outbreak. In this larger game you do not know who else is Infected — they know you. Stay hidden. After three Outbreaks, if you are confirmed as Medic, your side wins. If you are quarantined, the Humans win.'};
}

function partyOf(p){return p.role==='human'?'Human':'Infected';}

function beginAfterNight(s){
  const need=living(s);
  if(need.every(p=>s.ready[p.id])) startNominate(s);
}

function applyCore(s,pid,action){
  if(!s||s.phase==='win')return {error:s&&s.phase==='win'?'Game is over':'No game'};
  const me=byId(s,pid);
  if(!me)return {error:'Unknown player'};
  const t=action&&action.type;
  if(t==='ready'){
    if(s.phase!=='night')return {error:'Not the briefing phase'};
    s.ready[pid]=true;
    beginAfterNight(s);
    return {};
  }
  if(!me.alive&&t!=='chat')return {error:'You are out of the game'};

  if(t==='nominate'){
    if(s.phase!=='nominate'||pid!==s.leader)return {error:'Only the Squad Leader can nominate'};
    const id=+action.medicId;
    if(!eligibleMedics(s).some(p=>p.id===id))return {error:'That player cannot be Medic'};
    s.medic=id;
    log(s,nm(s,s.leader)+' nominated '+nm(s,s.medic)+' as Medic.');
    s.votes={};
    s.phase='vote';
    return {};
  }
  if(t==='vote'){
    if(s.phase!=='vote')return {error:'No vote is open'};
    if(s.votes[pid]!==undefined)return {error:'Already voted'};
    s.votes[pid]=!!action.yes;
    const alive=living(s);
    if(alive.every(p=>s.votes[p.id]!==undefined)) resolveVotes(s);
    return {};
  }
  if(t==='bury'){
    if(s.phase!=='discard'||pid!==s.leader)return {error:'Only the Squad Leader can bury a card'};
    const i=+action.index;
    if(i<0||i>=s.hand.length)return {error:'Invalid card'};
    s.discard.push(s.hand.splice(i,1)[0]);
    s.phase='medic';
    s.vetoOffered=false;
    return {};
  }
  if(t==='enact'){
    if(s.phase!=='medic'||pid!==s.medic)return {error:'Only the Medic can put a card into effect'};
    const i=+action.index;
    if(i<0||i>=s.hand.length)return {error:'Invalid card'};
    const card=s.hand.splice(i,1)[0];
    s.discard.push(...s.hand);
    s.hand=[];
    enactCard(s,card,true);
    maybeReshuffle(s);
    return {};
  }
  if(t==='proposeVeto'){
    if(s.phase!=='medic'||pid!==s.medic)return {error:'Only the Medic can ask for a veto'};
    if(s.outbreaks<5)return {error:'Veto is not available yet'};
    if(s.vetoOffered)return {error:'A veto was already refused'};
    s.vetoOffered=true;
    s.phase='veto-leader';
    log(s,nm(s,s.medic)+' asked to veto this supply draw.');
    return {};
  }
  if(t==='vetoResponse'){
    if(s.phase!=='veto-leader'||pid!==s.leader)return {error:'Only the Squad Leader can answer a veto'};
    if(action.agree){
      s.discard.push(...s.hand);
      s.hand=[];
      s.fails++;
      log(s,nm(s,s.leader)+' agreed to the veto. The cards were buried. Failed confirmations: '+s.fails+'/3.');
      if(s.fails>=3){
        doChaos(s);
      }else{
        s.phase='enact-pub';
        s.pub={kind:'veto'};
      }
    }else{
      log(s,nm(s,s.leader)+' refused the veto. The Medic must put one card into effect.');
      s.phase='medic';
    }
    return {};
  }
  if(t==='powerTarget'){
    if(s.phase!=='power'||pid!==s.leader)return {error:'Only the Squad Leader can use this'};
    const tpid=+action.playerId;
    const p=byId(s,tpid);
    if(!p||!p.alive)return {error:'Invalid target'};
    if(s.power==='blood'){
      if(p.id===s.leader)return {error:'Choose someone else'};
      if(p.investigated)return {error:'That player has already had a blood test'};
      p.investigated=true;
      s.bloodResult={name:p.name,result:partyOf(p),id:p.id};
      log(s,nm(s,s.leader)+' ran a blood test on '+p.name+'.');
      s.phase='power-result';
      return {};
    }
    if(s.power==='special'){
      if(p.id===s.leader)return {error:'Choose someone else'};
      log(s,nm(s,s.leader)+' appointed '+p.name+' as the next Squad Leader. After that shift, leadership returns to the next person after '+nm(s,s.leader)+'.');
      s.specialReturnTo=s.leader;
      s.inSpecial=true;
      s.leader=p.id;
      s.power=null;
      startNominate(s);
      return {};
    }
    if(s.power==='quarantine'){
      if(p.id===s.leader)return {error:'Choose someone else'};
      p.alive=false;
      if(p.role==='zero'){
        log(s,p.name+' was quarantined and revealed as Patient Zero.');
        win(s,'humans',p.name+' — Patient Zero — was quarantined.');
        return {};
      }
      log(s,p.name+' was quarantined and is out of the game. Their type was not revealed.');
      s.pub={kind:'quarantine',name:p.name};
      s.power=null;
      s.phase='enact-pub';
      return {};
    }
    return {error:'No target needed'};
  }
  if(t==='peekDone'||t==='bloodDone'||t==='ack'){
    if(t==='peekDone'||(t==='ack'&&s.power==='peek')){
      if(s.phase!=='power'||s.power!=='peek'||pid!==s.leader)return {error:'Not a peek'};
      s.power=null;
      passLeader(s);
      startNominate(s);
      return {};
    }
    if(t==='bloodDone'||(t==='ack'&&s.phase==='power-result')){
      if(s.phase!=='power-result'||pid!==s.leader)return {error:'Not a blood test result'};
      s.bloodResult=null;
      s.power=null;
      passLeader(s);
      startNominate(s);
      return {};
    }
    if(t==='ack'&&s.phase==='enact-pub'){
      afterPublicContinue(s);
      return {};
    }
    return {error:'Nothing to acknowledge'};
  }
  if(t==='continue'){
    if(s.phase!=='enact-pub')return {error:'Nothing to continue'};
    afterPublicContinue(s);
    return {};
  }
  return {error:'Unknown action'};
}

function resolveVotes(s){
  const yes=living(s).filter(p=>s.votes[p.id]===true).length;
  const no=living(s).filter(p=>s.votes[p.id]===false).length;
  const passed=yes>no;
  log(s,passed?('The nomination was confirmed, '+yes+'–'+no+'.'):('The nomination was voted down, '+yes+'–'+no+'.'));
  s.pub={kind:'votes',yes,no,passed,votes:Object.assign({},s.votes)};
  if(passed){
    s.fails=0;
    s.prevLeader=s.leader;
    s.prevMedic=s.medic;
    const med=byId(s,s.medic);
    if(s.outbreaks>=3){
      if(med.role==='zero'){
        win(s,'infected','Patient Zero was confirmed as Medic after the outbreak had already taken hold.');
        return;
      }
      if(!s.knownNotZero.includes(s.medic)){
        s.knownNotZero.push(s.medic);
        log(s,nm(s,s.medic)+' is not Patient Zero.');
      }
    }
    maybeReshuffle(s);
    s.hand=[s.deck.shift(),s.deck.shift(),s.deck.shift()];
    s.phase='vote-results';
    s._afterVotes='discard';
  }else{
    s.fails++;
    s.phase='vote-results';
    if(s.fails>=3) s._afterVotes='chaos';
    else s._afterVotes='fail';
  }
}

function afterVoteResults(s){
  const n=s._afterVotes;
  s._afterVotes=null;
  if(n==='discard'){s.phase='discard';return;}
  if(n==='chaos'){doChaos(s);return;}
  passLeader(s);
  startNominate(s);
}

function applyActionWrapped(s,pid,action){
  if(action&&action.type==='continueVotes'){
    if(s.phase!=='vote-results')return {error:'No results to close'};
    afterVoteResults(s);
    return {};
  }
  return applyCore(s,pid,action);
}

function peekTop(s){
  maybeReshuffle(s);
  return s.deck.slice(0,3);
}

function publicState(s){
  return {
    playerCount:s.playerCount,
    track:powerTrack(s.playerCount),
    players:s.players.map(p=>({
      id:p.id,name:p.name,alive:p.alive,
      investigated:!!p.investigated,
      knownNotZero:s.knownNotZero.includes(p.id)
    })),
    cures:s.cures,outbreaks:s.outbreaks,fails:s.fails,
    deckCount:s.deck.length,discardCount:s.discard.length,
    leader:s.leader,medic:s.medic,
    prevLeader:s.prevLeader,prevMedic:s.prevMedic,
    inSpecial:!!s.inSpecial,
    phase:s.phase,power:s.power,
    winner:s.winner,winWhy:s.winWhy,
    pub:s.pub,log:s.log.slice(),
    vetoOn:s.outbreaks>=5,
    votes:s.phase==='vote'||s.phase==='vote-results'?Object.assign({},s.votes):null,
    ready:s.phase==='night'?Object.assign({},s.ready):null,
    roles:s.phase==='win'?s.players.map(p=>({id:p.id,role:p.role,alive:p.alive})):null
  };
}

function privateState(s,pid){
  const p=byId(s,pid);
  if(!p)return {};
  const out={you:p.id,role:p.role,info:roleInfo(s,p),alive:p.alive};
  if(p.role==='infected'|| (p.role==='zero'&&s.playerCount<=6)){
    out.allies=s.players.filter(x=>x.id!==p.id&&(x.role==='infected'||x.role==='zero'))
      .map(x=>({id:x.id,name:x.name,role:x.role}));
  }
  if(s.phase==='discard'&&pid===s.leader) out.hand=s.hand.slice();
  if((s.phase==='medic'||s.phase==='veto-leader')&&(pid===s.medic||pid===s.leader)) out.hand=s.hand.slice();
  if(s.phase==='power'&&s.power==='peek'&&pid===s.leader) out.peek=peekTop(s);
  if(s.phase==='power-result'&&pid===s.leader) out.blood=s.bloodResult;
  out.eligible=s.phase==='nominate'&&pid===s.leader?eligibleMedics(s).map(x=>x.id):null;
  out.canAct=canAct(s,pid);
  return out;
}

function canAct(s,pid){
  const p=byId(s,pid);
  if(!p||s.phase==='win')return false;
  if(s.phase==='night')return !s.ready[pid];
  if(!p.alive)return false;
  if(s.phase==='nominate')return pid===s.leader;
  if(s.phase==='vote')return s.votes[pid]===undefined;
  if(s.phase==='vote-results'||s.phase==='enact-pub')return true;
  if(s.phase==='discard'||s.phase==='power'||s.phase==='power-result'||s.phase==='veto-leader')return pid===s.leader;
  if(s.phase==='medic')return pid===s.medic;
  return false;
}

function legalTargets(s,pid){
  if(s.phase==='nominate'&&pid===s.leader)return eligibleMedics(s).map(p=>p.id);
  if(s.phase==='power'&&pid===s.leader){
    if(s.power==='blood')return living(s).filter(p=>p.id!==s.leader&&!p.investigated).map(p=>p.id);
    if(s.power==='special'||s.power==='quarantine')return living(s).filter(p=>p.id!==s.leader).map(p=>p.id);
  }
  return [];
}

function applyAction(s,pid,action){
  const r=applyActionWrapped(s,pid,action);
  if(r&&r.error&&action&&(action.type==='continueVotes'||action.type==='continue'||action.type==='ack'||action.type==='peekDone'||action.type==='bloodDone')&&/No results|Nothing to|Not a peek|Not a blood/.test(r.error))
    return {};
  return r;
}

const API={
  ROLES,powerTrack,powerLabel,createGame,applyAction,
  publicState,privateState,eligibleMedics,legalTargets,living,byId,roleInfo,
  maybeReshuffle,partyOf,peekTop,startNominate,passLeader
};
if(typeof module!=='undefined'&&module.exports) module.exports=API;
if(typeof window!=='undefined') window.PZEngine=API;
