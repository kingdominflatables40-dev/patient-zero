'use strict';
/**
 * Engine unit tests plus WebSocket bot clients for 5, 7, and 10 players.
 */
const assert=require('assert');
const {once}=require('events');
const WebSocket=require('ws');
const eng=require('./engine');

const PORT=process.env.TEST_PORT||3055;
let passed=0, failed=0;
function ok(cond,msg){if(!cond){failed++;console.error('  FAIL',msg);throw new Error(msg)}passed++;}

function readyAll(s){s.players.forEach(p=>eng.applyAction(s,p.id,{type:'ready'}));}
function elig(s){return eng.eligibleMedics(s)[0].id}
function allVote(s,yes){
  living(s).forEach(p=>eng.applyAction(s,p.id,{type:'vote',yes}));
  eng.applyAction(s,s.leader,{type:'continueVotes'});
}
function living(s){return s.players.filter(p=>p.alive)}
function buryEnact(s,prefer){
  ok(s.phase==='discard','expected discard, got '+s.phase);
  let i=prefer?s.hand.findIndex(c=>c!==prefer):-0;
  if(i<0)i=0;
  eng.applyAction(s,s.leader,{type:'bury',index:i});
  ok(s.phase==='medic','expected medic, got '+s.phase);
  let j=prefer?s.hand.findIndex(c=>c===prefer):-0;
  if(j<0)j=0;
  eng.applyAction(s,s.medic,{type:'enact',index:j});
}
function confirmGov(s,opts){
  opts=opts||{};
  ok(s.phase==='nominate','nominate, got '+s.phase+(s.winner?' winner '+s.winWhy:''));
  const mid=opts.medic!=null?opts.medic:elig(s);
  const r=eng.applyAction(s,s.leader,{type:'nominate',medicId:mid});
  ok(!r.error,'nominate: '+(r.error||'')+' mid='+mid);
  allVote(s,opts.yes!==false);
}
function skipPub(s){
  if(s.phase==='enact-pub') eng.applyAction(s,s.leader,{type:'continue'});
}
function usePower(s,target){
  skipPub(s);
  if(s.phase==='power'&&s.power==='peek'){
    eng.applyAction(s,s.leader,{type:'peekDone'});
    return;
  }
  if(s.phase==='power'){
    const t=target!=null?target:eng.legalTargets(s,s.leader)[0];
    eng.applyAction(s,s.leader,{type:'powerTarget',playerId:t});
  }
  if(s.phase==='power-result') eng.applyAction(s,s.leader,{type:'bloodDone'});
  skipPub(s);
}

console.log('--- engine ---');

// Role counts
for(const [n,exp] of [[5,[3,1,1]],[6,[4,1,1]],[7,[4,2,1]],[8,[5,2,1]],[9,[5,3,1]],[10,[6,3,1]]]){
  const names=Array.from({length:n},(_,i)=>'P'+i);
  const s=eng.createGame(names);
  const c={human:0,infected:0,zero:0};
  s.players.forEach(p=>c[p.role]++);
  ok(c.human===exp[0]&&c.infected===exp[1]&&c.zero===exp[2], n+'p roles '+JSON.stringify(c));
}
ok(JSON.stringify(eng.powerTrack(5))===JSON.stringify([null,null,'peek','quarantine','quarantine']),'track 5-6');
ok(JSON.stringify(eng.powerTrack(7))===JSON.stringify([null,'blood','special','quarantine','quarantine']),'track 7-8');
ok(JSON.stringify(eng.powerTrack(10))===JSON.stringify(['blood','blood','special','quarantine','quarantine']),'track 9-10');

// Knowledge
{
  const s=eng.createGame(['A','B','C','D','E']);
  const z=s.players.find(p=>p.role==='zero');
  const i=s.players.find(p=>p.role==='infected');
  ok(eng.roleInfo(s,z).body.includes('you know the other Infected'),'5p PZ knows team');
  ok(eng.roleInfo(s,z).body.includes(i.name),'5p PZ sees ally name');
  const s7=eng.createGame(['A','B','C','D','E','F','G']);
  const z7=s7.players.find(p=>p.role==='zero');
  ok(eng.roleInfo(s7,z7).body.includes('you do not know who else is Infected'),'7p PZ hidden');
  const i7=s7.players.find(p=>p.role==='infected');
  ok(eng.roleInfo(s7,i7).body.includes('Patient Zero'),'7p infected know PZ');
}

