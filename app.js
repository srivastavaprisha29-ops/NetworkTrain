'use strict';

const $=id=>document.getElementById(id);
function make(tag,text,cls){
 const el=document.createElement(tag);
 if(text!==undefined)el.textContent=text;
 if(cls)el.className=cls;
 return el;
}
function button(text,action,selected,cls){
 const el=make('button',text,cls);el.onclick=action;
 if(selected!==undefined)el.setAttribute('aria-pressed',selected);
 return el;
}
const refs=[
 ['OSI model · Layers 1, 2, 5, 6','Illustrative labs on physical signaling, Ethernet and ARQ, session checkpoints, and representation transforms.'],
 ['Transport Layer 1 · UDP','Ports, sockets, user-datagram format, checksum, queues, multiplexing and applications.'],
 ['Transport Layer 2 · TCP','Byte stream, buffers, segment fields, sequence and ACK examples, setup, transfer and termination.'],
 ['CNP Chapter 17 · Application','Client–server design, iterative and concurrent service, socket interfaces.'],
 ['CNP Chapter 18 · DHCP','Configuration, BOOTP, relay, message layout, allocation and lease states.'],
 ['CNP Chapter 19 · DNS','Hierarchy, zones, delegation, resolution, records, flags, compression and transport.'],
 ['HTTP 2025','Web documents, request and response formats, persistence and cookies.'],
 ['Switching PPT · slide 34','Router forwarding diagram: validation, routing table, ARP, MTU and ingress/egress data link layers.'],
 ['Delivery and Forwarding PPTX and PPT','Next-hop selection, CIDR, prefix aggregation and delivery.'],
 ['Routing Protocols PPTs · both copies','RIP, OSPF and BGP packet exchanges.'],
 ['ARP PPT','Next-hop IPv4 resolution on the outgoing local link.'],
 ['RFC 1812','https://www.rfc-editor.org/rfc/rfc1812'],
 ['Kurose and Ross · router architecture','https://faculty.kfupm.edu.sa/COE/ashraf/RichFilesTeaching/COE072_540/Kurose_ch4_3ed.pdf']
];
refs.forEach(([name,detail])=>{
 const item=make('li');
 if(detail.startsWith('https:')){const a=make('a',name);a.href=detail;a.target='_blank';a.rel='noopener noreferrer';item.append(a);}
 else item.textContent=name+' — '+detail;
 $('source-list').append(item);
});
$('sources').onclick=()=>$('source-dialog').showModal();
$('lab-menu').onclick=()=>$('lab-dialog').showModal();
let mode='journey',branch=0,index=0,layer=2,position=0,drag=null,hovered='';
const span=310;
const current=()=>modes[mode].options[branch];
const currentStep=()=>current().steps[index];
const limit=()=>current().steps.length-.001;
const canvas=$('canvas'),ctx=canvas.getContext('2d');
const conceptInfo={
 Encapsulation:['A layer wraps the payload with its own header. At this hop, Ethernet carries the IP datagram and adds the local MAC addresses.','encap'],
 Decapsulation:['A receiving layer removes its wrapper and passes the payload to the next layer.','encap'],
 'IPv4 validation':['R1 checks the IP header before using it. A malformed or corrupt datagram takes the discard branch.','journey'],
 'Forwarding lookup':['The destination IP matches a route prefix in the forwarding table. The longest matching prefix selects the next hop and egress interface.','forward'],
 'TTL & checksum':['R1 consumes one hop of TTL and updates the IPv4 header checksum. An expired TTL triggers an ICMP Time Exceeded response in this example.','journey'],
 ARP:['ARP resolves the IP of the local next hop to an Ethernet MAC. A cache miss sends an Ethernet broadcast, and the owner replies.','arp'],
 'MTU & fragmentation':['The IP datagram must fit the outgoing link MTU. A larger IPv4 datagram can fragment when DF is clear. With DF set, the router discards it and reports the next-hop MTU.','journey'],
 'Queue & transmit':['The frame waits if the output interface is busy, then the interface serializes its bits onto the link.','switch'],
 'IP delivery':['The receiver recognizes its IP address. It reassembles fragments when present and hands the payload to transport.','encap'],
 Unicast:['One destination address identifies a single receiver. This frame is sent to the selected next hop.','unicast'],
 Multicast:['A group address identifies interested receivers. In the RIP v2 example the destination is 224.0.0.9.','multi'],
 Broadcast:['All devices on the local link receive the frame. An ARP request uses the Ethernet broadcast address.','broadcast'],
 'Control plane':['Routers exchange routing information to populate the table that the data plane uses to forward packets.','route'],
 'Packet forwarding':['Forwarding moves packets from the incoming interface toward the selected outgoing interface.','forward']
};
function concepts(){
 if(mode==='application'&&branch===2)return upperTopics[activeLesson()];
 if(upperTopics[mode])return upperTopics[mode];
 if(mode==='encap')return [branch?'Decapsulation':'Encapsulation','IP delivery'];
 if(mode==='route')return [['RIP packet','Bellman–Ford'],['RIP packet','Bellman–Ford'],['Loop prevention','RIP timers'],['OSPF exchange','Dijkstra'],['OSPF LSAs','OSPF areas'],['BGP messages','Control plane']][branch];
 const list={unicast:['Unicast'],multi:['Multicast'],broadcast:['Broadcast'],arp:['ARP','Broadcast','Unicast'],forward:['Forwarding lookup','ARP'],switch:['Packet forwarding','Queue & transmit'],route:['Control plane','Forwarding lookup']};
 if(mode!=='journey')return list[mode];
 const p=currentStep().paths[0],stage=p?.to;
 const local={I:['Encapsulation','ARP'],V:['Decapsulation','IPv4 validation'],F:['Forwarding lookup','Control plane'],H:['TTL & checksum'],N:['ARP','Unicast'],M:['MTU & fragmentation'],Frag:['MTU & fragmentation'],ICMP:['MTU & fragmentation'],O:['Encapsulation','Queue & transmit'],R2:['Unicast','Queue & transmit'],B:['IP delivery','Decapsulation'],Drop:['IPv4 validation'],A:[branch===2?'MTU & fragmentation':'TTL & checksum']};
 return local[stage]||['Encapsulation','ARP','Unicast'];
}
const nodeLessons={A:'sender',I:'ingress',V:'validate',F:'forward',H:'ttl',N:'arp',M:'mtu',Frag:'mtu',ICMP:'mtu',Drop:'validate',O:'egress',R2:'forward',B:'destination'};
const conceptLessons={...upperConcepts,'RIP packet':'rip','Bellman–Ford':'bellman','Loop prevention':'loop','RIP timers':'timers','OSPF exchange':'ospf',Dijkstra:'dijkstra','OSPF LSAs':'lsa','OSPF areas':'areas','BGP messages':'bgp',Encapsulation:'sender',Decapsulation:'ingress','IPv4 validation':'validate','Forwarding lookup':'forward','TTL & checksum':'ttl',ARP:'arp','MTU & fragmentation':'mtu','Queue & transmit':'egress','IP delivery':'destination',Unicast:'scope',Multicast:'scope',Broadcast:'scope','Control plane':'routing','Packet forwarding':'switching'};
const related={
 sender:['scope','arp','classful'],ingress:['validate','ttl'],validate:['forward','ttl'],forward:['classful','cidr','routing'],classful:['forward','cidr'],cidr:['forward','bgp'],
 ttl:['validate','mtu'],arp:['arp-cache','arp-legacy','scope','forward'],'arp-cache':['arp','arp-legacy'],'arp-legacy':['arp','arp-cache'],mtu:['ttl','egress','destination'],egress:['delay','switching'],destination:['mtu','arp'],
 switching:['delay','routing'],delay:['switching','egress'],scope:['arp','rip'],routing:['bellman','dijkstra','bgp'],bellman:['rip','loop','dijkstra'],
 rip:['loop','timers','scope'],loop:['rip','timers'],timers:['rip','loop'],dijkstra:['areas','ospf','bellman'],areas:['lsa','dijkstra'],ospf:['lsa','areas'],lsa:['ospf','areas'],bgp:['cidr','routing']
};
function activeLesson(){
 if(mode==='http'&&branch===1)return 'http-state';
 if(mode==='application'&&branch===2)return ['dhcp','dns','tcp','http','http'][index];
 if(mode in labLayers)return mode;
 if(mode==='journey')return branch===5||index===0?'sender':nodeLessons[currentStep().paths[0]?.to]||'sender';
 if(mode==='route'){
  if(branch<=1)return index===2?'bellman':'rip';
  if(branch===2)return index===2?'timers':'loop';
  if(branch===3)return index===5?'dijkstra':index===3?'lsa':'ospf';
  return branch===4?'lsa':'bgp';
 }
 return {encap:branch?'destination':'sender',forward:'forward',arp:'arp',switch:'switching'}[mode]||'scope';
}
const glossary=$('definitions-dialog');
const defSearch=$('definition-search');
const defGroup=$('definition-group');
const defContext=$('definition-context');
const orderedDefinitions=[...definitions].sort((a,b)=>a[0].localeCompare(b[0]));
for(const group of new Set(Object.values(lessons).map(item=>item.group))){
 const choice=make('option',group);
 choice.value=group;defGroup.append(choice);
}
let stageOnly=false;
function renderDefinitions(selectedTerm=''){
 const search=defSearch.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
 const key=stageOnly?activeLesson():'';
 const matches=orderedDefinitions.filter(([term,definition,context,id])=>{
  if(key&&id!==key)return false;
  if(defGroup.value&&lessons[id].group!==defGroup.value)return false;
  const words=[term,definition,context,lessons[id].group].join(' ').toLowerCase();
  return search.every(word=>words.includes(word));
 });
 const list=$('definition-list');
 const rows=matches.map(([term,definition,context,id])=>{
  const item=make('details',undefined,'definition-item');
  item.open=term===selectedTerm||matches.length===1;
  const usage=make('p',context);
  usage.prepend(make('span','In the network','label'));
  const source=make('small',lessons[id].slides,'lesson-ref');
  const link=button('Open lesson',()=>{glossary.close();openLesson(id,$('definitions-button'));});
  item.append(make('summary',term),make('p',definition),usage,source,link);
  return item;
 });
 list.replaceChildren(...(rows.length?rows:[make('p','No terms found. Try a different search or topic.','muted')]));
 $('def-status').textContent=matches.length+' of '+definitions.length+' terms';
 defContext.setAttribute('aria-pressed',String(stageOnly));
}
function showDefinitions(term=''){
 stageOnly=false;defSearch.value=term;defGroup.value='';
 renderDefinitions(term);
 if(!glossary.open)glossary.showModal();
 glossary.scrollTop=0;
 if(term){
  const match=$('definition-list').querySelector('details[open]');
  if(match)match.querySelector('summary').focus({preventScroll:true});
 }else defSearch.focus();
}
$('definitions-button').onclick=()=>showDefinitions();
defSearch.oninput=()=>renderDefinitions();
defGroup.onchange=()=>{stageOnly=false;renderDefinitions();};
defContext.onclick=()=>{
 stageOnly=!stageOnly;
 defGroup.value='';defSearch.value='';renderDefinitions();
};

