"use strict";
window.onerror=(m,s,l)=>{document.body.insertAdjacentHTML('beforeend','<pre style="position:fixed;z-index:9;top:60px;left:10px;right:10px;background:#900;color:#fff;padding:10px;white-space:pre-wrap;font-size:13px">Error: '+m+' (line '+l+')</pre>')};
const T=THREE,$=q=>document.querySelector(q);
const ORDER=['assemble','fuel','board','count','launch','space','landing'];
const BADGE=['Rocket Explorer','Fuel Engineer','Astronaut Trainer','Mission Controller','Rocket Pilot','Space Navigator','Moon Landing Expert','Rover Explorer','Mars Commander'];
let save={xp:0,stars:0,badges:[],n:0};
try{Object.assign(save,JSON.parse(localStorage.getItem('astro-launch')||'{}'))}catch(e){}
const persist=()=>{try{localStorage.setItem('astro-launch',JSON.stringify(save))}catch(e){}};
const R=new T.WebGLRenderer({antialias:true});R.setPixelRatio(Math.min(devicePixelRatio,2));R.shadowMap.enabled=true;document.body.prepend(R.domElement);
let shake=0,sc,cam,loop=()=>{},H={},K={},paused=0,cur='home',hint='',clock=new T.Clock(),timers=[];
const size=()=>{R.setSize(innerWidth,innerHeight);if(cam){cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}};addEventListener('resize',size);
addEventListener('keydown',e=>{K[e.code]=1;if(e.code=='Space'||e.code.startsWith('Arrow'))e.preventDefault()});addEventListener('keyup',e=>K[e.code]=0);
const k=(...c)=>c.some(x=>K[x]);
const say=t=>$('#say').textContent=t;
const hud=h=>$('#hud').innerHTML=h;
const bar=(l,v,mx,lo=0,hi=mx)=>`<div class="g"><span>${l}</span><em>${Math.round(v)}</em><i><b class="${v>=lo&&v<=hi?'ok':''}" style="width:${Math.max(0,Math.min(100,v/mx*100))}%"></b></i></div>`;
const txt=(l,v)=>`<div class="g"><span>${l}</span><em>${v}</em></div>`;
function ctl(list){const p=$('#ctl');p.innerHTML='';list.forEach(([l,id,fn,c])=>{const b=document.createElement('button');b.textContent=l;if(c)b.className=c;b.onpointerdown=()=>H[id]=1;['pointerup','pointerleave','pointercancel'].forEach(e=>b['on'+e]=()=>H[id]=0);b.onclick=()=>fn&&fn(b);p.append(b)})}
function ov(h,btns=[]){const o=$('#ov');if(!h){o.hidden=true;return}o.innerHTML=h+'<div class="row"></div>';btns.forEach(([l,fn,c])=>{const b=document.createElement('button');b.textContent=l;b.className=c||'go';b.onclick=fn;o.lastChild.append(b)});o.hidden=false}
const later=(f,ms)=>timers.push(setTimeout(f,ms));
function lv(){$('#lv').textContent=`${BADGE[Math.min(save.badges.length,8)]} · ${save.xp} XP · ${save.stars}★`}
function win(i,t,st,next,n){save.xp+=50*st;save.stars+=st;if(!save.badges.includes(i))save.badges.push(i);if(n!=null)save.n=Math.max(save.n,n);persist();lv();paused=1;
 ov(`<h2>${'⭐'.repeat(st)}${'☆'.repeat(3-st)}</h2><h3>Badge earned: ${BADGE[i]}</h3><p>${t}</p><p>+${50*st} XP</p>`,[['Next',()=>{ov();paused=0;next()}]])}
function retry(m,again){paused=1;ov(`<h2>Try again!</h2><p>${m}</p>`,[['Try again',()=>{ov();paused=0;again()}]])}
// ---------- scene helpers
function mk(bg,lit=1){if(sc)sc.traverse(o=>{o.geometry&&o.geometry.dispose();o.material&&[].concat(o.material).forEach(m=>{m.map&&m.map.dispose();m.dispose()})});
 timers.forEach(clearTimeout);timers=[];H={};
 sc=new T.Scene();sc.background=new T.Color(bg);cam=new T.PerspectiveCamera(55,innerWidth/innerHeight,.1,3000);size();
 sc.add(new T.AmbientLight(0x8899bb,.55));const s=new T.DirectionalLight(0xffffff,lit*1.2);s.position.set(40,70,30);s.castShadow=true;const c=s.shadow.camera;c.left=c.bottom=-45;c.right=c.top=45;c.far=250;s.shadow.mapSize.set(1024,1024);sc.add(s);return sc}