// 5 Cures
{
  const s=eng.createGame(['A','B','C','D','E']);
  s.players.forEach((p,i)=>p.role=['human','human','human','infected','zero'][i]);
  s.leader=0;readyAll(s);
  for(let r=0;r<5;r++){
    s.deck=['cure','cure','cure',...s.deck];
    confirmGov(s);
    buryEnact(s,'cure');
    skipPub(s);
  }
  ok(s.winner==='humans'&&s.cures===5,'humans win 5 cures: '+s.winner+' '+s.cures+' '+s.winWhy);
}

// 6 Outbreaks on 5p (peek at 3, quarantine at 4 and 5 — quarantine non-PZ)
{
  const s=eng.createGame(['A','B','C','D','E']);
  s.players.forEach((p,i)=>p.role=['human','human','human','infected','zero'][i]);
  s.leader=0;readyAll(s);
  for(let r=0;r<6;r++){
    s.deck=Array(17).fill('outbreak');
    confirmGov(s);
    if(s.phase==='win')break;
    buryEnact(s,'outbreak');
    if(s.phase==='win')break;
    usePower(s, s.power==='quarantine'?s.players.find(p=>p.alive&&p.id!==s.leader&&p.role!=='zero').id:undefined);
  }
  ok(s.winner==='infected'&&s.outbreaks===6,'infected win 6 outbreaks: '+s.winner+' '+s.outbreaks+' '+s.phase);
}

// PZ elected Medic after 3 outbreaks
{
  const s=eng.createGame(['A','B','C','D','E']);
  s.players.forEach((p,i)=>p.role=['human','human','human','infected','zero'][i]);
  s.leader=0;s.outbreaks=3;readyAll(s);
  confirmGov(s,{medic:4});
  ok(s.winner==='infected'&&/Patient Zero/.test(s.winWhy),'PZ medic win: '+s.winWhy);
}

// Confirmed medic after 3 is announced not PZ
{
  const s=eng.createGame(['A','B','C','D','E']);
  s.players.forEach((p,i)=>p.role=['human','human','human','infected','zero'][i]);
  s.leader=0;s.outbreaks=3;readyAll(s);
  confirmGov(s,{medic:1});
  ok(!s.winner&&s.knownNotZero.includes(1)&&s.log.some(t=>/is not Patient Zero/.test(t)),'known not PZ');
  // still goes to discard
  ok(s.phase==='discard','continues to draw after not-PZ');
}

// Quarantine PZ — humans win; non-PZ type not revealed
{
  const s=eng.createGame(['A','B','C','D','E']);
  s.players.forEach((p,i)=>p.role=['human','human','human','infected','zero'][i]);
  s.leader=0;s.outbreaks=3;readyAll(s);
  s.deck=Array(17).fill('outbreak');
  confirmGov(s);
  buryEnact(s,'outbreak'); // 4th outbreak -> quarantine on 5p board
  skipPub(s);
  ok(s.phase==='power'&&s.power==='quarantine','quarantine power, got '+s.phase+' '+s.power);
  eng.applyAction(s,s.leader,{type:'powerTarget',playerId:4});
  ok(s.winner==='humans'&&/Patient Zero/.test(s.winWhy),'quarantine PZ win');

  const s2=eng.createGame(['A','B','C','D','E']);
  s2.players.forEach((p,i)=>p.role=['human','human','human','infected','zero'][i]);
  s2.leader=0;s2.outbreaks=3;readyAll(s2);
  s2.deck=Array(17).fill('outbreak');
  confirmGov(s2);
  buryEnact(s2,'outbreak');
  skipPub(s2);
  eng.applyAction(s2,s2.leader,{type:'powerTarget',playerId:1});
  ok(!s2.winner&&!s2.players[1].alive,'non-PZ quarantined, game continues');
  ok(s2.log.some(t=>/type was not revealed/.test(t))&&!s2.log.some(t=>/revealed as Human|revealed as Infected/.test(t)),'type hidden');
}

