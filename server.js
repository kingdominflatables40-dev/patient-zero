'use strict';
const http=require('http');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {WebSocketServer}=require('ws');
const eng=require('./engine');

const PORT=process.env.PORT||3000;
const PUBLIC=path.join(__dirname,'public');
const LETTERS='ABCDEFGHJKLMNPQRSTUVWXYZ';
const rooms=new Map();
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml'};

function sendFile(res,file){
  const p=path.normalize(path.join(PUBLIC,file));
  if(!p.startsWith(PUBLIC)){res.writeHead(403);return res.end('Forbidden');}
  const ext=path.extname(p);
  // engine.js is served from project root as well
  const tryPaths=[p, file==='engine.js'?path.join(__dirname,'engine.js'):null].filter(Boolean);
  const hit=tryPaths.find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());
  if(!hit){
    if(!ext||ext==='.html'){
      const idx=path.join(PUBLIC,'index.html');
      if(fs.existsSync(idx)){res.writeHead(200,{'Content-Type':MIME['.html'],'Cache-Control':'no-store'});return fs.createReadStream(idx).pipe(res);}
    }
    res.writeHead(404);return res.end('Not found');
  }
  res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Cache-Control':ext==='.html'||ext==='.js'?'no-store':'public, max-age=3600'});
  fs.createReadStream(hit).pipe(res);
}

const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/health'){res.writeHead(200,{'Content-Type':'text/plain'});return res.end('ok');}
  if(u.pathname==='/engine.js')return sendFile(res,'engine.js');
  sendFile(res,u.pathname==='/'?'index.html':u.pathname);
});

const wss=new WebSocketServer({server,path:'/ws'});

function code4(){
  let c='';
  for(let i=0;i<4;i++) c+=LETTERS[crypto.randomInt(LETTERS.length)];
  return c;
}
function freshCode(){
  let c,g=0;
  do{c=code4();g++;}while(rooms.has(c)&&g<50);
  return c;
}
function normName(n){return String(n||'').trim().slice(0,16);}
function keyName(n){return normName(n).toLowerCase();}

function send(ws,obj){
  if(ws&&ws.readyState===1) ws.send(JSON.stringify(obj));
}

function roomView(room){
  return {
    code:room.code,
    host:room.hostName,
    started:!!room.game,
    players:room.seats.map(p=>({name:p.name,connected:!!(p.ws&&p.ws.readyState===1)}))
  };
}

function broadcastLobby(room){
  const view=roomView(room);
  for(const p of room.seats) send(p.ws,{type:'lobby',lobby:view});
}

function pushGame(room){
  if(!room.game)return;
  const pub=eng.publicState(room.game);
  for(const p of room.seats){
    if(!p.ws||p.ws.readyState!==1)continue;
    const priv=p.id==null?{}:eng.privateState(room.game,p.id);
    send(p.ws,{type:'state',public:pub,private:priv,lobby:roomView(room)});
  }
}

function findRoom(code){return rooms.get(String(code||'').toUpperCase());}

function attach(ws,room,seat,created){
  if(seat.ws&&seat.ws!==ws&&seat.ws.readyState===1){
    send(seat.ws,{type:'replaced',message:'You signed in on another device.'});
    try{seat.ws.close();}catch(e){}
  }
  seat.ws=ws;
  ws._room=room.code;
  ws._name=seat.name;
  send(ws,{type:created?'created':'joined',code:room.code,you:seat.name,host:room.hostName,reconnected:!!room.game&&!created});
  if(room.game){
    const pub=eng.publicState(room.game);
    const priv=seat.id==null?{}:eng.privateState(room.game,seat.id);
    send(ws,{type:'state',public:pub,private:priv,lobby:roomView(room)});
    broadcastLobby(room);
    // tell others this seat is back
    for(const p of room.seats) if(p!==seat) send(p.ws,{type:'info',message:seat.name+' reconnected.'});
  }else{
    broadcastLobby(room);
  }
}