const M=(c,r=.6,m=0,e=0)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:m,emissive:e});
function tx(a,b,n=300,sz=256){const c=document.createElement('canvas');c.width=c.height=sz;const x=c.getContext('2d');x.fillStyle=a;x.fillRect(0,0,sz,sz);for(let i=0;i<n;i++){x.fillStyle=b;x.globalAlpha=Math.random()*.4;x.beginPath();x.arc(Math.random()*sz,Math.random()*sz,Math.random()*18+2,0,7);x.fill()}const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;return t}
function stars(){const g=new T.BufferGeometry(),a=[];for(let i=0;i<1800;i++){const u=Math.random()*2-1,w=Math.random()*6.2832,q=Math.sqrt(1-u*u);a.push(1500*q*Math.cos(w),1500*u,1500*q*Math.sin(w))}g.setAttribute('position',new T.Float32BufferAttribute(a,3));sc.add(new T.Points(g,new T.PointsMaterial({size:2.2,sizeAttenuation:false,color:0xffffff})))}
function planet(r,c1,c2,x,y,z){const m=new T.Mesh(new T.SphereGeometry(r,48,32),new T.MeshStandardMaterial({map:tx(c1,c2,600,512),roughness:1}));m.position.set(x,y,z);sc.add(m);return m}
function flat(w,h,col,y=0){const m=new T.Mesh(new T.PlaneGeometry(w,h),M(col,1));m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=true;sc.add(m);return m}
function pad(){flat(400,400,0x4d8a3c,-.02);const p=new T.Mesh(new T.CylinderGeometry(7,8,.6,32),M(0x999999,.9));p.position.y=.3;p.receiveShadow=true;sc.add(p);const t=new T.Mesh(new T.BoxGeometry(.8,16,.8),M(0xc0392b));t.position.set(5.5,8,0);t.castShadow=true;sc.add(t)}
function rocket(){const g=new T.Group(),S=new T.Group(),U=new T.Group();g.S=S;g.U=U;g.add(S,U);
 const P=(grp,geo,mat,y)=>{const m=new T.Mesh(geo,mat);m.position.y=y;m.castShadow=true;grp.add(m);return m};
 g.eng=P(S,new T.CylinderGeometry(.6,.95,1.2,16),M(0x333a4d,.4,.8),1.2);g.tank=P(S,new T.CylinderGeometry(.9,.9,6,24),M(0xf4f4f4,.5),4.8);g.tank.material.emissive=new T.Color(0);
 for(let i=0;i<4;i++){const f=P(S,new T.BoxGeometry(.1,1.6,1.2),M(0xd62828),2);f.position.x=Math.cos(i*Math.PI/2)*1.2;f.position.z=Math.sin(i*Math.PI/2)*1.2;f.rotation.y=-i*Math.PI/2;g.eng.add&&0}
 g.cap=P(U,new T.CylinderGeometry(.9,.9,1.8,24),M(0xe8e8e8,.4),8.7);g.nose=P(U,new T.ConeGeometry(.9,2.2,24),M(0xd62828,.4),10.7);
 const hp=new T.Group();hp.position.set(-.35,8.7,.88);const hd=new T.Mesh(new T.BoxGeometry(.7,1,.08),M(0x6a7db3,.3,.6));hd.position.x=.35;hp.add(hd);U.add(hp);g.hatch=hp;
 g.flame=new T.Mesh(new T.ConeGeometry(.6,3,14),new T.MeshBasicMaterial({color:0xffa31a}));g.flame.rotation.x=Math.PI;g.flame.position.y=-.9;g.flame.visible=false;S.add(g.flame);
 g.pos=0;g.position.y=.6;sc.add(g);return g}