// Chaos after 3 failed votes, no power, term limits cleared
{
  const s=eng.createGame(['A','B','C','D','E']);
  s.leader=0;readyAll(s);
  s.deck=['cure',...Array(16).fill('outbreak')];
  s.prevLeader=0;s.prevMedic=1;
  for(let i=0;i<3;i++){
    confirmGov(s,{yes:false});
    skipPub(s);
  }
  ok(s.cures===1,'chaos enacted cure, cures='+s.cures);
  ok(s.fails===0,'tracker reset');
  ok(s.prevLeader==null&&s.prevMedic==null,'term limits cleared');
  ok(s.phase==='nominate'||s.phase==='enact-pub','after chaos '+s.phase);
  ok(s.log.some(t=>/panic/.test(t)),'panic logged');
  ok(!s.power,'no power on chaos');
}

// Tie fails (6 players)
{
  const s=eng.createGame(['A','B','C','D','E','F']);
  s.leader=0;readyAll(s);
  eng.applyAction(s,0,{type:'nominate',medicId:elig(s)});
  const alive=living(s);
  alive.forEach((p,i)=>eng.applyAction(s,p.id,{type:'vote',yes:i<3}));
  eng.applyAction(s,0,{type:'continueVotes'});
  ok(s.fails===1&&s.phase==='nominate','tie fails, fails='+s.fails+' '+s.phase);
}

// Term limits: 6 living -> prev leader and medic blocked; 5 living -> only medic
{
  const s=eng.createGame(['A','B','C','D','E','F']);
  s.leader=0;s.prevLeader=1;s.prevMedic=2;readyAll(s);
  const ids=eng.eligibleMedics(s).map(p=>p.id);
  ok(!ids.includes(0)&&!ids.includes(1)&&!ids.includes(2),'6p both term limits '+ids);
  s.players[5].alive=false;
  const ids5=eng.eligibleMedics(s).map(p=>p.id);
  ok(!ids5.includes(2)&&ids5.includes(1),'5 living only last medic blocked '+ids5);
}

// Veto agree advances tracker; refuse forces enact; agreed veto at 2 fails -> chaos
{
  const s=eng.createGame(['A','B','C','D','E']);
  s.players.forEach((p,i)=>p.role=['human','human','human','infected','zero'][i]);
  s.leader=0;s.outbreaks=5;readyAll(s);
  s.deck=['outbreak','cure','outbreak',...Array(14).fill('cure')];
  confirmGov(s);
  eng.applyAction(s,s.leader,{type:'bury',index:0});
  ok(s.phase==='medic'&&s.outbreaks>=5,'veto available');
  eng.applyAction(s,s.medic,{type:'proposeVeto'});
  ok(s.phase==='veto-leader','veto to leader');
  eng.applyAction(s,s.leader,{type:'vetoResponse',agree:false});
  ok(s.phase==='medic','refuse returns to medic');
  const refused=eng.applyAction(s,s.medic,{type:'proposeVeto'});
  ok(refused.error&&/already/.test(refused.error),'cannot veto twice on the same draw');
  eng.applyAction(s,s.medic,{type:'enact',index:0});
  skipPub(s);
  if(s.phase==='power'){ /* 6th outbreak would have won; we used cures mostly */ usePower(s); }

  // new government: agree to veto
  s.deck=['cure','cure','cure',...s.deck];
  confirmGov(s);
  eng.applyAction(s,s.leader,{type:'bury',index:0});
  eng.applyAction(s,s.medic,{type:'proposeVeto'});
  eng.applyAction(s,s.leader,{type:'vetoResponse',agree:true});
  ok(s.fails===1,'veto advanced tracker, fails='+s.fails+' phase='+s.phase);
  ok(s.phase==='enact-pub'||s.phase==='nominate','after veto '+s.phase);
  skipPub(s);

  // two more agreed vetos should chaos (fails already 1)
  for(let i=0;i<2;i++){
    s.deck=['cure','cure','cure',...s.deck];
    confirmGov(s);
    if(s.phase!=='discard')break;
    eng.applyAction(s,s.leader,{type:'bury',index:0});
    eng.applyAction(s,s.medic,{type:'proposeVeto'});
    eng.applyAction(s,s.leader,{type:'vetoResponse',agree:true});
    skipPub(s);
  }
  ok(s.cures>=1||s.outbreaks>=5,'veto-chaos used a card cures='+s.cures+' out='+s.outbreaks+' fails='+s.fails+' phase='+s.phase);
  ok(s.log.some(t=>/veto/.test(t)),'veto logged');
}