const lessonVideos={
 stop:['YdkksvhkQGQ','Stop-and-Wait ARQ','Neso Academy · ACK loss, timeouts, and retransmission.'],
 gbn:['QD3oCelHJ20','Go-Back-N ARQ','Neso Academy · Sliding windows and which frames are retransmitted.'],
 vlan:['GrhHMai2d2Y','How VLANs Work','Network Direction · Ethernet switching and broadcast domains.'],
 fundamentals:['fQbBPa0ADvs','Computer Networking Fundamentals','freeCodeCamp · A course-level overview of networking.']
};
const videosByLesson={
 datalink:['stop','gbn','vlan'],
 sender:['fundamentals'],
 application:['fundamentals']
};
function addLessonVideos(body,id){
 const matches=videosByLesson[id];
 if(!matches?.length)return;
 const section=make('section',undefined,'lesson-videos');
 section.append(make('h3','Watch on YouTube','label'));
 for(const key of matches){
  const [video,title,description,start]=lessonVideos[key];
  const link=make('a',undefined,'video-card');
  link.href='https://www.youtube.com/watch?v='+video+(start?'&t='+start+'s':'');
  link.target='_blank';link.rel='noopener noreferrer';
  const icon=make('span','▶','video-icon');icon.setAttribute('aria-hidden','true');
  const copy=make('span');copy.append(make('strong',title),make('small',description));
  const arrow=make('span','↗');arrow.setAttribute('aria-hidden','true');
  link.append(icon,copy,arrow);section.append(link);
 }
 body.append(section);
}