const hh=(x,z)=>{const r=Math.hypot(x,z),q=Math.min(1,Math.max(0,(r-22)/30));return q*(Math.sin(x*.07)*Math.cos(z*.06)*4+Math.sin(x*.21+z*.17)*.7)};
function terrain(c1,c2){const g=new T.PlaneGeometry(500,500,100,100);g.rotateX(-Math.PI/2);const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,hh(p.getX(i),p.getZ(i)));g.computeVertexNormals();const t=tx(c1,c2,500);t.repeat.set(24,24);const m=new T.Mesh(g,new T.MeshStandardMaterial({map:t,roughness:1}));m.receiveShadow=true;sc.add(m)}
// ---------- stages
const S={};
function go(n){cur=n;paused=0;ov();hud('');S[n]();lv()}
S.home=()=>{mk(0x0a1030);stars();pad();sc.background=new T.Color(0x0a1030);const r=rocket();r.position.y=.6;
 planet(60,'#2a6fd6','#3fa34d',-150,70,-260);planet(14,'#999','#555',120,60,-200);planet(22,'#c1440e','#7a2a08',230,30,-320);
 let t=0;loop=dt=>{t+=dt;cam.position.set(Math.sin(t*.2)*26,8,Math.cos(t*.2)*26);cam.lookAt(0,7,0)};
 hint='Press START ADVENTURE to begin the Moon mission.';say('Hi, I am Cadet Nova! Ready to fly to the Moon? Press START ADVENTURE.');
 ctl([['START ADVENTURE','a',()=>{save.n=0;go('assemble')},'go'],['CONTINUE MISSION','b',()=>go(ORDER[Math.min(save.n,6)])],
 ['HOW TO PLAY','c',()=>ov('<h2>How to play</h2><p>Follow Nova’s tasks. Click buttons or use the keyboard: W/S/A/D or arrows to drive, Space to stop. Hold a button to keep it on. Safety first: stars reward careful choices, not speed!</p><p>All numbers are simulated for learning. This is not an official NASA simulator.</p>',[['OK',()=>ov()]])],
 ['LEARNING CENTRE','d',()=>ov('<h2>Learning centre</h2><p>Thrust: rockets push hot gas down, so they move up. Fuel needs an oxidizer to burn. Stages: dropping empty tanks makes the rocket lighter. Astronauts float because they are falling around Earth, and gravity is still pulling. The Moon has weaker gravity (about 1/6 of Earth).</p>',[['OK',()=>ov()]])],
 ['ACHIEVEMENTS','e',()=>ov('<h2>Badges</h2><p>'+(save.badges.length?save.badges.map(i=>'🏅 '+BADGE[i]).join('<br>'):'None yet. Start your mission!')+'</p>',[['OK',()=>ov()]])],
 ['MARS (locked)','f',()=>ov('<h2>Mars Mission</h2><p>'+(save.badges.includes(7)?'Moon mission complete, so Mars is unlocked! The Mars mission is not built in this version yet.':'Finish the Moon mission to unlock Mars. (Mars gameplay is coming in a later version.)')+'</p>',[['OK',()=>ov()]])]])};
S.assemble=()=>{mk(0x7ec8ff);pad();const r=rocket();const names=['eng','tank','cap','nose'],lab=['Engines','Fuel tanks','Crew capsule','Nose cone'];
 const fact=['Engines push hot gas down. That is thrust!','Tanks hold fuel and oxidizer. Burning them makes hot gas.','The capsule carries the astronauts safely.','The nose cone cuts through the air smoothly.'];
 names.forEach(n=>r[n].visible=false);r.hatch.visible=false;let i=0,t=0;
 loop=dt=>{t+=dt;cam.position.set(Math.sin(t*.3)*22,9,Math.cos(t*.3)*22);cam.lookAt(0,6,0)};
 hint='Build from the bottom up: engines, tanks, capsule, nose.';say('Build the rocket from the bottom up! Which part comes first?');
 ctl(lab.map((l,j)=>['Add '+l.toLowerCase(),'x'+j,()=>{if(j!=i){say('Not yet! Rockets are built from the bottom. Try “Add '+lab[i].toLowerCase()+'”.');return}
  r[names[j]].visible=true;say(fact[j]);i++;if(i==4){r.hatch.visible=true;later(()=>win(0,'You built a rocket! Every part has a job.',3,()=>go('fuel'),1),1800)}}]))};
S.fuel=()=>{mk(0x7ec8ff);pad();const r=rocket();let f=0,o=0,pw=0,ox=0;
 loop=dt=>{if(H.f)f+=20*dt;if(H.o)o+=20*dt;if(H.d){f-=30*dt;o-=30*dt}f=Math.max(0,Math.min(100,f));o=Math.max(0,Math.min(100,o));
  r.tank.material.emissive.setRGB(f/100*.5,f/100*.25,0);cam.position.set(18,9,18);cam.lookAt(0,5,0);
  if(f>97||o>97)say('Too full! Hold DRAIN to let some out. Aim for the green zone.');
  hud(bar('Fuel',f,100,80,95)+bar('Oxidizer',o,100,80,95)+txt('Power',pw?'ON':'OFF')+txt('Crew oxygen',ox?'ON':'OFF'))};
 hint='Hold FUEL and OXIDIZER until both bars are green (80-95), then switch on power and oxygen.';say('Your rocket needs fuel and an oxidizer to make thrust! Hold the buttons to fill both to the green zone.');
 ctl([['Fill fuel','f'],['Fill oxidizer','o'],['Drain','d'],['Power on','p',()=>{pw=1;say('Electrical power is on!')}],['Crew oxygen on','x',()=>{ox=1;say('Oxygen is flowing for the crew.')}],
 ['CHECK ALL','z',()=>{if(f<80||o<80)say('Not enough yet. The green zone starts at 80.');else if(f>95||o>95)say('Too much! Drain a little.');else if(!pw||!ox)say('Switch on power and oxygen too!');
  else win(1,'Fuel burns with an oxidizer to make hot gas. The gas rushes down and thrust pushes the rocket up. (Simulated units.)',3,()=>go('board'),2)},'go']])};