function handle(ws,msg){
  let data;
  try{data=JSON.parse(msg);}catch(e){return send(ws,{type:'error',message:'Bad message'});}
  const t=data.type;
  if(t==='create'){
    const name=normName(data.name);
    if(name.length<1)return send(ws,{type:'error',message:'Enter a name'});
    const code=freshCode();
    const room={code,hostName:name,seats:[{name,id:null,ws:null}],game:null,created:Date.now(),chat:[]};
    rooms.set(code,room);
    attach(ws,room,room.seats[0],true);
    return;
  }
  if(t==='join'){
    const name=normName(data.name);
    const room=findRoom(data.code);
    if(!name)return send(ws,{type:'error',message:'Enter a name'});
    if(!room)return send(ws,{type:'error',message:'No room with that code'});
    const k=keyName(name);
    let seat=room.seats.find(p=>keyName(p.name)===k);
    if(seat){
      attach(ws,room,seat,false);
      return;
    }
    if(room.game)return send(ws,{type:'error',message:'That game already started. Rejoin with the same name you used.'});
    if(room.seats.length>=10)return send(ws,{type:'error',message:'This room is full'});
    seat={name,id:null,ws:null};
    room.seats.push(seat);
    attach(ws,room,seat,false);
    return;
  }
  const room=ws._room&&findRoom(ws._room);
  if(!room)return send(ws,{type:'error',message:'Join or create a room first'});
  const seat=room.seats.find(p=>keyName(p.name)===keyName(ws._name));
  if(!seat)return send(ws,{type:'error',message:'You are not in this room'});

  if(t==='start'){
    if(keyName(seat.name)!==keyName(room.hostName)){
      const host=room.seats.find(p=>keyName(p.name)===keyName(room.hostName));
      const hostHere=host&&host.ws&&host.ws.readyState===1;
      if(hostHere)return send(ws,{type:'error',message:'Only the host can start'});
    }
    if(room.game)return send(ws,{type:'error',message:'Already started'});
    if(room.seats.length<5||room.seats.length>10)return send(ws,{type:'error',message:'Need 5 to 10 players to start'});
    try{
      room.game=eng.createGame(room.seats.map(p=>p.name));
      room.game.players.forEach(p=>{
        const st=room.seats.find(x=>keyName(x.name)===keyName(p.name));
        if(st) st.id=p.id;
      });
      pushGame(room);
    }catch(e){send(ws,{type:'error',message:e.message});}
    return;
  }
  if(t==='chat'){
    const text=String(data.text||'').trim().slice(0,200);
    if(!text)return;
    const line={name:seat.name,text,at:Date.now()};
    room.chat.push(line);
    if(room.chat.length>50)room.chat.shift();
    for(const p of room.seats) send(p.ws,{type:'chat',name:line.name,text:line.text});
    return;
  }
  if(t==='leave'){
    if(!room.game){
      room.seats=room.seats.filter(p=>p!==seat);
      if(!room.seats.length){rooms.delete(room.code);return;}
      if(keyName(room.hostName)===keyName(seat.name)) room.hostName=room.seats[0].name;
      broadcastLobby(room);
    }
    try{ws.close();}catch(e){}
    return;
  }
  if(process.env.PZ_TEST==='1'&&t==='__test'&&room.game){
    const g=room.game;
    if(data.op==='forceDeck') g.deck=data.cards.slice();
    if(data.op==='forceRoles') data.roles.forEach((role,i)=>{if(g.players[i])g.players[i].role=role});
    if(data.op==='setCounts'){if(data.cures!=null)g.cures=data.cures;if(data.outbreaks!=null)g.outbreaks=data.outbreaks}
    if(data.op==='setLeader') g.leader=data.id;
    if(data.op==='clearTerms'){g.prevLeader=null;g.prevMedic=null}
    if(data.op==='dump') return send(ws,{type:'dump',game:{phase:g.phase,leader:g.leader,medic:g.medic,cures:g.cures,outbreaks:g.outbreaks,fails:g.fails,winner:g.winner,winWhy:g.winWhy,inSpecial:g.inSpecial,specialReturnTo:g.specialReturnTo,prevLeader:g.prevLeader,prevMedic:g.prevMedic,hand:g.hand,deck:g.deck,players:g.players,power:g.power,knownNotZero:g.knownNotZero}});
    pushGame(room);
    return;
  }
  if(room.game){
    if(seat.id==null)return send(ws,{type:'error',message:'You are not in this game'});
    const r=eng.applyAction(room.game,seat.id,data);
    if(r.error)return send(ws,{type:'error',message:r.error});
    pushGame(room);
    return;
  }
  send(ws,{type:'error',message:'Unknown action'});
}

wss.on('connection',ws=>{
  ws.isAlive=true;
  ws.on('pong',()=>{ws.isAlive=true;});
  ws.on('message',m=>handle(ws,m.toString()));
  ws.on('close',()=>{
    const room=ws._room&&findRoom(ws._room);
    if(!room)return;
    const seat=room.seats.find(p=>p.ws===ws);
    if(seat) seat.ws=null;
    if(room.game) broadcastLobby(room);
    else if(seat){
      // stay in lobby briefly so a refresh can reconnect by name; prune if empty
      if(room.seats.every(p=>!p.ws||p.ws.readyState!==1)){
        // keep room 10 minutes for refresh
        room.idleAt=Date.now();
      }else broadcastLobby(room);
    }
  });
});

setInterval(()=>{
  wss.clients.forEach(ws=>{
    if(ws.isAlive===false)return ws.terminate();
    ws.isAlive=false;
    try{ws.ping();}catch(e){}
  });
  const now=Date.now();
  for(const [code,room] of rooms){
    const anyone=room.seats.some(p=>p.ws&&p.ws.readyState===1);
    if(!anyone){
      const age=now-(room.idleAt||room.created);
      const limit=room.game?3*60*60*1000:20*60*1000;
      if(age>limit) rooms.delete(code);
    }
  }
},25000);

server.listen(PORT,'0.0.0.0',()=>{
  console.log('Patient Zero listening on '+PORT);
});

module.exports={server,rooms,findRoom};