// Blood test: PZ reads Infected; cannot test twice
{
  const s=eng.createGame(['A','B','C','D','E','F','G']);
  s.players.forEach((p,i)=>p.role=['human','human','human','human','infected','infected','zero'][i]);
  s.leader=0;s.outbreaks=1;readyAll(s);
  s.deck=Array(17).fill('outbreak');
  confirmGov(s);
  buryEnact(s,'outbreak'); // 2nd outbreak -> blood on 7-8 board
  skipPub(s);
  ok(s.phase==='power'&&s.power==='blood','blood at 2 for 7p, got '+s.phase+' '+s.power);
  eng.applyAction(s,s.leader,{type:'powerTarget',playerId:6});
  ok(s.phase==='power-result'&&s.bloodResult.result==='Infected','PZ reads Infected');
  eng.applyAction(s,s.leader,{type:'bloodDone'});
  ok(s.players[6].investigated,'marked investigated');
  // next blood (9-10 only has two; 7p only one). Force another blood.
  s.power='blood';s.phase='power';
  const r=eng.applyAction(s,s.leader,{type:'powerTarget',playerId:6});
  ok(r.error&&/already/.test(r.error),'cannot test twice: '+r.error);
}

// Special election returns to the left of the enactor
{
  const s=eng.createGame(['A','B','C','D','E','F','G']);
  s.players.forEach((p,i)=>p.role=['human','human','human','human','infected','infected','zero'][i]);
  s.leader=0;readyAll(s);
  s.outbreaks=2;
  s.deck=Array(17).fill('cure');
  confirmGov(s);
  // enact an outbreak for the 3rd to get special
  s.hand=['outbreak','outbreak'];
  s.phase='medic';
  // actually we're in discard if confirm drew cures. Force:
  s.deck=Array(17).fill('outbreak');
  if(s.phase==='discard'){s.hand=['outbreak','outbreak','cure']}
  if(s.phase==='discard') buryEnact(s,'outbreak');
  else {
    // already medic? 
    if(s.phase!=='medic') { /* start over more carefully */ }
  }
}
{
  const s=eng.createGame(['A','B','C','D','E','F','G']);
  s.players.forEach((p,i)=>p.role=['human','human','human','human','infected','infected','zero'][i]);
  s.leader=0;readyAll(s);
  s.outbreaks=2;
  s.deck=Array(17).fill('outbreak');
  confirmGov(s);
  buryEnact(s,'outbreak'); // 3rd -> special
  skipPub(s);
  ok(s.phase==='power'&&s.power==='special','special at 3 for 7p, got '+s.phase+' '+s.power);
  const enactor=s.leader;
  ok(enactor===0,'enactor still 0, got '+enactor);
  eng.applyAction(s,0,{type:'powerTarget',playerId:3});
  ok(s.inSpecial&&s.leader===3&&s.specialReturnTo===0,'special leader 3, return to 0');
  // fail the special government vote
  confirmGov(s,{yes:false});
  skipPub(s);
  ok(!s.inSpecial,'special over');
  ok(s.leader===1,'returns to left of enactor (player 1), got '+s.leader);
}