S.board=()=>{mk(0x7ec8ff);pad();const r=rocket();r.hatch.rotation.y=0;let st=0,tgt=0,pr=0,ast=[],a=0;
 for(let i=0;i<2;i++){const m=new T.Mesh(new T.CylinderGeometry(.25,.25,.9,8),M(0xff9a1a));m.position.set(6+i*1.2,1.1,1);sc.add(m);ast.push(m)}
 const steps=['Open the hatch','Board the astronauts','Check the restraints','Close the hatch','Lock the hatch','Check cabin pressure'];
 loop=dt=>{r.hatch.rotation.y+=(tgt-r.hatch.rotation.y)*Math.min(1,dt*4);
  ast.forEach((m,i)=>{if(st>=2){m.visible=false}else if(st==1){a=Math.min(1,a+dt*.4);m.position.x=6+i*1.2-(a*(6+i*1.2));m.position.y=1.1+a*7.6;m.visible=a<1}});
  if(st==6){pr=Math.min(101,pr+dt*20)}cam.position.set(7,9,11);cam.lookAt(0,8,0);
  hud(steps.map((s,i)=>txt((i<st?'✔ ':'')+s,'')).join('')+bar('Cabin pressure (sim kPa)',pr,101,95,101))};
 hint='Do the steps in order: open, board, restraints, close, lock, pressure.';say('Time to board! Start by opening the hatch.');
 const act=[()=>{tgt=-1.8;say('The hatch swings open.')},()=>{a=0;say('Astronauts climb in. Welcome aboard!')},()=>say('Seat belts clicked. Restraints keep the crew safe in a bumpy launch.'),()=>{tgt=0;say('Hatch closed.')},()=>say('Locked! A secure hatch keeps air in and space out.'),()=>{say('Checking air pressure…')}];
 const b=steps.map((s,i)=>[s,'s'+i,()=>{if(i!=st){say('Not yet! First: '+steps[st]+'.');return}act[i]();st++;if(st==6)later(()=>{if(cur=='board')win(2,'Cabin pressure is steady. The crew is sealed in safely!',3,()=>go('count'),3)},5600)}]);ctl(b)};
S.count=()=>{mk(0x7ec8ff);pad();const r=rocket();const ck={Fuel:0,Engine:0,Hatch:0,Weather:0,Crew:0};let t=10,run=0,acc=0,wind=12;
 loop=dt=>{cam.position.set(20,7,22);cam.lookAt(0,6,0);if(run){acc+=dt;if(acc>=1){acc=0;t--;say(t>0?'T-'+t:'LIFT-OFF!');if(t<0){run=0;go('launch')}}}
  hud(Object.keys(ck).map(n=>txt((ck[n]?'✔ ':'☐ ')+n,n=='Weather'?wind+' km/h wind':'')).join('')+`<div class="big">${run||t<10?'T-'+Math.max(0,t):'T-10'}</div>`)};
 hint='Tap each check, then START COUNTDOWN.';say('Mission control: complete all five safety checks, then start the countdown.');
 const chk=n=>[`Check ${n.toLowerCase()}`,'c'+n,()=>{if(n=='Weather'){wind=Math.round(Math.random()*30);if(wind>=25){say('Too windy ('+wind+' km/h)! Wait and check again.');return}}ck[n]=1;say(n+' check passed!')}];
 ctl([...Object.keys(ck).map(chk),['START COUNTDOWN','go',()=>{if(Object.values(ck).includes(0)){say('Critical check missing! Finish every safety check first.');return}if(!run){t=10;run=1;acc=0;say('T-10')}},'go'],
 ['PAUSE','pa',()=>{run=0;say('Countdown paused.')}],['RESUME','re',()=>{if(t<10&&t>=0){run=1;say('Resuming…')}}],['ABORT','ab',()=>{run=0;t=10;Object.keys(ck).forEach(n=>ck[n]=0);say('Countdown aborted. Safety first! Redo the checks.')},'bad']])};