let lessonTrigger=null;
function setLessonExpanded(expanded){
 $('lesson-drawer').classList.toggle('is-expanded',expanded);
 $('lesson-expand').setAttribute('aria-pressed',String(expanded));
 $('lesson-expand').textContent=expanded?'Restore':'Expand';
}
$('lesson-expand').onclick=()=>setLessonExpanded(!$('lesson-drawer').classList.contains('is-expanded'));
function openLesson(id,trigger){
 const item=lessons[id];
 if(!item)return;
 const wasHidden=$('lesson-drawer').hidden;
 if(wasHidden)lessonTrigger=trigger??document.activeElement;
 $('concept-pop').hidden=true;
 $('lesson-group').textContent=item.group;
 $('lesson-title').textContent=item.title;
 const body=$('lesson-body');
 const flow=make('ol',undefined,'lesson-flow');
 for(const text of item.flow){
  const li=make('li',text);
  if(['Cache hit','Cache miss','Fits','Too large','Malformed','Local destination','Transit destination','TTL still','TTL exhausted'].some(prefix=>text.startsWith(prefix)))li.dataset.branch='';
  flow.append(li);
 }
 body.replaceChildren(make('small',item.slides,'lesson-ref'),make('p',item.summary),make('div','How it works','label'),flow,make('div','Worked example','label'),make('p',item.example,'lesson-example'));
 if(id==='lsa'||id==='areas'){
  const figure=make('figure',undefined,'lsa-topology');
  figure.setAttribute('aria-label','R1, R2 and R3 are attached to shared transit network N2. R2 is the designated router.');
  const peers=make('div',undefined,'topology-peers');
  for(const [label,info] of [['R1','Type 1'],['R2 · DR','Types 1 and 2'],['R3','Type 1']]){
   const peer=make('div',label);peer.append(make('small',info));peers.append(peer);
  }
  figure.append(peers,make('div','N2 · Shared transit LAN','topology-lan'));
  body.append(figure);
 }
 const keywords=definitions.filter(term=>term[3]===id);
 if(keywords.length){
  const list=make('div',undefined,'keyword-list');
  for(const [term] of keywords)list.append(button(term,()=>showDefinitions(term)));
  body.append(make('div','Definitions & keywords','label'),list);
 }
 addLessonVideos(body,id);
 body.append(make('div','Questions to check','label'));
 for(const [q,a] of item.questions){
  const d=make('details');d.append(make('summary',q),make('p',a));body.append(d);
 }
 const links=make('div',undefined,'lesson-links');
 for(const ref of related[id]||[])links.append(button(lessons[ref].title,()=>openLesson(ref)));
 body.append(make('div','Related concepts','label'),links);
 $('lesson-drawer').hidden=false;$('lesson-drawer').scrollTop=0;
 if(wasHidden)$('lesson-close').focus({preventScroll:true});
}
function closeLesson(){
 $('lesson-drawer').hidden=true;
 setLessonExpanded(false);
 if(lessonTrigger?.isConnected)lessonTrigger.focus({preventScroll:true});
 lessonTrigger=null;
}
$('lesson-close').onclick=closeLesson;
$('inspect-more').onclick=e=>inspectStage(e.currentTarget);
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('lesson-drawer').hidden)closeLesson();});
const grouped=new Map();
for(const [id,item] of Object.entries(lessons)){
 if(!grouped.has(item.group)){
  const group=make('section',undefined,'lesson-group');
  group.append(make('h3',item.group));$('lesson-index').append(group);grouped.set(item.group,group);
 }
 grouped.get(item.group).append(button(item.title,()=>{$('lab-dialog').close();openLesson(id,$('lab-menu'));}));
}
function showConcept(name){
 const item=conceptInfo[name], pop=$('concept-pop');
 hovered=name;
 pop.replaceChildren(make('h3',name),make('p',item?.[0]??lessons[conceptLessons[name]].summary));
 pop.append(button('Open full lesson',()=>openLesson(conceptLessons[name])),button('Close',()=>{pop.hidden=true;hovered='';}));
 pop.hidden=false;
}
function nav(){
 const labels=concepts();
 if(!$('toolbar').dataset.key||$('toolbar').dataset.key!==labels.join('|')){
  $('toolbar').dataset.key=labels.join('|');
  $('toolbar').replaceChildren(...labels.map(name=>{
   const el=button(name,e=>openLesson(conceptLessons[name],e?.currentTarget));
   el.onpointerenter=()=>showConcept(name);el.onfocus=()=>showConcept(name);
   return el;
  }));
  if(hovered&&!labels.includes(hovered)){$('concept-pop').hidden=true;hovered='';}
 }
 const key=String(layer);
 if($('layers').dataset.key!==key){
  $('layers').dataset.key=key;
  $('layers').replaceChildren(...layerNames.map((name,n)=>{
   const el=button(undefined,()=>{
    choose(layerHomes[n]);
   },layer===n,'layer');
   el.append(make('span','L'+(n+1)),document.createTextNode(name));return el;
  }).reverse());
 }
}
function inspectStage(trigger){
 const st=currentStep();
 openLesson(activeLesson(),trigger);
 const context=make('section',undefined,'stage-context');
 context.append(make('div','Current stage','label'),make('h3',st.title),make('p',st.description));
 const headers=make('div',undefined,'packet-layers');
 headers.append(...st.stack.map(name=>make('span',name)));
 context.append(headers);
 if(st.fields.length){
  const fields=make('dl');
  for(const [name,value] of st.fields)fields.append(make('dt',name),make('dd',String(value)));
  context.append(fields);
 }
 $('lesson-body').prepend(context);
}
let trackKey='';
function renderStageTrack(steps){
 const track=$('stage-track');
 const show=mode in labLayers;
 track.hidden=!show;
 if(!show)return;
 const key=mode+':'+branch;
 if(trackKey!==key){
  trackKey=key;
  track.replaceChildren(...steps.map((st,n)=>{
   const control=button(undefined,e=>{place(n,true);inspectStage(e.currentTarget);});
   control.append(make('span',String(n+1).padStart(2,'0')),make('strong',st.title));
   return control;
  }));
  track.scrollLeft=0;
 }
 for(const [n,control] of Array.from(track.children).entries()){
  if(n===index){
   control.setAttribute('aria-current','step');
   if(control.offsetLeft<track.scrollLeft)track.scrollLeft=control.offsetLeft;
   else if(control.offsetLeft+control.offsetWidth>track.scrollLeft+track.clientWidth)
    track.scrollLeft=control.offsetLeft+control.offsetWidth-track.clientWidth+4;
  }else control.removeAttribute('aria-current');
 }
}
function branchControls(){
 const opts=current().steps;
 $('branches').replaceChildren();
 if(mode in labLayers){
  for(const [id,name] of tabs.filter(([id])=>labLayers[id]===labLayers[mode])) $('branches').append(button(name,()=>choose(id),mode===id));
  for(const [n,o] of modes[mode].options.entries()) $('branches').append(button(o.label,()=>choose(mode,n),n===branch));
 }else if(mode==='journey'&&branch<5){
  if(index<4&&branch===0){
   $('branches').append(button('Same subnet',()=>choose('journey',5)),button('Invalid header',()=>choose('journey',3,1)),button('Expired TTL',()=>choose('journey',4,3)));
  }else{
   mainBranches.forEach((label,n)=>$('branches').append(button(label,()=>choose('journey',n,Math.min(index,n===3?2:n===4?4:5)),n===branch)));
  }
 }else if(mode==='journey')$('branches').append(button('Routed delivery',()=>choose('journey')));
 else if(modes[mode].options.length>1)$('branches').append(...modes[mode].options.map((o,n)=>button(o.label,()=>choose(mode,n),n===branch)));
 return opts;
}
function render(){
 if(mode==='encap')layer=branch?index:6-index;
 const selected=modes[mode],st=currentStep(),steps=branchControls();
 renderStageTrack(steps);
 $('router-map').textContent=mode==='journey'?'Router map':'Stage map';
 $('down').disabled=mode==='encap'&&layer===0;
 $('up').disabled=mode==='encap'&&layer===6;
 $('down').setAttribute('aria-pressed',String(mode==='encap'&&branch===0));
 $('up').setAttribute('aria-pressed',String(mode==='encap'&&branch===1));
 $('section').textContent=mode==='encap'?'OSI / L'+(layer+1):'OSI / L'+(layer+1)+' / '+layerNames[layer].toUpperCase();
 if($('title').textContent!==selected.name)$('title').textContent=selected.name;
 $('intro').textContent=selected.subtitle;
 $('step-title').textContent=st.title;
 $('counter').textContent=String(index+1).padStart(2,'0')+' / '+String(steps.length).padStart(2,'0');
 $('canvas').setAttribute('aria-label',st.description);
 $('inspect-title').textContent=st.title;$('inspect-description').textContent=st.description;
 $('stack').replaceChildren(...st.stack.map(s=>make('span',s)));
 $('fields').replaceChildren(...st.fields.map(([key,value])=>{const row=make('div',undefined,'field');row.append(make('span',key),make('strong',value));return row;}));
 $('operations').replaceChildren(...st.operations.map(([title,detail])=>{const card=make('article',undefined,'card');card.append(make('h3',title),make('p',detail));return card;}));
 $('notes').replaceChildren(...selected.notes.map(([title,detail])=>{const d=make('details');d.append(make('summary',title),make('p',detail));return d;}));
 nav();
}
function place(value,updateScroll=false){
 const old=index;
 position=Math.min(limit(),Math.max(0,value));
 index=Math.floor(position);
 if(old!==index)render();
 $('scrub').value=position;
 if(updateScroll)window.scrollTo(0,Math.round(position*span));
 draw();
}
function layoutRail(){
 const top=document.querySelector('header').offsetHeight;
 document.documentElement.style.setProperty('--top',top+'px');
 $('rail').style.height='calc(100svh + '+Math.ceil(limit()*span)+'px)';
}
function choose(id,choice=0,at=0){
 closeLesson();mode=id;branch=choice;layer=labLayers[id]??2;position=Math.min(at,limit());index=Math.floor(position);
 $('scrub').max=limit();$('scrub').step=.002;
 $('concept-pop').hidden=true;hovered='';
 layoutRail();render();place(position,true);
}
const mapStages=[
 ['Incoming data link','Receive Ethernet, check FCS and remove framing',1],
 ['Validate datagram','Invalid checksum → discard branch',1],
 ['Find next-hop IP','Routing table: destination IP → outgoing interface and next-hop IP',2],
 ['Update IPv4 header','Decrease TTL and update the header checksum',3],
 ['Find next-hop MAC','ARP cache: next-hop IP → next-hop MAC',4],
 ['Compare against MTU','Fits → send · DF clear → fragment · DF set → report error',5],
 ['Outgoing data link','Queue and wrap each outgoing datagram or fragment in Ethernet',6]
];
$('router-map').onclick=()=>{
 const router=mode==='journey';
 $('map-title').textContent=router?'R1 · Router map':modes[mode].name+' · Stage map';
 $('map-description').textContent=router?'Follow the datagram through the router. Select a stage to jump there.':'Select a stage to jump there, inspect its fields, and open the explanation.';
 const entries=router?mapStages:current().steps.map((st,n)=>[st.title,st.description,n]);
 $('map-stages').replaceChildren(...entries.map(([name,hint,n])=>{
  const el=button(name,()=>{
   $('map-dialog').close();
   if(router)choose('journey',0,n);
   else{place(n,true);inspectStage($('router-map'));}
  });
  el.append(make('span',hint));return el;
 }));
 $('map-dialog').showModal();
};
for(const [id,name] of tabs)$('lab-list').append(button(name,()=>{$('lab-dialog').close();choose(id);}));
function travelStack(receiver){
 const nextLayer=mode==='encap'?Math.max(0,Math.min(6,layer+(receiver?1:-1))):(receiver?0:6);
 choose('encap',receiver?1:0,receiver?nextLayer:6-nextLayer);
}
$('down').onclick=()=>travelStack(false);
$('up').onclick=()=>travelStack(true);
$('reset').onclick=()=>place(0,true);
$('scrub').oninput=e=>place(Number(e.target.value),true);
$('scrub').onkeydown=e=>{
 if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();place(position+(e.key==='ArrowLeft'?-.12:.12),true);}
};
addEventListener('scroll',()=>{if(!drag)place(scrollY/span);},{passive:true});
addEventListener('resize',()=>{layoutRail();draw();});
let packetLocation=null;
const hitButtons=new Map();
const hitLayer=$('hit-layer');
function hotspot(key,label,id,x,y,width,height){
 if(!hitButtons.has(key)){
  const el=button(undefined,e=>openLesson(el.dataset.lesson,e.currentTarget),undefined,'path-hit');
  hitButtons.set(key,el);hitLayer.append(el);
 }
 const el=hitButtons.get(key);
 const visible=x+width/2>0&&x-width/2<canvas.clientWidth&&y+height/2>0&&y-height/2<canvas.clientHeight;
 el.hidden=!visible;el.dataset.lesson=id;el.setAttribute('aria-label',label);el.title=label;
 Object.assign(el.style,{left:(x-width/2)+'px',top:(y-height/2)+'px',width:width+'px',height:height+'px'});
}
canvas.onpointerdown=e=>{
 if(e.button!==0)return;
 const r=canvas.getBoundingClientRect();
 const near=packetLocation&&Math.hypot(e.clientX-r.left-packetLocation[0],e.clientY-r.top-packetLocation[1])<120;
 e.preventDefault();
 drag={x:e.clientX,y:e.clientY,p:position,axis:null,near,pointer:e.pointerId};
 canvas.setPointerCapture(e.pointerId);
};
canvas.onpointermove=e=>{
 if(drag?.pointer!==e.pointerId)return;
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(!drag.axis&&Math.hypot(dx,dy)>4)drag.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';
 if(!drag.axis)return;
 const delta=drag.axis==='y'?dy:dx;
 place(drag.p+delta/Math.max(105,canvas.clientWidth*.26));
};
canvas.onlostpointercapture=()=>{drag=null;};
canvas.onpointerup=()=>{
 const inspect=drag?.near&&!drag.axis;
 drag=null;
 if(inspect)inspectStage($('inspect-more'));
};
canvas.onpointercancel=()=>{drag=null;};
canvas.addEventListener('wheel',event=>{
 if(event.ctrlKey)return;
 event.preventDefault();
 const unit=event.deltaMode===1?16:event.deltaMode===2?canvas.clientHeight:1;
 place(position+event.deltaY*unit/span,true);
},{passive:false});
function line(a,b,color,width=1){
 ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function box(x,y,w,h,r,fill,stroke){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
}
function label(text,x,y,color='#aeaeae',size=11,align='center',maxWidth){
 ctx.textAlign=align;ctx.textBaseline='middle';ctx.font=size+'px Arial, sans-serif';ctx.fillStyle=color;if(maxWidth!==undefined)ctx.fillText(text,x,y,maxWidth);else ctx.fillText(text,x,y);
}
function tile(x,y,width,height,title,detail,active){
 box(x-width/2,y-height/2,width,height,5,active?'#303030':'#191919',active?'#909090':'#525252');
 const compact=width<120;
 label(title,x,y-Math.min(8,height*.22),active?'#f4f4f4':'#dedede',compact?12:15,'center',width-18);
 label(detail,x,y+Math.min(9,height*.24),'#b5b5b5',compact?10:12,'center',width-18);
}
function token(x,y,text,color='#5b5b5b',primary=false){
 ctx.font='600 13px Arial, sans-serif';const width=ctx.measureText(text).width+21;
 ctx.shadowBlur=primary?15:0;ctx.shadowColor='#464646';
 box(x-width/2,y-13,width,26,7,'#272727',color);
 ctx.shadowBlur=0;label(text,x,y,'#f3f3f3',12);
 if(primary){
  packetLocation=[x,y];

 }
}
function drawPath(points,color,width){
 ctx.beginPath();
 ctx.moveTo(...points[0]);
 for(const point of points.slice(1))ctx.lineTo(...point);
 ctx.strokeStyle=color;
 ctx.lineWidth=width;
 ctx.lineCap='round';
 ctx.lineJoin='round';
 ctx.stroke();
}
function silverRail(points){
 ctx.save();
 ctx.shadowBlur=10;ctx.shadowColor='#a9a9a968';
 drawPath(points,'#747474',5);
 ctx.shadowBlur=0;
 drawPath(points,'#cecece',1.6);
 ctx.restore();
}
function pointAlong(points,progress){
 const segments=points.slice(1).map((b,i)=>{
  const a=points[i];return {a,b,length:Math.hypot(b[0]-a[0],b[1]-a[1])};
 });
 let remaining=progress*segments.reduce((sum,segment)=>sum+segment.length,0);
 for(const {a,b,length} of segments){
  if(length&&remaining<=length)return [a[0]+(b[0]-a[0])*remaining/length,a[1]+(b[1]-a[1])*remaining/length];
  remaining-=length;
 }
 return points.at(-1);
}
function draw(){
 const w=canvas.clientWidth,h=canvas.clientHeight,dpr=devicePixelRatio||1;
 if(!w||!h)return;
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 packetLocation=null;
 for(const el of hitButtons.values())el.hidden=true;
 const st=currentStep(),fraction=position-index;
 const roof=Math.min(mode in labLayers?285:235,h*.45);
 const stageBottom=h-(w<620?63:85);
 const routed=mode==='journey'&&branch<5;
 const primary=st.paths[0];
 const pin=(x,y,active)=>{
  ctx.beginPath();ctx.arc(x,y,active?5:3,0,2*Math.PI);
  ctx.fillStyle=active?'#dedede':'#777';ctx.fill();
 };
 const grid=offset=>{
  ctx.fillStyle='#2b2b2b';
  for(let x=((offset%36)+36)%36;x<w;x+=36)
   for(let y=22;y<h;y+=36)ctx.fillRect(x,y,1,1);
 };
 const card=(key,name,detail,id,x,y,width,height,active)=>{
  tile(x,y,width,height,name,detail,active);
  hotspot(key,'Explain '+name,id,x,y,width,height);
 };
 if(mode==='encap'){
  grid(0);
  const laneX=Math.max(42,w*.22);
  const gap=Math.min(51,Math.max(21,(stageBottom-roof-14)/7));
  const startY=roof+gap/2;
  const width=Math.min(305,w-laneX-70);
  const x=laneX+45+width/2;
  const y=n=>startY+n*gap;
  const layerIndex=6-layer;
  const next=Math.max(0,Math.min(6,layerIndex+(branch?-1:1)));
  const lessonIds=['application','presentation','session','tcp','forward','datalink','physical'];
  drawPath([[laneX,y(0)],[laneX,y(6)]],'#5f5f5f',2);
  silverRail([[laneX,y(layerIndex)],[laneX,y(next)]]);
  [...layerNames].reverse().forEach((name,n)=>{
   const active=n===layerIndex;
   line([laneX,y(n)],[laneX+45,y(n)],active?'#9b9b9b':'#4f4f4f');
   pin(laneX,y(n),active);
   const stepTitle='L'+(7-n)+'  '+name;
   box(x-width/2,y(n)-Math.min(20,gap*.43),width,Math.min(40,gap*.86),5,active?'#333':'#171717',active?'#999':'#555');
   label(stepTitle,x,y(n),'#eee',14,'center',width-20);
   hotspot('osi-'+n,'Explain '+name,lessonIds[n],x,y(n),width,Math.min(40,gap*.86));
  });
  token(laneX,y(layerIndex)+(y(next)-y(layerIndex))*fraction,'PDU','#bcbcbc',true);
  return;
 }
 const opt=current();
 const chain=['A','I','V','F','H','N','M','O','R2','B'];
 const branches=[['V','Drop'],['M','Frag'],['Frag','O'],['M','ICMP']];
 const members=routed?[...chain,'Drop','Frag','ICMP']:[...opt.visible].sort((a,b)=>nodes[a][0]-nodes[b][0]);
 const columns=Math.min(members.length,w>=700?5:w>=350?4:3);
 const rows=Math.ceil(members.length/columns);
 const gutter=Math.min(35,w*.075);
 const slot=(w-2*gutter)/columns;
 const pitch=Math.min(118,Math.max(38,(stageBottom-roof)/rows));
 const height=Math.max(24,Math.min(49,pitch-23));
 const width=Math.min(166,slot-10);
 const rowGap=Math.min(20,Math.max(13,pitch-height-9));
 const startY=roof+Math.max(height+rowGap,((stageBottom-roof)-(rows-1)*pitch)/2);
 const points=new Map();
 for(const [i,n] of members.entries()){
  const row=Math.floor(i/columns),col=i%columns;
  const visualCol=row%2===0?col:columns-1-col;
  points.set(n,{row,col:visualCol,x:gutter+(visualCol+.5)*slot,y:startY+row*pitch});
 }
 const route=(from,to)=>{
  const source=points.get(from),target=points.get(to);
  const a=[source.x,source.y],b=[target.x,target.y];
  if(source.row===target.row)return [a,b];
  const useLeft=source.col+target.col<columns-1;
  const edge=useLeft?18:w-18;
  return [a,[edge,a[1]],[edge,b[1]],b];
 };
 grid(0);
 const links=routed?[...chain.slice(1).map((n,i)=>[chain[i],n]),...branches]:opt.links;
 for(const [from,to] of links)drawPath(route(from,to),'#525252',1.5);
 const motion=st.paths.map(path=>{
  const track=route(path.from,path.to);
  const progress=Math.max(0,(fraction-path.delay)/(1-path.delay));
  return {track,point:pointAlong(track,progress)};
 });
 for(const {track} of motion)silverRail(track);
 const tableDetails={F:'Routing table · DA → NA',N:'ARP table · NA → MAC',M:'MTU table · 1280 B'};
 for(const [n,{x,y}] of points){
  const active=st.paths.some(path=>path.from===n||path.to===n);
  const cardY=y-height/2-rowGap;
  line([x,y],[x,y-rowGap],active?'#aaa':'#626262',1);
  pin(x,y,active);
  const name=routed?rnodes[n][2]:(opt.names?.[n]??nodes[n][2]);
  const detail=routed?(tableDetails[n]??rnodes[n][3]):(opt.aliases[n]??nodes[n][3]);
  const lesson=routed?(n==='N'?'arp-cache':nodeLessons[n]):activeLesson();
  card('node-'+n,name,detail,lesson,x,cardY,width,height,active);
 }
 if(!primary){
  const {x,y}=points.values().next().value;
  silverRail([[Math.max(gutter,x-32),y],[Math.min(w-gutter,x+32),y]]);
  token(x,y,'PDU','#bcbcbc',true);
 }
 for(let i=motion.length-1;i>=0;i--){
  const {point}=motion[i];
  const [x,y]=point;
  ctx.save();
  ctx.shadowColor='#ddd';ctx.shadowBlur=10;
  ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);
  ctx.fillStyle=i===0?'#f2f2f2':'#b7b7b7';ctx.fill();
  ctx.restore();
  ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);
  ctx.fillStyle='#393939';ctx.fill();
  if(i===0)packetLocation=point;
 }
}
new ResizeObserver(draw).observe(canvas);
choose('journey');