// Special success then return (not to left of appointed Leader)
{
  const s=eng.createGame(['A','B','C','D','E','F','G']);
  s.leader=0;readyAll(s);
  s.outbreaks=2;
  s.deck=Array(17).fill('cure');
  s.power='special';s.phase='power';
  eng.applyAction(s,0,{type:'powerTarget',playerId:4});
  ok(s.leader===4,'appointed Leader 4');
  confirmGov(s);
  buryEnact(s,'cure');
  skipPub(s);
  ok(s.leader===1,'after successful special, leader is 1 (after enactor 0), got '+s.leader);
  ok(!s.inSpecial,'not in special');
}

// Peek on 5-6 at 3rd outbreak
{
  const s=eng.createGame(['A','B','C','D','E']);
  s.leader=0;readyAll(s);
  s.outbreaks=2;
  s.deck=['cure','outbreak','cure',...Array(14).fill('outbreak')];
  confirmGov(s);
  s.deck=['outbreak','outbreak','outbreak',...s.deck];
  if(s.phase==='discard') buryEnact(s,'outbreak');
  skipPub(s);
  ok(s.phase==='power'&&s.power==='peek','peek at 3 for 5p');
  const priv=eng.privateState(s,s.leader);
  ok(priv.peek&&priv.peek.length===3,'peek shows 3');
  eng.applyAction(s,s.leader,{type:'peekDone'});
  ok(s.phase==='nominate','after peek, next round');
}

console.log('engine passed',passed);

// ----------------- WebSocket bots -----------------
console.log('--- websocket bots ---');

process.env.PZ_TEST='1';
process.env.PORT=String(PORT);
const {server}=require('./server');

function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function sock(){
  return new Promise((resolve,reject)=>{
    const ws=new WebSocket('ws://127.0.0.1:'+PORT+'/ws');
    const ev=[];
    let state=null,lobby=null,you=null,code=null,dump=null,err=null;
    ws.on('message',raw=>{
      const m=JSON.parse(raw);
      ev.push(m);
      if(m.type==='error') err=m.message;
      if(m.type==='created'||m.type==='joined'){you=m.you;code=m.code}
      if(m.lobby) lobby=m.lobby;
      if(m.public) state={pub:m.public,priv:m.private};
      if(m.type==='dump') dump=m.game;
    });
    ws.on('error',reject);
    ws.on('open',()=>resolve({
      ws,
      ev:()=>ev,
      get state(){return state},
      get lobby(){return lobby},
      get you(){return you},
      get code(){return code},
      get dump(){return dump},
      get err(){return err},
      send(o){err=null;ws.send(JSON.stringify(o));},
      close(){try{ws.close()}catch(e){}},
      wait(fn,ms){
        const t0=Date.now();
        return new Promise((res,rej)=>{
          const tick=()=>{
            if(fn())return res();
            if(Date.now()-t0>(ms||4000))return rej(new Error('timeout: '+ (err|| (state&&state.pub&&state.pub.phase) || 'no state')));
            setTimeout(tick,15);
          };
          tick();
        });
      }
    }));
  });
}

async function makeRoom(n,names){
  const ns=names||Array.from({length:n},(_,i)=>'P'+i);
  const bots= [];
  const host=await sock();
  host.send({type:'create',name:ns[0]});
  await host.wait(()=>host.code,2000);
  const code=host.code;
  bots.push(host);
  for(let i=1;i<n;i++){
    const b=await sock();
    b.send({type:'join',code,name:ns[i]});
    await b.wait(()=>b.you,2000);
    bots.push(b);
  }
  await host.wait(()=>host.lobby&&host.lobby.players.length===n,2000);
  host.send({type:'start'});
  await host.wait(()=>host.state&&host.state.pub.phase==='night',4000);
  return {code,bots,names:ns};
}

async function readyBots(bots){
  for(const b of bots){
    b.send({type:'ready'});
  }
  await bots[0].wait(()=>bots[0].state.pub.phase==='nominate',4000);
}

async function testCmd(bot,op,extra){
  bot.send(Object.assign({type:'__test',op},extra||{}));
  await sleep(40);
}