S.launch=()=>{mk(0x7ec8ff);pad();const r=rocket();r.hatch.rotation.y=0;let alt=0,v=0,th=0,pw=0,en=0,f1=60,f2=40,stg=1,sepd=0,sv=0,sm=[],can=0,done=0,t=0;
 for(let i=0;i<40;i++){const m=new T.Mesh(new T.SphereGeometry(1,8,6),new T.MeshBasicMaterial({color:0xd0d0d0,transparent:true,opacity:0}));m.userData.l=0;sc.add(m);sm.push(m)}
 const sky=new T.Color(0x7ec8ff),sp=new T.Color(0x000010);
 loop=dt=>{t+=dt;if(done)return;if(H.u)th=Math.min(100,th+40*dt);if(H.dn)th=Math.max(0,th-40*dt);
  let fu=stg==1?f1:f2;if(!en||fu<=0)th=en&&fu<=0?0:th*(en?1:0);
  if(en&&fu>0){fu-=th/100*(stg==1?2:1.6)*dt;if(stg==1)f1=fu;else f2=fu}
  can=stg==1&&f1<=20&&alt>=25;
  const g=.0098*Math.max(0,1-alt/300);let a=th/100*.16-g;if(alt<=0&&a<0)a=0;v+=a*dt;alt+=v*dt;
  if(alt<0){alt=0;v=0}
  const Y=alt*.5;r.position.y=Y+.6;r.flame.visible=th>3&&en;r.flame.scale.set(1,th/100*1.5+.2,1);r.flame.material.color.setHSL(.08,1,.5+th/300);
  if(th>5&&alt<20){shake=1}else shake=0;
  if(en&&th>5&&alt<60&&Math.random()<.6){const m=sm.find(x=>x.userData.l<=0);if(m){m.userData.l=1;m.position.set(Math.random()-.5,Y-.2,Math.random()-.5);m.scale.setScalar(.6)}}
  sm.forEach(m=>{if(m.userData.l>0){m.userData.l-=dt*.5;m.scale.addScalar(dt*3);m.position.y-=dt*1;m.material.opacity=Math.max(0,m.userData.l*.7)}else m.material.opacity=0});
  if(sepd){sv-=dt*6;r.S.position.y+=sv*dt;r.S.visible=r.S.position.y>-300}
  sc.background.copy(sky).lerp(sp,Math.min(1,alt/80));
  cam.position.set(14+(shake?(Math.random()-.5)*.5:0),Y+6+(shake?(Math.random()-.5)*.5:0),16);cam.lookAt(0,Y+6,0);
  hud(bar('Altitude (sim km)',alt,100,100,100)+txt('Speed (sim m/s)',Math.round(v*1000))+bar('Fuel',fu/(stg==1?60:40)*100,100)+bar('Thrust %',th,100)+txt('Engine',!en?'OFF':fu<=0?'OUT OF FUEL':'ON · stage '+stg)+txt('Power',pw?'ON':'OFF'));
  $('#sep').disabled=!can;
  if(en&&fu<=0&&stg==1&&alt<25){done=1;retry('The first stage ran out of fuel too early. Use less thrust at the start to save fuel.',()=>go('launch'))}
  if(en&&fu<=0&&stg==2&&alt<100&&v<=0.001){done=1;retry('The upper stage ran out of fuel before reaching orbit height.',()=>go('launch'))}
  if(alt>=100&&stg==2){done=1;win(4,'Orbit! Staging dropped the heavy empty tank so the upper stage could speed up. In orbit you fall around Earth, so you float. Gravity is still working! (Simulated numbers.)',f2>10?3:2,()=>go('space'),5)}};
 hint='1) POWER 2) ENGINE START 3) hold THRUST UP. When fuel is low and altitude is above 25, press SEPARATE.';say('The rocket pushes gases downward. The rocket moves upward! Press POWER, then ENGINE START.');
 ctl([['POWER','p',()=>{pw=1;say('Power on. Now press ENGINE START.')}],['ENGINE START','e',()=>{if(!pw){say('Turn the power on first!');return}if(stg==1&&!en){en=1;th=40;say('Ignition! Hold THRUST UP to climb.')}else if(stg==2&&!en){en=1;th=40;say('Upper stage engine ignited!')}}],
 ['THRUST UP','u'],['THRUST DOWN','dn'],['SEPARATE','sepb',()=>{if(!can){say('Not yet. Wait until the first stage is nearly empty and you are above 25 km.');return}sepd=1;sv=0;stg=2;en=0;th=0;sc.attach(r.S);say('Stage separation! The empty tank falls away. Press ENGINE START to light the upper stage.')}],
 ['ABORT','ab',()=>{if(alt<30){done=1;say('Abort! The escape system pulls the capsule to safety.');later(()=>retry('Abort worked and the crew is safe.',()=>go('count')),1800)}else say('Too high to use the escape system. Keep flying!')},'bad']]);$('#ctl').children[4].id='sep'};
S.space=()=>{mk(0x000008,1);stars();const earth=planet(40,'#2a6fd6','#3fa34d',-130,-40,-150),moon=planet(14,'#aaa','#555',0,0,-400);
 const rig=new T.Group();sc.add(rig);rig.add(cam);cam.position.set(0,1.5,6);const sh=new T.Mesh(new T.ConeGeometry(.8,3,12),M(0xeeeeee,.4,.5));sh.rotation.x=-Math.PI/2;rig.add(sh);
 const mYaw=(Math.random()<.5?-1:1)*(.5+Math.random()*.4),mPit=(Math.random()<.5?-1:1)*(.2+Math.random()*.3);
 const dir=new T.Vector3(Math.sin(mYaw)*Math.cos(mPit),Math.sin(mPit),-Math.cos(mYaw)*Math.cos(mPit));
 let dist=400,v=0,th=0,fuel=40,yv=0,pv=0,t=0,done=0;
 loop=dt=>{if(done)return;t+=dt;const yi=(k('ArrowLeft','KeyA')||H.l?1:0)-(k('ArrowRight','KeyD')||H.r?1:0),pi=(k('ArrowUp')||H.up?1:0)-(k('ArrowDown')||H.dw?1:0);
  yv=Math.max(-.7,Math.min(.7,yv+yi*1.2*dt));pv=Math.max(-.7,Math.min(.7,pv+pi*1.2*dt));if(k('Space')||H.st){yv*=1-3*dt;pv*=1-3*dt}
  rig.rotation.order='YXZ';rig.rotation.y+=yv*dt;rig.rotation.x=Math.max(-1.2,Math.min(1.2,rig.rotation.x+pv*dt));
  if(k('KeyW')||H.tu)th=Math.min(100,th+40*dt);if(k('KeyS')||H.td)th=Math.max(0,th-40*dt);if(fuel<=0)th=0;
  if(fuel>0){v+=(th*.6-v)*dt;fuel-=th/100*1.2*dt}
  moon.position.copy(dir).multiplyScalar(dist);const fw=new T.Vector3();rig.getWorldDirection(fw);fw.negate();const err=fw.angleTo(dir);const al=err<.14;
  dist-=v*dt*(al?1:.15);earth.scale.setScalar(.25+dist/533);moon.scale.setScalar(1);
  hud(txt('Distance to Moon (sim)',Math.round(dist*.96)+',000 km')+txt('Speed',Math.round(v*10)+' sim km/s')+bar('Fuel',fuel/40*100,100)+bar('Thrust %',th,100)+txt('Aim',al?'✔ Moon centred':'Turn toward the Moon')+txt('Mission time (game)',Math.round(t)+' s ≈ '+(t/60*72).toFixed(0)+' hours real')+txt('Radio delay',(dist/400*1.3).toFixed(1)+' s one-way'));
  if(dist<=40){done=1;win(5,'You navigated to the Moon! Real Apollo trips took about 3 days. Our game compresses time, and radio signals really do take over a second to reach the Moon.',al&&fuel>8?3:2,()=>go('landing'),6)}
  else if(fuel<=0&&v<1.5&&dist>40){done=1;retry('You ran out of fuel and stopped. Without forces, a spacecraft keeps moving, so plan your burns.',()=>go('space'))}};
 hint='Turn until the Moon is in the centre, then hold THRUST UP. Aim saves fuel.';say('Even in space, gravity is still working! Turn your ship to point at the Moon, then add thrust.');
 ctl([['◀ Rotate left','l'],['Rotate right ▶','r'],['▲ Rotate up','up'],['▼ Rotate down','dw'],['Increase thrust','tu'],['Decrease thrust','td'],['STABILIZE','st']])};
let mode='land',rov,ramp,lander,legs,rocks=[],samp=[],haz=[],spire;
function moonWorld(){mk(0x000005,1.1);stars();terrain('#8a8a8a','#4a4a4a');planet(30,'#2a6fd6','#3fa34d',-200,120,-380);
 rocks=[];for(let i=0;i<26;i++){const a=Math.random()*6.28,d=22+Math.random()*90,s=.8+Math.random()*1.5,x=Math.cos(a)*d,z=Math.sin(a)*d;const m=new T.Mesh(new T.IcosahedronGeometry(1,0),M(0x666666,1));m.scale.set(s,s*.7,s);m.position.set(x,hh(x,z)+s*.3,z);m.castShadow=true;sc.add(m);rocks.push({x,z,r:s})}
 haz=[[20,-45],[-35,10],[45,30]].map(([x,z])=>{const m=new T.Mesh(new T.CircleGeometry(7,24),new T.MeshBasicMaterial({color:0x151515}));m.rotation.x=-Math.PI/2;m.position.set(x,hh(x,z)+.08,z);sc.add(m);return{x,z,r:7}});
 samp=[[30,-20],[-40,-50],[55,-5]].map(([x,z])=>{const m=new T.Mesh(new T.OctahedronGeometry(.7),new T.MeshBasicMaterial({color:0x43e6a8}));m.position.set(x,hh(x,z)+1,z);sc.add(m);return{m,x,z,got:0}});
 spire=new T.Mesh(new T.ConeGeometry(3,16,6),M(0x7a7a7a,1));spire.position.set(-25,hh(-25,-90)+8,-90);spire.castShadow=true;sc.add(spire);
 lander=new T.Group();const b=new T.Mesh(new T.CylinderGeometry(1.6,2,2.2,8),M(0xd9b24c,.4,.6));b.position.y=2.4;b.castShadow=true;lander.add(b);
 legs=new T.Group();for(let i=0;i<4;i++){const l=new T.Mesh(new T.BoxGeometry(.2,2.4,.2),M(0x999999));l.position.set(Math.cos(i*1.57+.78)*2,1,Math.sin(i*1.57+.78)*2);l.rotation.z=Math.cos(i*1.57+.78)*.4;l.rotation.x=-Math.sin(i*1.57+.78)*.4;legs.add(l)}lander.add(legs);
 const fl=new T.Mesh(new T.ConeGeometry(.9,3,12),new T.MeshBasicMaterial({color:0xffc44d}));fl.rotation.x=Math.PI;fl.position.y=.4;fl.visible=false;lander.fl=fl;lander.add(fl);
 ramp=new T.Group();ramp.position.set(0,1.3,1.8);const rm=new T.Mesh(new T.BoxGeometry(1.6,.1,4.2),M(0x888888));rm.position.z=2.1;ramp.add(rm);ramp.rotation.x=-1.4;lander.add(ramp);sc.add(lander);
 rov=new T.Group();const rb=new T.Mesh(new T.BoxGeometry(2.2,.6,3.2),M(0xf1f1f1,.4,.3));rb.position.y=.9;rb.castShadow=true;rov.add(rb);const sp=new T.Mesh(new T.BoxGeometry(2.6,.08,1.6),M(0x1a2b6b,.2,.8));sp.position.y=1.4;rov.add(sp);
 const ma=new T.Mesh(new T.CylinderGeometry(.06,.06,1.4),M(0x999999));ma.position.set(.6,1.7,-1);rov.add(ma);rov.led=new T.Mesh(new T.SphereGeometry(.15),new T.MeshBasicMaterial({color:0x552222}));rov.led.position.set(0,1.1,-1.65);rov.add(rov.led);
 for(let i=0;i<6;i++){const w=new T.Mesh(new T.CylinderGeometry(.45,.45,.4,14),M(0x222222));w.rotation.z=Math.PI/2;w.position.set(i%2?1.3:-1.3,.45,-1.2+Math.floor(i/2)*1.2);w.castShadow=true;rov.add(w)}rov.visible=false;sc.add(rov)}