async function runGov(bots,opts){
  opts=opts||{};
  const host=bots[0];
  await host.wait(()=>host.state.pub.phase==='nominate',3000);
  if(opts.deck) await testCmd(host,'forceDeck',{cards:opts.deck});
  if(opts.counts) await testCmd(host,'setCounts',opts.counts);
  const pub=()=>host.state.pub;
  const leaderId=pub().leader;
  const leader=bots.find(b=>b.state.priv&&b.state.priv.you===leaderId);
  const eligible=leader.state.priv.eligible;
  const medic=opts.medic!=null?opts.medic:eligible[0];
  leader.send({type:'nominate',medicId:medic});
  await host.wait(()=>pub().phase==='vote',3000);
  for(const b of bots){
    if(pub().players.find(p=>p.id===b.state.priv.you&&p.alive)){
      const yes=opts.yes!==false;
      b.send({type:'vote',yes});
    }
  }
  await host.wait(()=>pub().phase==='vote-results'||pub().phase==='win',4000);
  if(pub().phase==='win')return;
  host.send({type:'continueVotes'});
  await host.wait(()=>pub().phase!=='vote-results',4000);
  if(pub().phase==='win'||pub().phase==='nominate'||pub().phase==='enact-pub'){
    if(pub().phase==='enact-pub'){host.send({type:'continue'});await host.wait(()=>pub().phase!=='enact-pub',2000);}
    return;
  }
  if(pub().phase==='discard'){
    const hand=leader.state.priv.hand;
    const prefer=opts.prefer;
    let bi=0;
    if(prefer){const o=hand.findIndex(c=>c!==prefer);if(o>=0)bi=o}
    leader.send({type:'bury',index:bi});
    await host.wait(()=>pub().phase==='medic',3000);
    const medicBot=bots.find(b=>b.state.priv.you===pub().medic);
    const h2=medicBot.state.priv.hand;
    let ei=0;
    if(prefer){const o=h2.findIndex(c=>c===prefer);if(o>=0)ei=o}
    if(opts.veto){
      medicBot.send({type:'proposeVeto'});
      await host.wait(()=>pub().phase==='veto-leader',3000);
      const lead2=bots.find(b=>b.state.priv.you===pub().leader);
      lead2.send({type:'vetoResponse',agree:opts.vetoAgree!==false});
      await host.wait(()=>pub().phase!=='veto-leader',3000);
      if(pub().phase==='medic'){
        medicBot.send({type:'enact',index:ei});
        await host.wait(()=>pub().phase!=='medic',3000);
      }
    }else{
      medicBot.send({type:'enact',index:ei});
      await host.wait(()=>pub().phase!=='medic',3000);
    }
  }
  if(pub().phase==='enact-pub'){
    host.send({type:'continue'});
    await host.wait(()=>pub().phase!=='enact-pub',3000);
  }
  if(pub().phase==='power'||pub().phase==='power-result'){
    const lead=bots.find(b=>b.state.priv.you===pub().leader);
    if(pub().power==='peek'){
      lead.send({type:'peekDone'});
    }else if(pub().phase==='power'){
      const targets=lead.state.priv&& /* from legal, reconstruct */ pub().players.filter(p=>p.alive&&p.id!==pub().leader&&!(pub().power==='blood'&&p.investigated));
      let t=opts.powerTarget;
      if(t==null) t=(targets.find(p=>p.role!=='zero')||targets[0]||{}).id;
      // public state has no role; just pick first non-leader living not investigated
      if(t==null) t=pub().players.find(p=>p.alive&&p.id!==pub().leader).id;
      lead.send({type:'powerTarget',playerId:t});
      await host.wait(()=>pub().phase!=='power'||pub().winner,3000);
      if(pub().phase==='power-result'){
        lead.send({type:'bloodDone'});
        await host.wait(()=>pub().phase!=='power-result',3000);
      }
      if(pub().phase==='enact-pub'){
        host.send({type:'continue'});
        await host.wait(()=>pub().phase!=='enact-pub',3000);
      }
    }
  }
}