S.landing=()=>{moonWorld();mode='land';let alt=120,vs=-6,fuel=30,th=0,gear=0,tilt=.15,done=0;lander.position.set(0,alt*.12,0);
 loop=dt=>{if(done)return;if(H.u)th=Math.min(100,th+50*dt);if(H.dn)th=Math.max(0,th-50*dt);if(fuel<=0)th=0;fuel-=th/100*1.4*dt;
  vs+=(th/100*4.5-1.62)*dt;alt+=vs*dt;tilt+=(Math.random()-.5)*.6*dt;if(H.st)tilt*=1-3*dt;
  const gp=gear?1:0;legs.scale.y+=((gp?1:.3)-legs.scale.y)*Math.min(1,dt*3);
  lander.position.y=Math.max(0,alt)*.12;lander.rotation.z=tilt;lander.fl.visible=th>3;lander.fl.scale.set(1,th/50+.2,1);
  cam.position.set(16,lander.position.y+3,16);cam.lookAt(0,lander.position.y+2,0);
  hud(bar('Altitude (m)',Math.max(0,alt),120)+txt('Vertical speed (m/s)',vs.toFixed(1)+(vs<-2.5?' ⚠ too fast':' ✔'))+bar('Fuel',fuel/30*100,100)+bar('Thrust %',th,100)+txt('Landing gear',gear?'DOWN':'UP')+txt('Tilt',Math.abs(tilt)<.3?'✔ upright':'⚠ stabilize'));
  if(alt<=0){done=1;alt=0;const ok=vs>-2.5&&gear&&Math.abs(tilt)<.3;
   if(ok){win(6,'Touchdown! Safe landing speed saved your spacecraft. The Moon has about 1/6 of Earth’s gravity and no air, so you had to use engines the whole way.',vs>-1.2?3:2,()=>deploy(),null)}
   else retry(!gear?'Deploy the landing gear before touching down!':vs<=-2.5?'Too fast ('+Math.abs(vs).toFixed(1)+' m/s). Slow down with more thrust.':'The lander was tilted. Press STABILIZE.',()=>go('landing'))}};
 hint='Hold THRUST UP to slow down. Deploy gear. Touch down below 2.5 m/s, upright.';say('Slow down! Your spacecraft needs a safe landing speed. Use thrust, drop the gear, and stabilize.');
 ctl([['THRUST UP','u'],['THRUST DOWN','dn'],['Deploy gear','g',()=>{gear=1;say('Landing gear is down.')}],['STABILIZE','st']])};
function deploy(){mode='dep';let st=0,ta=-1.4,rv=0,p=0;rov.rotation.y=Math.PI;rov.position.set(0,1.1,.5);rov.visible=true;legs.scale.y=1;
 loop=dt=>{ramp.rotation.x+=(ta-ramp.rotation.x)*Math.min(1,dt*3);if(st>=2){p=Math.min(1,p+dt*.3);rov.position.set(0,1.1-p*.8,.5+p*6.5)}
  cam.position.set(14,6,14);cam.lookAt(0,1.5,3);hud('')};
 hint='Open the ramp, deploy the rover, activate it.';say('Landed! Scientists send rovers to explore places safely. Open the ramp first.');
 ctl([['Open ramp','r1',()=>{if(st)return;st=1;ta=.5;say('Ramp is open.')}],['Deploy rover','r2',()=>{if(st!=1){say('Open the ramp first.');return}st=2;say('The rover rolls down the ramp…')}],['Activate rover','r3',()=>{if(st!=2||p<1){say('Wait for the rover to reach the ground.');return}rov.led.material.color.set(0x43e6a8);st=3;drive()},'go']])}
function drive(){mode='drive';let s=0,a=Math.PI,x=0,z=7,bat=100,dist=0,got=0,photo=0,bumps=0,cd=0,fl=0,done=0;
 const fv=()=>[-Math.sin(a),-Math.cos(a)];
 loop=dt=>{if(done)return;const f=k('KeyW','ArrowUp')||H.w,b=k('KeyS','ArrowDown')||H.s,l=k('KeyA','ArrowLeft')||H.a,r=k('KeyD','ArrowRight')||H.d;
  if(f)s=Math.min(8,s+6*dt);if(b)s=Math.max(-4,s-6*dt);if(k('Space')||H.sp)s=0;if(!f&&!b)s*=1-.5*dt;
  if(l)a+=1.3*dt;if(r)a-=1.3*dt;const[fx,fz]=fv();x+=fx*s*dt;z+=fz*s*dt;dist+=Math.abs(s)*dt;bat-=(.35*Math.abs(s)+.05)*dt;cd-=dt;
  rocks.forEach(q=>{const d=Math.hypot(x-q.x,z-q.z);if(d<q.r+1.4){x+=(x-q.x)/d*.3;z+=(z-q.z)/d*.3;s*=-.3;if(cd<=0){bumps++;bat-=3;cd=1;say('Bump! Steer around rocks to save battery.')}}});
  haz.forEach(q=>{if(Math.hypot(x-q.x,z-q.z)<q.r){bat-=18*dt;s*=1-2*dt;say('Danger: crater! It drains your battery. Back out!')}});
  samp.forEach(q=>{if(!q.got&&Math.hypot(x-q.x,z-q.z)<3){q.got=1;q.m.visible=false;got++;say(['You discovered a rock sample! Scientists study rocks to understand planets!','Another sample! Moon rocks are billions of years old.','All samples collected! Great science!'][got-1])}});
  rov.position.set(x,hh(x,z)+.2,z);rov.rotation.y=a;rov.rotation.x=0;cam.position.set(x-fx*9,hh(x,z)+5,z-fz*9);cam.lookAt(x,hh(x,z)+1,z);
  const dl=Math.hypot(x+25,z+90);
  hud(bar('Battery',bat,100,30)+txt('Speed',Math.abs(s).toFixed(1)+' m/s')+txt('Distance',Math.round(dist)+' m')+txt('Samples',got+' / 3')+txt(photo?'✔ Landmark photo taken':'☐ Photograph the tall rock','')+txt('Landmark distance',Math.round(dl)+' m'));
  if(bat<=0){done=1;retry('The battery ran out. Drive smoothly and avoid craters and rocks.',()=>go('landing'))}
  if(got==3&&photo){done=1;win(7,'Mission complete! You explored the Moon, collected samples and photographed a landmark. Mars is now unlocked — but its mission is not built in this version yet.',1+(bat>30?1:0)+(bumps<3?1:0),()=>go('home'),0)}};
 hint='Drive with W A S D or arrows. Space stops. Collect 3 green samples and photograph the tall rock (press the camera button within 15 m).';say('Drive the rover! Collect the 3 glowing samples, avoid the dark craters, and photograph the tall rock.');
 ctl([['▲ Forward','w'],['◀ Left','a'],['Right ▶','d'],['▼ Reverse','s'],['STOP','sp'],['📷 Photo','ph',()=>{if(Math.hypot(x+25,z+90)<15){photo=1;say('Click! Photos help scientists study landmarks back on Earth.')}else say('Get closer to the tall rock (under 15 m).')},'go']])}
// ---------- top bar & loop
$('#bp').onclick=e=>{paused=!paused;e.target.textContent=paused?'Resume':'Pause'};
$('#br').onclick=()=>go(cur);
$('#bh').onclick=()=>say(hint||'Follow Nova’s tasks!');
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);if(sc){if(!paused)loop(dt);R.render(sc,cam)}}
if(typeof THREE==='undefined'){document.body.insertAdjacentHTML('beforeend','<p style="position:fixed;inset:40% 10% auto;text-align:center;font-size:22px">Could not load the 3D library. Check your internet connection and reload.</p>')}
else{go('home');frame()}