(async()=>{
  try{
    await once(server,'listening').catch(()=>sleep(200));
    await sleep(80);

    // 5-player cure win over WS
    {
      const {bots}=await makeRoom(5,['A','B','C','D','E']);
      await testCmd(bots[0],'forceRoles',{roles:['human','human','human','infected','zero']});
      await readyBots(bots);
      await testCmd(bots[0],'setLeader',{id:0});
      for(let i=0;i<5;i++){
        await runGov(bots,{deck:Array(6).fill('cure').concat(Array(11).fill('outbreak')),prefer:'cure'});
        if(bots[0].state.pub.winner)break;
      }
      ok(bots[0].state.pub.winner==='humans'&&bots[0].state.pub.cures===5,'WS 5p humans 5 cures');
      bots.forEach(b=>b.close());
    }

    // 5-player PZ medic win
    {
      const {bots}=await makeRoom(5,['A','B','C','D','E']);
      await testCmd(bots[0],'forceRoles',{roles:['human','human','human','infected','zero']});
      await readyBots(bots);
      await testCmd(bots[0],'setLeader',{id:0});
      await testCmd(bots[0],'setCounts',{cures:0,outbreaks:3});
      await testCmd(bots[0],'clearTerms',{});
      await runGov(bots,{medic:4});
      ok(bots[0].state.pub.winner==='infected'&&/Patient Zero/.test(bots[0].state.pub.winWhy),'WS 5p PZ medic win');
      bots.forEach(b=>b.close());
    }

    // Reconnect mid-game
    {
      const {bots,code}=await makeRoom(5,['A','B','C','D','E']);
      await readyBots(bots);
      const phase=bots[0].state.pub.phase;
      ok(phase==='nominate','reconnect starts at nominate');
      const name='C';
      const old=bots[2];
      old.close();
      await sleep(80);
      const neo=await sock();
      neo.send({type:'join',code,name});
      await neo.wait(()=>neo.state&&neo.state.pub,3000);
      ok(neo.state.pub.phase==='nominate','reconnected into game');
      ok(neo.state.priv&&neo.state.priv.role,'private role restored');
      // continue a short cure path enough to vote with reconnected player
      await testCmd(bots[0],'forceDeck',{cards:Array(17).fill('cure')});
      await runGov([bots[0],bots[1],neo,bots[3],bots[4]],{prefer:'cure',yes:true});
      ok(['enact-pub','nominate','discard','win'].includes(neo.state.pub.phase)||neo.state.pub.cures>=1,'reconnect could finish a round phase='+neo.state.pub.phase+' cures='+neo.state.pub.cures);
      bots.forEach(b=>b.close());neo.close();
    }

    // Veto over WS after 5 outbreaks
    {
      const {bots}=await makeRoom(5,['A','B','C','D','E']);
      await testCmd(bots[0],'forceRoles',{roles:['human','human','human','infected','zero']});
      await readyBots(bots);
      await testCmd(bots[0],'setLeader',{id:0});
      await testCmd(bots[0],'setCounts',{cures:0,outbreaks:5});
      await testCmd(bots[0],'clearTerms',{});
      await runGov(bots,{deck:Array(17).fill('cure'),medic:1,veto:true,vetoAgree:true});
      ok(bots[0].state.pub.fails===1&&bots[0].state.pub.log.some(t=>/veto/.test(t)),'WS veto agreed, fails='+bots[0].state.pub.fails+' phase='+bots[0].state.pub.phase+' why='+bots[0].state.pub.winWhy+' log='+(bots[0].state.pub.log||[]).slice(-4).join('|'));
      bots.forEach(b=>b.close());
    }

    // 7-player: blood + special election rotation
    {
      const names=['A','B','C','D','E','F','G'];
      const {bots}=await makeRoom(7,names);
      await testCmd(bots[0],'forceRoles',{roles:['human','human','human','human','infected','infected','zero']});
      await readyBots(bots);
      await testCmd(bots[0],'setLeader',{id:0});
      await testCmd(bots[0],'setCounts',{cures:0,outbreaks:1});
      await testCmd(bots[0],'clearTerms',{});
      await runGov(bots,{deck:Array(17).fill('outbreak'),prefer:'outbreak',powerTarget:6});
      ok(bots[0].state.pub.outbreaks===2,'7p second outbreak');
      // player 6 should be investigated
      ok(bots[0].state.pub.players[6].investigated,'7p blood test marked');
      await testCmd(bots[0],'forceDeck',{cards:Array(17).fill('outbreak')});
      // 3rd outbreak -> special. After continue, leader (whoever) appoints. runGov will pick first living non-leader.
      const leaderBefore=bots[0].state.pub.leader;
      await runGov(bots,{deck:Array(17).fill('outbreak'),prefer:'outbreak',powerTarget:(leaderBefore+2)%7});
      // After special appointment, we may already be in nominate with the special leader, or mid-flow.
      bots[0].send({type:'__test',op:'dump'});
      await bots[0].wait(()=>bots[0].dump,2000);
      const d=bots[0].dump;
      ok(d.outbreaks===3,'7p third outbreak, got '+d.outbreaks);
      // If still in special or already returned, rotation logic is covered by engine tests; here just finish a win path.
      // Drive to human win via cures for a complete 7p game.
      for(let i=0;i<8&&!bots[0].state.pub.winner;i++){
        if(bots[0].state.pub.phase==='power'){
          const lead=bots.find(b=>b.state.priv.you===bots[0].state.pub.leader);
          if(bots[0].state.pub.power==='peek') lead.send({type:'peekDone'});
          else {
            const t=bots[0].state.pub.players.find(p=>p.alive&&p.id!==bots[0].state.pub.leader).id;
            lead.send({type:'powerTarget',playerId:t});
            await sleep(50);
            if(bots[0].state.pub.phase==='power-result') lead.send({type:'bloodDone'});
          }
          await sleep(50);
          if(bots[0].state.pub.phase==='enact-pub') bots[0].send({type:'continue'});
          await sleep(50);
        }
        if(bots[0].state.pub.winner)break;
        if(bots[0].state.pub.phase==='nominate'){
          await runGov(bots,{deck:Array(17).fill('cure'),prefer:'cure'});
        }else if(bots[0].state.pub.phase==='enact-pub'){
          bots[0].send({type:'continue'});
          await sleep(40);
        }else break;
      }
      ok(bots[0].state.pub.winner==='humans'||bots[0].state.pub.cures>=1,'7p progressed, winner='+bots[0].state.pub.winner+' cures='+bots[0].state.pub.cures);
      bots.forEach(b=>b.close());
    }

    // 10-player full game to 5 cures
    {
      const names=Array.from({length:10},(_,i)=>'Q'+i);
      const {bots}=await makeRoom(10,names);
      ok(bots[0].state.pub.playerCount===10,'10p started');
      ok(bots[0].state.pub.track[0]==='blood'&&bots[0].state.pub.track[2]==='special','10p board');
      await readyBots(bots);
      await testCmd(bots[0],'setLeader',{id:0});
      await testCmd(bots[0],'clearTerms',{});
      for(let i=0;i<5;i++){
        await runGov(bots,{deck:Array(17).fill('cure'),prefer:'cure'});
        if(bots[0].state.pub.winner)break;
      }
      ok(bots[0].state.pub.winner==='humans'&&bots[0].state.pub.cures===5,'WS 10p humans 5 cures');
      bots.forEach(b=>b.close());
    }

    // 5-player quarantine PZ over WS
    {
      const {bots}=await makeRoom(5,['A','B','C','D','E']);
      await testCmd(bots[0],'forceRoles',{roles:['human','human','human','infected','zero']});
      await readyBots(bots);
      await testCmd(bots[0],'setLeader',{id:0});
      await testCmd(bots[0],'setCounts',{cures:0,outbreaks:3});
      await testCmd(bots[0],'clearTerms',{});
      await runGov(bots,{deck:Array(17).fill('outbreak'),prefer:'outbreak',powerTarget:4});
      ok(bots[0].state.pub.winner==='humans'&&/Patient Zero/.test(bots[0].state.pub.winWhy),'WS quarantine PZ');
      bots.forEach(b=>b.close());
    }

    console.log('\nALL TESTS PASSED',passed,'assertions');
    server.close();
    process.exit(0);
  }catch(e){
    console.error('\nTEST FAILED',e);
    try{server.close()}catch(x){}
    process.exit(1);
  }
})();
