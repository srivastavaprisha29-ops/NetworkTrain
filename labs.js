'use strict';
const layerNames=['Physical','Data Link','Network','Transport','Session','Presentation','Application'];
const layerData=[
 ['Bits','The physical interface sends frame bits as signals.','The receiving interface recovers bits from signals.',['Bits']],
 ['Ethernet frame','The link layer wraps the IP datagram with local MAC addresses and a trailer.','The link layer checks the frame and passes its IP payload upward.',['Ethernet','IPv4','Segment','Data','FCS']],
 ['IPv4 datagram','IP adds source and destination addresses and selects the next hop.','IP checks the destination and passes the payload to the protocol named in the IP header.',['IPv4','Segment','Data']],
 ['Transport segment','Transport adds ports to identify the sending and receiving applications.','Transport uses the destination port to deliver data to the receiving application.',['Transport','Data']],
 ['Session data','The session layer represents dialogue between the endpoints in the OSI model.','The session layer hands the received dialogue data upward.',['Session data']],
 ['Formatted data','The presentation layer represents data encoding or transformation.','The presentation layer interprets the representation used by the sender.',['Formatted data']],
 ['Application data','The sending application produces data for the receiving application.','The receiving application can now read the delivered data.',['Application data']]
];
const nodes={A:[.12,.48,'Host A','192.0.2.10'],R1:[.35,.48,'Router R1','192.0.2.1'],R2:[.65,.48,'Router R2','198.51.100.2'],B:[.88,.48,'Host B','203.0.113.20'],C:[.65,.82,'Host C','Local listener'],D:[.35,.82,'Host D','Local listener'],ALT:[.5,.17,'Router R3','Alternate path']};
const packet=['Ethernet','IPv4','Transport','Data','FCS'];
const step=(title,description,paths=[],operations=[],fields=[],stack=packet)=>({title,description,paths,operations,fields,stack});
const send=(from,to,label='IPv4',color='#5b5b5b',delay=0)=>({from,to,label,color,delay});
const direct=[
 step('Compare the destination with the local subnet','Host A and Host B are on 192.0.2.0/24. Host A resolves Host B’s MAC from Host B’s IP.',[],[['Next-hop IP','192.0.2.20']],[['Destination IP','192.0.2.20'],['Network prefix','192.0.2.0/24']],['IPv4','Transport','Data']),
 step('Send directly across the LAN','The IPv4 and Ethernet destination both identify Host B. There is no IP router on this path.',[send('A','B')],[['Direct delivery','A switch may forward the frame within the LAN.']],[['Source IP','192.0.2.10'],['Destination IP','192.0.2.20'],['Destination MAC','Host B'],['TTL','64']])
];
const modes={};
function lab(id,name,subtitle,options,notes){modes[id]={name,subtitle,options,notes};}
const option=(label,steps,visible=['A','R1','R2','B'],links=[['A','R1'],['R1','R2'],['R2','B']],aliases={})=>({label,steps,visible,links,aliases});
lab('journey','Packet journey','Follow an IPv4 datagram from sender to receiver and inspect the headers at each hop.',[
 option('Direct delivery',direct,['A','B'],[['A','B']],{B:'192.0.2.20'})
],[
 ['Why IP and MAC differ','IP identifies the endpoints of this datagram. Ethernet MAC addresses identify the local sender and next hop and are rebuilt at each router.'],
 ['Source, router and destination','The source creates the datagram. Each router forwards it toward the destination. The receiving host removes the IP header and delivers the payload upward.']
]);
lab('encap','Encapsulation','Move down the sending stack or up the receiving stack and see which headers are present.',[
 ...['Sender ↓','Receiver ↑'].map((label,side)=>option(label,Array.from({length:7},(_,i)=>{const n=side?i:6-i; const [kind,down,up,headers]=layerData[n];return step(layerNames[n]+' · '+kind,side?up:down,[],[[side?'Decapsulation':'Encapsulation',side?'Pass the payload toward the application.':'Prepare data for the layer below.']],[['OSI layer',n+1],['Data unit',kind]],headers);}),['A','B'],[['A','B']]))
],[['Payload nesting','Transport adds its header to data. IP encloses the transport unit. Ethernet encloses that IP datagram, then the physical interface sends bits.']]);
const lan=['A','R1','B','C','D'];const lanLinks=lan.slice(1).map(n=>['A',n]);const lanAlias={A:'192.0.2.10',R1:'192.0.2.1',B:'192.0.2.20',C:'192.0.2.30',D:'192.0.2.40'};
for(const [id,title,dest,targets,description] of [
 ['unicast','Unicast','192.0.2.20',['B'],'One addressed receiver gets the datagram.'],
 ['multi','Multicasting','224.0.0.9',['B','C'],'Group members B and C receive the update on the same LAN.'],
 ['broadcast','Broadcasting','255.255.255.255',['R1','B','C','D'],'All hosts on this local broadcast domain receive the frame.']
]){
 lab(id,title,description,[option('Local LAN',[
  step('Choose the destination',description,[],[['Destination','The address determines the delivery scope.']],[['Destination IPv4',dest]],['IPv4','Payload']),
  step('Transmit on the LAN',description,targets.map(n=>send('A',n,id==='multi'?'RIP v2':'IPv4')),targets.map(n=>[[n==='R1'?'Router ':'Host ']+n,'Receives the same transmission in this simulation window.']),[['Destination IPv4',dest],['Receivers',targets.join(', ')],['Ethernet destination',id==='broadcast'?'ff:ff:ff:ff:ff:ff':id==='multi'?'01:00:5e:00:00:09':'Host B MAC']],id==='multi'?['Ethernet','IPv4','UDP','RIP v2']:packet)
 ],lan,lanLinks,lanAlias)],[['Where it appears in the slides','RIPv1 uses broadcast for regular updates. RIPv2 can use multicast 224.0.0.9. ARP broadcasts at the Ethernet layer. A limited IP broadcast stays on the local network.']]);
}
lab('arp','ARP','Resolve an IPv4 next hop to a MAC address before transmitting the frame.',[
 ...['Cache miss · gateway','Cache hit','Direct delivery'].map((label,i)=>{const target=i===2?'B':'R1';const ip=i===2?'192.0.2.20':'192.0.2.1';
 const lookup=step('Look up '+ip,i===1?'The cached MAC can be used immediately.':'The cache has no usable mapping. Host A must ask on the LAN.',[],[['ARP cache',i===1?'Hit':'Miss']],[['Target IP',ip]],['IPv4 datagram waiting']);
 return option(label,[lookup,...(i===1?[]:[
 step('Broadcast the ARP request','Devices on this LAN see the request. Only the owner of the target IP replies in this example.',lan.slice(1).map(n=>send('A',n,'ARP request','#c7c7c7')),[['Sender','Host A includes its own IP and MAC.'],['Receivers','Check the target protocol address in parallel.']],[['Operation','1 · Request'],['Sender IP','192.0.2.10'],['Sender MAC','Host A MAC'],['Target IP',ip],['Target hardware address','Unknown, shown as zeros'],['Ethernet destination','ff:ff:ff:ff:ff:ff']],['Ethernet','ARP','FCS']),
 step('Return the ARP reply','The target replies to Host A, which saves the mapping in its cache.',[send(target,'A','ARP reply','#999999')],[['Cache','Install '+ip+' → '+target+' MAC.']],[['Operation','2 · Reply'],['Sender IP',ip],['Sender MAC',target+' MAC'],['Target IP','192.0.2.10'],['Ethernet destination','Host A MAC']],['Ethernet','ARP','FCS'])
 ]),step('Release the waiting datagram','Host A now has a MAC for the local next hop.',[send('A',target)],[['Frame destination',target+' MAC']],[['IPv4 destination',i===2?ip:'203.0.113.20'],['Ethernet destination',target+' MAC']])],lan,lanLinks,lanAlias);})
],[['ARP packet format','Hardware Type 1 means Ethernet. Protocol Type 0x0800 means IPv4. Address lengths are 6 and 4 bytes. Operation 1 is request and 2 is reply. Ethernet identifies ARP with EtherType 0x0806.'],['Where to resolve','Host to local host, host to gateway, router to next router, or final router to destination host. Every resolution applies to the outgoing local network.'],['Proxy ARP','A proxy router can answer for another IP using its own MAC, then forward traffic onward.']]);
const routes=[['203.0.113.128/26','R3','m2'],['203.0.113.128/25','R2','m1'],['0.0.0.0/0','R2','m1']];
const ipInt=ip=>ip.split('.').reduce((sum,part)=>sum*256+Number(part),0)>>>0;
const matches=(ip,cidr)=>{const [net,length]=cidr.split('/');return +length===0 || ipInt(ip)>>>(32-length)===ipInt(net)>>>(32-length);};
lab('forward','IP forwarding','Choose an address and compare every matching route. The longest matching prefix wins.',[
 ...['203.0.113.140','203.0.113.200','8.8.8.8'].map(ip=>{const results=routes.map(([prefix,via,port])=>({prefix,via,port,match:matches(ip,prefix)}));const best=results.find(route=>route.match);return option(ip,[
 step('Read the IPv4 destination','Each entry supplies its own prefix length. Apply its mask and compare the resulting network with that entry.',[send('A','R1')],results.map(r=>[r.prefix,r.match?'Match via '+r.via:'No match']),[['Destination IP',ip],...routes.map(([p,v,m])=>[p,v+' · '+m])]),
 step('Forward via '+best.via,'The winning prefix '+best.prefix+' selects '+best.port+'. The router resolves the selected next hop on that interface.',[send('R1',best.via==='R3'?'ALT':'R2')],[['Best match',best.prefix],['Ethernet','Use the next-hop MAC on '+best.port+'.']],[['Destination IP',ip],['Next hop',best.via],['Outgoing interface',best.port],['TTL','64 → 63']])
 ],['A','R1','R2','ALT'],[['A','R1'],['R1','R2'],['R1','ALT']]);})
],[['Forwarding entries','Network-specific entries represent a prefix. A host-specific entry uses /32. The default route /0 matches every IPv4 address and has the lowest specificity.'],['Classful examples','Without subnetting, class determines the default mask: A /8, B /16, C /24. With fixed-length subnetting, the local router can apply its known subnet mask. Classless forwarding stores a prefix length per entry.'],['Aggregation','Two contiguous, aligned /25 networks can be represented by one /24. A more specific exception still wins if both match.'],['Hierarchical routing','An ISP can advertise an aggregate externally and use more specific customer routes internally. The slides’ 120.14.64.0 block spans 16,384 addresses and can be divided into four /20 blocks.']]);
const switchingNotes=[['Delay formulas','Transmission = L/R. Propagation = distance/speed. Add queueing and processing where specified. A store-and-forward packet across N equal links takes N × (transmission + propagation) before extra waiting.'],['Worked example','5,000 bits over a 1 Gbps link take 5 µs to transmit. With 10 µs propagation per link, two links take 30 µs and four links take 60 µs.'],['Circuit example','After setup, a bit stream can pipeline along the reserved circuit. Add setup, serialization of the message, and propagation across the path, plus teardown only if asked.']];
lab('switch','Switching','Choose how the network moves traffic, then watch setup and transmission on the topology.',[
 option('Datagram',[
 step('Send independent datagrams','Routers select the next hop from the destination IP. A route change can send a later packet along a different path.',[send('A','R1','Packet 1'),send('A','R1','Packet 2','#999999',.35)],[['Store and forward','Receive the full frame before transmitting it on the next link.']]),
 step('Forwarding paths diverge','Illustrative routing change sends the two datagrams toward different next hops.',[send('R1','R2','Packet 1'),send('R1','ALT','Packet 2','#999999')],[['Possible outcome','Different arrival times and out-of-order delivery.']]),
 step('Both packets arrive','Host B receives separate datagrams. Its transport protocol may handle ordering.',[send('R2','B','Packet 1'),send('ALT','B','Packet 2','#999999')])
 ],['A','R1','R2','ALT','B'],[['A','R1'],['R1','R2'],['R2','B'],['R1','ALT'],['ALT','B']]),
 ...['Virtual circuit','Circuit switching'].map((label,i)=>option(label,[
 step('Set up the path','A setup request travels through the switches and a confirmation returns.',[send('A','R1','Setup'),send('R1','R2','Setup','#5b5b5b',.32),send('R2','B','Setup','#5b5b5b',.64)]),
 step('Confirm the path','The destination confirms that setup is complete.',[send('B','R2','Confirm'),send('R2','R1','Confirm','#5b5b5b',.32),send('R1','A','Confirm','#5b5b5b',.64)]),
 step(i?'Transmit the bit stream':'Forward using VC identifiers',i?'Resources are reserved. Bits can be present on several links as the stream advances.':'All packets follow the established path. A switch maps incoming interface and VC identifier to an outgoing pair.',[send('A','R1',i?'Bits':'VC 7'),send('R1','R2',i?'Bits':'VC 12','#999999',i?.12:.32),send('R2','B',i?'Bits':'VC 5','#999999',i?.24:.64)],[['Forwarding state',i?'Reserved circuit':'Local VC identifiers']],[['Path','A → R1 → R2 → B']],[i?'Bit stream':'VC header','Payload']),
 step('Release state','When the connection closes, the switches release the circuit or virtual-circuit state.',[send('A','R1','Release'),send('R1','R2','Release','#5b5b5b',.32),send('R2','B','Release','#5b5b5b',.64)])
 ]))
],switchingNotes);
const routerNet=['R1','R2','ALT','B'];const routerLinks=[['R1','R2'],['R1','ALT'],['R2','B'],['ALT','B']];
const ripFields=version=>[['Transport','UDP destination port 520'],['RIP command','2 · Response'],['Version',version],['Address family','2 · IPv4'],['Destination network','203.0.113.0'],...(version===2?[['Subnet mask','255.255.255.0'],['Route tag','0 in this example'],['Next hop','0.0.0.0 · use sender']]:[]),['Metric','2 hops']];
const ospf=(title,desc,from,to,type,fields=[],ops=[])=>step(title,desc,[send(from,to,title.split(' · ')[0],'#999999')],ops,[['OSPF Version','2'],['OSPF Packet Type',type],['Area ID','0.0.0.0'],['IP protocol','89'],...fields],['IPv4','OSPF header · 24 B','OSPF body']);
lab('route','Routing protocols','See the control packets that build routing tables. Choose a protocol or a failure scenario.',[
 ...[1,2].map(i=>option('RIPv'+i,[
 step('Send a RIP request','A newly started router can request routes from a neighbor.',[send('R1','R2','Request')],[['RIP command','1 · Request']],[['Transport','UDP 520'],['RIP version',i]],['IPv4','UDP','RIP']),
 step('Exchange distance vectors','Each router advertises its current distances. R1 evaluates the offers arriving from two neighbors.',[send('R2','R1','Response'),send('ALT','R1','Response','#999999')],[['Via R2','1 + 2 = 3 hops'],['Via R3','1 + 4 = 5 hops']],ripFields(i),['IPv4','UDP','RIP']),
 step('Install the best route','The distance-vector update adds local link cost to each neighbor’s advertised cost and chooses the minimum.',[],[['Bellman–Ford update','min(3, 5) = 3 via R2.']],[['Metric','3 hops'],['Next hop','R2'],['Regular updates',i===1?'Broadcast':'Multicast 224.0.0.9']],['Routing table'])
 ],routerNet,routerLinks)),
 option('RIP failure',[
 step('A route becomes unreachable','R2 detects the failure and marks the route metric 16. A triggered update can notify neighbors without waiting for the regular timer.',[send('R2','R1','Metric 16','#c7c7c7')],[['Route poisoning','16 means unreachable.'],['Next hop','R1 invalidates its route through R2 unless it finds a valid alternative.']],[['Metric','16'],['Update','Triggered']],['IPv4','UDP','RIP']),
 step('Prevent a two-router loop','A route learned from a neighbor is either omitted in updates back to that neighbor (split horizon) or explicitly advertised back as 16 (poison reverse).',[send('R1','R2','Poison reverse','#c7c7c7')],[['Count to infinity','Stale neighbor advertisements can otherwise cause repeated metric increases.']],[['Metric','16'],['Direction','Back toward learned next hop']],['IPv4','UDP','RIP']),
 step('Expire and collect stale routes','For a route that receives no updates, expiration starts at the last accepted update. After expiration it remains in the table temporarily with metric 16.',[],[['Periodic','One per router, roughly every 30 seconds.'],['Expiration','180 seconds per valid route in the slide model.'],['Garbage collection','120 seconds per expired route in the slide model.']],[['Worked example','20 entries, 5 silent for 200 s'],['Timers running','1 + 15 + 5 = 21'],['Garbage time left','120 − (200 − 180) = 100 s']],['Routing table'])
 ],routerNet,routerLinks),
 option('OSPF exchange',[
 ospf('Hello · Discover neighbors','R1 and R2 check area settings and discover each other. Seeing its own ID in the neighbor list confirms two-way communication.','R1','R2',1,[['Body','Network mask, Hello and Dead intervals, options, priority, DR, BDR, neighbor IDs']]),
 ospf('DBD · Compare inventories','R2 shows the LSA headers in its database. R1 identifies a missing or older advertisement.','R2','R1',2,[['Body','Interface MTU, options, I/M/MS flags, DD sequence, LSA headers']]),
 ospf('LSR · Ask for one LSA','R1 names the advertisement it wants.','R1','R2',3,[['Request key','LS Type + Link State ID + Advertising Router']]),
 ospf('LSU · Send the full advertisement','R2 sends the complete Router LSA from the slide example. The link records are inside that one LSA.','R2','R1',4,[['Number of LSAs','1'],['LSA type','1 · Router'],['Advertising router','10.24.7.9'],['Number of links','3'],['Link 1','10.24.8.10 · interface 1 · cost 4'],['Link 2','10.24.9.11 · interface 2 · cost 6'],['Link 3','10.24.7.0/24 · stub · cost 2']]),
 ospf('LSAck · Confirm receipt','The acknowledgment carries the LSA header so R2 knows which advertisement arrived.','R1','R2',5,[['Body','One or more LSA headers']]),
 step('Run Dijkstra on the link-state database','Each router computes paths from itself after installing topology information. In this separate topology, R1 settles R2 at 2 before R3 at 4.',[],[['Via R2','2 + 3 = 5'],['Via R3','4 + 4 = 8'],['Routing table','Choose R2 as the next hop.']],[['Shortest path','R1 → R2 → B'],['Total cost','5']],['Link-state database','Shortest path tree'])
 ],routerNet,routerLinks,{R1:'SPF root',R2:'Cost 2 from R1',ALT:'Cost 4 from R1',B:'Cost 3 via R2 / 4 via R3'}),
 option('OSPF LSA types',[
 ...[
 [1,'Router','Every router advertises its links within the area.','Link ID, Link Data, Link Type, base cost, optional TOS metrics.'],
 [2,'Network','The designated router describes the shared transit network.','Mask 255.255.255.0; attached router IDs 10.24.7.14, 10.24.7.15, 10.24.7.16.'],
 [3,'Summary to network','An area border router advertises a destination in another area.','Destination network, mask and advertised metric.'],
 [4,'Summary to ASBR','An area border router advertises reachability to an AS boundary router in another area.','ASBR router ID and cost to reach that router.'],
 [5,'External','The ASBR advertises an external destination into OSPF.','External network, mask, external metric type, forwarding address and route tag.']
 ].map(([type,name,desc,body])=>ospf('LSU · '+name+' LSA',desc,'R2','R1',4,[['Number of LSAs','1'],['LSA type',type],['LSA body',body]]))
 ],routerNet,routerLinks),
 option('BGP exchange',[
 step('Open a BGP session','BGP peers use an established TCP connection. OPEN negotiates session parameters.',[send('R1','R2','OPEN')],[['Session','eBGP across autonomous systems, iBGP within one AS.']],[['Transport','TCP port 179'],['BGP type','1 · OPEN']],['IPv4','TCP','BGP']),
 step('Confirm with KEEPALIVE','The peer confirms the OPEN and periodic keepalives can keep the session active.',[send('R2','R1','KEEPALIVE')],[],[['BGP type','4 · KEEPALIVE']],['IPv4','TCP','BGP']),
 step('Advertise or withdraw prefixes','The UPDATE conveys reachable prefixes and their path attributes or withdraws previously announced routes.',[send('R2','R1','UPDATE')],[['AS_PATH','R1 checks whether its own AS appears in the path.'],['Policy','A router can prefer a route based on configured policy.']],[['BGP type','2 · UPDATE'],['NLRI','203.0.113.0/24'],['AS_PATH','64502 64503'],['NEXT_HOP','R2'],['ORIGIN','IGP in this example']],['IPv4','TCP','BGP']),
 step('Report a session error','A BGP NOTIFICATION reports an error and closes the session.',[send('R1','R2','NOTIFICATION','#c7c7c7')],[],[['BGP type','3 · NOTIFICATION']],['IPv4','TCP','BGP'])
 ],routerNet,routerLinks,{R1:'AS 64501',R2:'AS 64502',ALT:'Alternate peer',B:'External prefix'})
],[
 ['Distance vector vs link state vs path vector','RIP learns distances and next hops from neighbors. OSPF floods LSAs and runs Dijkstra on its database. BGP exchanges prefixes and path attributes across peering sessions.'],
 ['RIPv1 vs RIPv2','RIPv1 sends classful advertisements without subnet masks. RIPv2 includes masks, route tag and next hop, supports authentication, and can multicast. Reachable RIP metrics are 1–15.'],
 ['OSPF areas and link types','Area 0 is the backbone. An ABR connects areas. An ASBR injects external routes. A point-to-point link joins two routers, a transit network joins multiple routers, a stub network attaches through one router, and a virtual link creates a logical backbone connection.'],
 ['OSPF header fields','Version, Type, Packet Length, Router ID, Area ID, Checksum, Authentication Type and Authentication. A separate 20-byte LSA header carries age, options, LS type, Link State ID, Advertising Router, sequence, checksum and length.'],
 ['Router LSA link records','Point-to-point uses neighbor router ID and local interface information. Transit uses the DR interface and local interface IP. Stub uses network address and mask. The slides’ Router LSA contains two point-to-point records and one stub record.'],
 ['BGP autonomous systems and attributes','Stub AS has one external connection. Multihomed AS has multiple external connections and carries its own traffic. A transit AS also carries traffic between other ASes. ORIGIN, AS_PATH and NEXT_HOP are well-known mandatory attributes. Optional attributes may be transitive or nontransitive.']
]);
const labLayers={physical:0,datalink:1,tcp:3,udp:3,session:4,presentation:5,application:6,dhcp:6,dns:6,http:6};
const layerHomes=['physical','datalink','journey','tcp','session','presentation','application'];
const endpoints=['A','B'];
const endpointLink=[['A','B']];
function exchange(label,steps,aliases={},visible=endpoints,links=endpointLink,names={}){
 return {...option(label,steps,visible,links,aliases),names:{A:'Client',B:'Server',...names}};
}
function wire(title,description,from,to,message,headers,fields=[],operations=[]){
 return step(title,description,[send(from,to,message,'#929292')],operations,fields,headers);
}
const tcpHeaders=['Ethernet','IPv4 · 6','TCP segment'];
const udpHeaders=['Ethernet','IPv4 · 17','UDP datagram'];
const tcp=(title,desc,from,to,flag,seq,ack,data=0)=>wire(title,desc,from,to,flag,tcpHeaders,[
 ['Sequence',seq],['Acknowledgment',ack??'ACK flag clear'],['Data',data+' bytes'],['Flags',flag],
 ['Sequence space used',data+Number(/SYN|FIN/.test(flag))],
 ['Port pair',from==='A'?'51514 → 80':'80 → 51514']
]);
lab('tcp','TCP','Follow sequence numbers, acknowledgments and the connection in both directions.',[
 exchange('Handshake',[
 tcp('Client opens the connection','SYN advertises the client’s initial sequence number. SYN uses one sequence number.','A','B','SYN',1000),
 tcp('Server acknowledges and synchronizes','The server acknowledges 1001 and supplies its own initial sequence number.','B','A','SYN + ACK',7000,1001),
 tcp('Client confirms','ACK 7001 completes the ordinary handshake. This pure ACK consumes no sequence space.','A','B','ACK',1001,7001)
 ],{A:'Active open · 51514',B:'Passive open · 80'}),
 exchange('Data and ACKs',[
 tcp('Send the first 1,000 bytes','The segment begins at byte 1001 and covers through byte 2000.','A','B','ACK',1001,7001,1000),
 tcp('Send the next 1,000 bytes','This segment starts at byte 2001. The receiving process will see an ordered stream.','A','B','ACK',2001,7001,1000),
 tcp('Acknowledge cumulatively and send data','The server acknowledges both segments with ACK 3001 while sending 2000 bytes in the other direction.','B','A','ACK',7001,3001,2000),
 tcp('Acknowledge server data','The next server byte expected is 9001. Each direction has an independent sequence space.','A','B','ACK',3001,9001)
 ]),
 exchange('Loss and recovery',[
 tcp('A segment is lost','Sequence 1001 does not reach the receiver.','A','B','ACK',1001,7001,1000),
 tcp('Later bytes expose the gap','The next segment begins at 2001. The receiver still expects byte 1001.','A','B','ACK',2001,7001,1000),
 tcp('Receiver reports the gap','The cumulative ACK stays at 1001 until the missing range arrives.','B','A','ACK',7001,1001),
 tcp('Retransmit the missing range','A retransmission timeout or an applicable loss signal causes TCP to resend the range.','A','B','ACK',1001,7001,1000),
 tcp('Advance the cumulative ACK','Assuming the receiver buffered the later bytes, the next expected byte is now 3001.','B','A','ACK',7001,3001)
 ]),
 exchange('Close and half-close',[
 tcp('Client closes its sending direction','FIN consumes one sequence number. The other direction can still send.','A','B','FIN + ACK',3001,9001),
 tcp('Server acknowledges the FIN','The server can keep sending after acknowledging the client’s FIN.','B','A','ACK',9001,3002),
 tcp('Server closes independently','The server sends FIN when its application finishes sending. It may combine this FIN with the previous ACK when ready.','B','A','FIN + ACK',9001,3002),
 tcp('Client acknowledges the final FIN','In this ordinary active close, the client enters TIME-WAIT after acknowledging the server’s FIN.','A','B','ACK',3002,9002)
 ])
],[['Connection states','An active open starts with SYN. A passive opener listens. A normal close uses FIN and ACK, a half-close leaves one direction open, and RST rejects or aborts a connection.']]);
lab('udp','UDP','Read datagram fields, then trace delivery to the destination process.',[
 exchange('Request and reply',[
 wire('Encapsulate a request','UDP adds its eight-byte header. There is no transport handshake.','A','B','UDP request',udpHeaders,[['Source port','52100'],['Destination port','53'],['UDP length','28 bytes'],['Payload','20 bytes']]),
 wire('Demultiplex and respond','The receiver uses the destination port to find the DNS socket. The reply swaps the ports in this exchange.','B','A','UDP reply',udpHeaders,[['Source port','53'],['Destination port','52100']])
 ],{A:'Ephemeral port 52100',B:'DNS · UDP 53'}),
 exchange('Decode the slide header',[
 wire('Read four 16-bit fields','Split the hexadecimal header at four-digit boundaries.','A','B','UDP header',udpHeaders,[['Hex','CB84 000D 001C …'],['Source','0xCB84 = 52100'],['Destination','0x000D = 13'],['Length','0x001C = 28 bytes'],['Data length','28 − 8 = 20 bytes'],['Likely direction','Client → server'],['Destination service','Daytime · UDP 13'],['Checksum','Fourth 16-bit word']])
 ]),
 exchange('Checksum and drop',[
 wire('Calculate the checksum','The checksum covers the UDP header, data and IP pseudoheader. The pseudoheader is included in the calculation only.','A','B','UDP datagram',udpHeaders,[['Pseudoheader','Source IP, destination IP, protocol 17, UDP length'],['Arithmetic','16-bit one’s-complement addition; pad odd data for calculation']]),
 step('Handle an invalid datagram','The receiver discards a datagram with a bad checksum. UDP itself neither sends an ACK nor retransmits it.',[],[['Recovery','An application can implement timeout and retry if needed.']],[['Delivery','Discard']],udpHeaders)
 ])
],[['Best fits','Independent short queries, applications implementing their own reliability, and latency-sensitive traffic can use UDP. UDP supplies neither a flow window nor ordered retransmission.']]);
lab('application','Application layer','See how application processes use sockets and serve one or several clients.',[
 exchange('Iterative server',[
 wire('First client requests service','The server receives the first request and services it before moving on to the next queued request.','A','B','Request A',['IP','UDP','Application request']),
 wire('Second request waits','With iterative service, requests are processed one at a time. A second request can wait in a queue.','C','B','Request C',['IP','UDP','Application request']),
 wire('Complete the first request','The server returns the first result and then can handle the next request.','B','A','Response A',['IP','UDP','Application response']),
 wire('Complete the second request','The same service can now reply to the second client.','B','C','Response C',['IP','UDP','Application response'])
 ],{B:'One request at a time'},['A','B','C'],[['A','B'],['C','B']],{C:'Client C'}),
 exchange('Concurrent server',[
 step('Accept clients concurrently','A listening server delegates distinct connections to workers or handles them through concurrent I/O.',[send('A','B','Connection A','#989898'),send('C','B','Connection C','#777777')],[['Socket API','Listen and accept on the server; connect on the client.']],[['Server port','Same listening port'],['Connections','Different remote IP/port pairs']],['IP','TCP','Application']),
 step('Respond independently','One client can receive a response while the other connection is still in progress.',[send('B','A','Response A','#989898'),send('B','C','Response C','#777777')],[],[],['IP','TCP','Application'])
 ],{B:'Multiple connections'},['A','B','C'],[['A','B'],['C','B']],{C:'Client C'})
],[['Client–server roles','The client initiates a service request. The server makes a service available. A socket API is the interface to the transport services.']]);
const dhcpWire=(name,desc,from,to,fields)=>wire(name,desc,from,to,name,['Ethernet','IPv4','UDP','DHCP'],fields);
const dora=[
 dhcpWire('DHCPDISCOVER','The unconfigured client broadcasts to find available servers.','A','B',[['IPv4','0.0.0.0 → 255.255.255.255'],['UDP','68 → 67'],['xid','0x13a9c420']]),
 dhcpWire('DHCPOFFER','The server proposes an address, lease and configuration options.','B','A',[['UDP','67 → 68'],['yiaddr','192.0.2.40'],['Lease','8 hours']]),
 dhcpWire('DHCPREQUEST','During initial selection the client broadcasts its choice so other servers can withdraw their offers.','A','B',[['Requested address','192.0.2.40'],['Server identifier','192.0.2.2']]),
 dhcpWire('DHCPACK','The client accepts the lease and configuration upon a valid acknowledgment. Server replies may be broadcast or unicast depending on state and flags.','B','A',[['Address','192.0.2.40/24'],['Default gateway','192.0.2.1'],['DNS','192.0.2.53'],['Lease','8 hours']])
];
lab('dhcp','DHCP','Follow address acquisition, relay and lease transitions.',[
 exchange('DORA',dora,{A:'Initially 0.0.0.0',B:'UDP 67'}),
 exchange('Across a relay',[
 dhcpWire('Discover locally','The client’s limited broadcast stays on its local network. A relay hears it.','A','R1',[['UDP','68 → 67'],['Destination','255.255.255.255']]),
 dhcpWire('Relay to remote server','The relay fills giaddr to identify the client subnet and forwards to the server.','R1','B',[['giaddr','192.0.2.1'],['UDP','67 → 67']]),
 dhcpWire('Return offer to relay','The server uses giaddr to return the offer to the relay.','B','R1',[['yiaddr','192.0.2.40'],['giaddr','192.0.2.1']]),
 dhcpWire('Deliver offer locally','The relay delivers the offer on the client’s network. The selected REQUEST and ACK follow the same relay relationship.','R1','A',[['UDP','67 → 68']])
 ],{},['A','R1','B'],[['A','R1'],['R1','B']],{R1:'DHCP relay'}),
 exchange('Renew, rebind or expire',[
 dhcpWire('Renew at T1','At the default 50% point, the bound client usually unicasts DHCPREQUEST to its original server.','A','B',[['State','RENEWING'],['T1','4 h for an 8 h lease']]),
 dhcpWire('Rebind at T2 if unanswered','At the default 87.5% point, the client broadcasts DHCPREQUEST to any available server.','A','B',[['State','REBINDING'],['T2','7 h for an 8 h lease']]),
 step('Lease expires if still unanswered','The client must stop using the address and restart initialization. A valid ACK before expiry can extend the lease.',[],[],[['State','INIT']],['DHCP lease state'])
 ])
],[['Configuration and message format','DHCP supplies address, mask, gateway and DNS. Reservations bind an address to a client, and pools allocate leases dynamically. Its BOOTP-derived layout carries op, hardware metadata, hops, xid, seconds, flags, ciaddr, yiaddr, siaddr, giaddr, chaddr, server name, boot filename and options.'],['Other transitions','NAK can force restart, DECLINE reports an address conflict, RELEASE returns a lease early, and INFORM requests options for a configured address. DHCP retransmits after timeout. TFTP can retrieve a separately named boot file.']]);
const dnsWire=(name,desc,from,to,fields)=>wire(name,desc,from,to,name,['IP','UDP or TCP · 53','DNS'],fields);
lab('dns','DNS','Follow referrals, cache hits and reverse lookup, then inspect the message.',[
 exchange('Resolve a name',[
 dnsWire('Client asks recursive resolver','The stub sets RD and asks for the IPv4 address of www.example.com. This resolver has no cached answer.','A','R1',[['QNAME','www.example.com.'],['QTYPE / class','A / IN'],['Flags','QR=0, RD=1']]),
 dnsWire('Ask a root server','The recursive resolver issues an iterative query. The root refers it to .com name servers.','R1','R2',[['Authority','NS for .com'],['Additional','Applicable glue addresses']]),
 dnsWire('Follow the root referral','The resolver asks a .com server and learns the authoritative servers for example.com.','R1','ALT',[['Authority','NS for example.com']]),
 dnsWire('Ask the authoritative server','The resolver requests the host record from the server authoritative for example.com.','R1','B',[['Question','www.example.com. IN A']]),
 dnsWire('Return the authoritative answer','The server returns an A record and a TTL. The resolver can cache it.','B','R1',[['Answer','203.0.113.20'],['TTL','300 s'],['Flags','AA=1 on this reply']]),
 dnsWire('Reply to the client','The recursive resolver returns the result to its client. The client can now connect to the destination.','R1','A',[['Answer','203.0.113.20'],['Flags','QR=1, RA=1']])
 ],{},['A','R1','R2','ALT','B'],[['A','R1'],['R1','R2'],['R1','ALT'],['R1','B']],{A:'Stub client',R1:'Resolver',R2:'Root',ALT:'.com TLD',B:'Authoritative'}),
 exchange('Cache and reverse DNS',[
 dnsWire('Ask for a cached address','The resolver can answer from a cached positive record while its TTL remains valid.','A','B',[['QTYPE','A'],['QNAME','www.example.com.']]),
 dnsWire('Return cached result','A cached response need not contact the authority again. The remaining TTL is returned.','B','A',[['Answer','203.0.113.20'],['Remaining TTL','240 s']]),
 dnsWire('Ask for a reverse mapping','Reverse IPv4 octets and append in-addr.arpa, then query PTR.','A','B',[['QNAME','20.113.0.203.in-addr.arpa.'],['QTYPE','PTR']]),
 dnsWire('Return a name if configured','A PTR result depends on the reverse zone’s records. It is separately maintained from the forward mapping.','B','A',[['Example PTR','www.example.com.']])
 ],{},endpoints,endpointLink,{B:'Resolver'})
],[['Message and records','The 12-byte header has ID, flags and four counts. Questions carry QNAME, QTYPE and QCLASS. Resource records carry name, type, class, TTL, RDLENGTH and RDATA. A compression pointer uses leading bits 11 and a 14-bit message offset.'],['Transport','DNS uses port 53 over UDP and TCP. A truncated UDP response can lead to retry over TCP. Full zone transfers use TCP. The historical inverse-query opcode shown in the slides differs from modern PTR lookup.']]);
const http=(name,desc,from,to,message,fields)=>wire(name,desc,from,to,message,['IP','TCP','HTTP/1.1'],fields);
lab('http','HTTP','Follow request lines, response headers, connections, cookies and cache validation.',[
 exchange('Request a page',[
 http('Send a request','The browser sends a GET request on an established connection. The blank line ends the headers.','A','B','GET /index.html',[['Request line','GET /index.html HTTP/1.1'],['Host','example.com'],['Body','None in this request']]),
 http('Return a representation','The server replies with a status line, headers, blank line and the HTML body.','B','A','200 OK',[['Status line','HTTP/1.1 200 OK'],['Content-Type','text/html'],['Body','HTML referring to an image']]),
 http('Reuse the connection for an image','HTTP/1.1 is persistent by default when message framing and connection settings permit reuse.','A','B','GET /image.png',[['Host','example.com'],['Connection','Same TCP connection']]),
 http('Return the image','The server can handle a further request over the connection before closing it.','B','A','200 OK',[['Content-Type','image/png']])
 ],{B:'Origin server · TCP 80'}),
 exchange('Cookies and conditional requests',[
 http('Server sets a cookie','HTTP requests are independent. A server can give the browser an identifier to return in later requests.','B','A','Set-Cookie',[['Set-Cookie','session=example; Path=/'],['Status','200 OK']]),
 http('Browser sends cookie and validator','The browser sends the stored cookie when rules permit and asks whether the cached representation changed.','A','B','Conditional GET',[['Cookie','session=example'],['If-None-Match','"v1"']]),
 http('Validate the cached copy','If the validator matches, the server returns 304 and no response body. The client can reuse its cached representation.','B','A','304 Not Modified',[['Status','304'],['Response body','None']])
 ]),
 exchange('Nonpersistent connections',[
 http('Fetch the base page','In this classic nonpersistent model, the client opens a TCP connection for the request, then the connection closes after the response.','A','B','GET page',[['Connection','TCP connection 1'],['Illustrative latency','1 RTT handshake + 1 RTT request/first response + transmission']]),
 http('Fetch the embedded object','The client opens a separate TCP connection for the embedded object. This example is sequential.','A','B','GET image',[['Connection','TCP connection 2'],['Setup overhead','Another TCP handshake']])
 ])
],[['Message syntax and methods','Request line: method, target, version. Response line: version, status, reason phrase in HTTP/1.1. Methods include GET, HEAD, POST, PUT, DELETE, OPTIONS, TRACE and CONNECT. Status families span 1xx to 5xx.'],['Web documents and caches','Static documents are stored representations, dynamic documents are generated at request time, and active documents run code at the client. A cache or proxy can serve fresh stored responses and revalidate stale responses.']]);

modes.application.options.push(exchange('Open a website',[
 wire('1 · Get network settings','A new client uses DHCP to obtain an address, default gateway and DNS resolver. Move to the DHCP lab for all four DORA messages.','A','R1','DHCP',['Ethernet','IPv4','UDP · 67/68','DHCP'],[['Client address after ACK','192.0.2.40'],['Resolver','192.0.2.53']]),
 wire('2 · Resolve the web server name','The client asks its configured DNS resolver for an address. The answer tells it which IP to connect to.','A','R2','DNS A query',['IP','UDP · 53','DNS'],[['Name','www.example.com.'],['Answer IP','203.0.113.20']]),
 wire('3 · Open a TCP connection','The TCP handshake synchronizes sequence numbers between the client and the web server. The TCP lab shows SYN, SYN+ACK, and ACK separately.','A','B','TCP handshake',['IP','TCP'],[['Destination','203.0.113.20:80']]),
 wire('4 · Send an HTTP request','The browser writes a GET request to the established TCP byte stream. This example uses HTTP/1.1 without TLS.','A','B','HTTP GET',['IP','TCP','HTTP/1.1'],[['Request','GET / HTTP/1.1'],['Host','www.example.com']]),
 wire('5 · Read the response','The server replies with a status, headers and the representation. The browser can issue more requests on the reusable connection.','B','A','200 OK',['IP','TCP','HTTP/1.1'],[['Content-Type','text/html']])
 ],{A:'192.0.2.40 after DHCP',R1:'UDP 67',R2:'192.0.2.53',B:'203.0.113.20'},['A','R1','R2','B'],[['A','R1'],['A','R2'],['A','B']],{R1:'DHCP server',R2:'DNS resolver',B:'Web server'}));
const layerExamples=[
 {id:'physical',layer:0,title:'Physical layer',intro:'Trace bits from the transmitter to the receiver and compare line encodings.',topics:[
 ['NRZI and AMI','Encoding bits as signals',[
 ['Choose the starting level','A line-code waveform needs an initial level. The examples use the course convention where NRZI changes level for a 1.','Bits','10110',[['Starting level','Low'],['Convention','1 → transition; 0 → hold']]],
 ['Encode with NRZI','Beginning low, toggle at each 1 and hold at each 0.','NRZI','10110',[['Bit value','1   0   1   1   0'],['Level after bit begins','H   H   L   H   H']]],
 ['Compare bipolar AMI','A zero has zero voltage. Consecutive marks (ones) alternate between positive and negative.','AMI','10110',[['First mark','Positive by assumption'],['Signal levels','+   0   −   +   0']]],
 ['Decode at the receiver','Sample each interval. Compare adjacent levels for NRZI and distinguish zero from either pulse polarity for AMI.','Recovered bits','10110',[['On the receiving side','Use the same coding convention and initial reference']]]]],
 ['Serialization and propagation','How bits travel along a link',[
 ['Serialize the frame','The transmitter puts bits onto the medium at the link rate.','Bit stream','1000 bits',[['Rate','1 Mb/s'],['Serialization time','1000 / 1,000,000 = 1 ms']]],
 ['Propagate along the link','The first bit begins travelling while later bits enter the link.','Signal','100 km',[['Speed','2 × 10⁸ m/s'],['Propagation time','100,000 / (2 × 10⁸) = 0.5 ms']]],
 ['Recover the frame bits','The last bit arrives one propagation delay after it enters the link.','Recovered bits','Last bit',[['First bit arrival','0.5 ms'],['Last bit arrival','1.5 ms']]]]]
 ]},
 {id:'datalink',layer:1,title:'Data Link layer',intro:'Inspect Ethernet and follow frame recovery in the ARQ examples.',topics:[
 ['Ethernet forwarding','Frame delivery on one LAN',[
 ['Build an Ethernet frame','The local sender wraps the IP datagram in a frame. The destination MAC identifies the receiver on this hop.','Ethernet','IPv4 payload',[['Source MAC','Host A'],['Destination MAC','Host B'],['EtherType','0x0800'],['Trailer','FCS']]],
 ['Learn or look up the MAC','The switch learns the source MAC on the ingress port. It forwards a known unicast on the matching port, or floods unknown unicast within the VLAN except through the ingress port.','Switch lookup','Destination MAC',[['Learns from','Source address'],['Forwards using','Destination address']]],
 ['Verify and unwrap','The receiver checks frame integrity, then uses EtherType to pass the payload to IPv4.','IPv4 payload','After decapsulation',[['Checked','FCS'],['Delivered to','Network layer']]]]],
 ['Stop-and-Wait ARQ','One outstanding frame',[
 ['Send frame 0','The sender transmits one numbered frame and waits.','Frame 0','Waiting for ACK',[['Window','1 outstanding frame']]],
 ['ACK is lost','The receiver accepted the frame but its acknowledgment did not arrive at the sender.','ACK 0','Lost',[['Receiver state','Expects frame 1'],['Sender state','Still waiting for ACK 0']]],
 ['Timeout and retransmit','The sender transmits frame 0 again. The receiver recognizes the duplicate, avoids delivering it twice, and repeats the ACK.','Frame 0','Retransmission',[['Reason','ACK timeout'],['Duplicate handling','Acknowledge without redelivery']]]]],
 ['Sliding-window ARQ','Go-Back-N and Selective Repeat',[
 ['Send within a window','Several frames can be outstanding, keeping the link busy during propagation. Assume frames 0–3 are sent and frame 1 is lost.','Frames 0–3','Frame 1 lost',[['Window W','4'],['Gap','Frame 1']]],
 ['Go-Back-N recovery','In basic Go-Back-N, the receiver discards subsequent out-of-order frames. The sender retransmits the missing frame and all later outstanding frames.','Frames 1–3','Go-Back-N',[['Receiver window','1'],['Retransmission','1, 2, 3']]],
 ['Selective Repeat recovery','In the alternative Selective Repeat exchange, the receiver buffers later frames within its window. Only the missing frame needs retransmission here.','Frame 1','Selective Repeat',[['Buffered','2 and 3'],['Retransmission','1']]]]]
 ]},
 {id:'session',layer:4,title:'Session layer',intro:'Follow a dialogue across opening, synchronization and recovery.',topics:[
 ['Dialogue lifecycle','Manage an ongoing exchange',[
 ['Establish a dialogue','The peers establish context for an ongoing exchange, such as a session identifier and agreed rules for resuming work.','Open dialogue','S-42',[['Session','S-42'],['Model','Illustrative OSI dialogue']]],
 ['Exchange and checkpoint','The application confirms that a unit of work is complete and records that progress in session state.','Checkpoint','Chunk 3 committed',[['Last committed unit','3']]],
 ['Resume after interruption','After reconnecting, the peers use the saved checkpoint and continue at chunk 4. Whether resumption is possible depends on the protocol.','Resume','Chunk 4',[['Recovery','Continue after committed unit 3']]],
 ['Close dialogue','When the exchange finishes, peers release the context associated with this session.','Close dialogue','S-42',[['Session state','Closed']]]]]
 ]},
 {id:'presentation',layer:5,title:'Presentation layer',intro:'See how two endpoints agree on how to represent, transform and interpret data.',topics:[
 ['Encode and decode','Represent structured data as bytes',[
 ['Choose the representation','The endpoints agree on a data format and character encoding. JSON describes the structure and UTF-8 describes the bytes representing its text.','JSON + UTF-8','Sender',[['Format','JSON'],['Character encoding','UTF-8']]],
 ['Serialize to bytes','The sender turns its structured value into a JSON text representation and encodes it.','UTF-8 bytes','On the wire',[['Example value','{"name":"Prisha"}']]],
 ['Decode and parse','The receiver decodes the bytes as UTF-8 and parses the structure back into a value.','Parsed value','Receiver',[['Meaning','A name field containing Prisha']]]]],
 ['Compress and protect','Apply and reverse transformations',[
 ['Compress the representation','When compression is agreed, the sender may encode the representation more compactly before transmission.','gzip','Compression',[['Purpose','Reduce size'],['Receiver needs','Matching decompressor']]],
 ['Protect in transit','A secure channel can encrypt the resulting bytes. The concrete protocol stack determines where these functions are implemented.','Encrypted data','On the wire',[['Purpose','Confidentiality']]],
 ['Reverse the transformations','The receiver decrypts through the secure channel, decompresses if applicable, then interprets the representation.','Decoded data','Receiver',[['Order','Decrypt → decompress → interpret']]]]]
 ]}
];
for(const item of layerExamples){
 lab(item.id,item.title,item.intro,item.topics.map(([name,,rows])=>{
  const steps=rows.map(([title,description,message,detail,fields],i)=>{
   const reverse=(item.id==='datalink'&&name==='Stop-and-Wait ARQ'&&i===1);
   return wire(title,description,reverse?'B':'A',reverse?'A':'B',message,[item.title,detail],fields);
  });
  return exchange(name,steps,{A:'Sending endpoint',B:'Receiving endpoint'});
 }),[['Model and practice',item.id==='session'||item.id==='presentation'?'These are OSI functions. In typical TCP/IP stacks the equivalent functionality is implemented in application protocols or libraries.':'Walk the stages in order and inspect the fields at each step.']]);
}

const tabs=[['journey','Packet journey'],['encap','OSI encapsulation'],['unicast','Unicast'],['multi','Multicast'],['broadcast','Broadcast'],['arp','ARP'],['forward','Forwarding'],['switch','Switching'],['route','Routing protocols'],['tcp','TCP'],['udp','UDP'],['application','Application layer'],['dhcp','DHCP'],['dns','DNS'],['http','HTTP'],['physical','Physical layer'],['datalink','Data Link layer'],['session','Session layer'],['presentation','Presentation layer']];
const rnodes={
 A:[0,0,'Host A','192.0.2.10'],I:[580,0,'Ingress','Ethernet / PHY'],V:[790,0,'Validate IPv4','Length · version · checksum'],
 F:[1025,0,'Next-hop lookup','Destination → prefix → interface'],H:[1250,0,'Update IPv4','TTL · header checksum'],
 N:[1475,0,'Resolve next-hop MAC','ARP cache / request / reply'],M:[1725,0,'MTU decision','Outgoing link MTU'],
 O:[1975,0,'Egress','Queue · Ethernet · PHY'],R2:[2510,0,'Router R2','Next hop · 198.51.100.2'],B:[3040,0,'Host B','203.0.113.20'],
 Drop:[790,135,'Discard','Failed IPv4 validation'],Frag:[1830,135,'Fragment','IPv4 · DF = 0'],ICMP:[1715,-125,'ICMP error','Fragmentation needed']
};
const detailFields=[
 ['IP source','192.0.2.10'],['IP destination','203.0.113.20']
];
const detailStep=(title,desc,from,to,ops,fields=[],stack=packet,label='IPv4')=>step(title,desc,[send(from,to,label)],ops,[...detailFields,...fields],stack);
function routerJourney(variant){
 const size=variant===1||variant===2?'1,500':'1,000';
 const ttl=variant===4?'1':'64';
 const datagram=['IPv4 header','Transport','Data'];
 const stages=[
  detailStep('Leave the sender','Host A compares the target with its /24 subnet, resolves the gateway, then sends an Ethernet frame addressed to R1.','A','I',[['Encapsulation','Ethernet wraps the IPv4 datagram.'],['On the wire','Earlier bits propagate while later bits enter the link.']],[['Next-hop IP','192.0.2.1'],['Destination MAC','R1 ingress'],['TTL',ttl],['IPv4 length',size+' B']]),
  detailStep('Receive and validate','The ingress interface receives the frame. Ethernet checks the FCS and delivers the IPv4 datagram for validation.','I','V',[['Data link','Check FCS and strip the incoming Ethernet framing.'],['IPv4 validation','Check version, header length, total length, and checksum.']],[['Input port','R1 ingress'],['Header checksum',variant===3?'Invalid':'Valid']],datagram)
 ];
 if(variant===3)return [...stages,detailStep('Discard invalid datagram','The corrupt IPv4 header fails validation and the router discards the datagram.','V','Drop',[['Disposition','Discard before forwarding lookup.']], [['Reason','Invalid IPv4 header checksum']],datagram,'DROP')];
 stages.push(
  detailStep('Find the next-hop IP','The forwarding plane matches the destination IP to the most specific route. That route supplies the outgoing interface and the next-hop IP.','V','F',[['Routing table','203.0.113.0/24 → R2 via eth1'],['Control plane','Routing protocols can update the table independently of this packet.']],[['Matching prefix','203.0.113.0/24'],['Next-hop IP','198.51.100.2'],['Outgoing interface','eth1']],datagram),
  detailStep('Update TTL and checksum','R1 reduces the IPv4 TTL and updates the IPv4 header checksum.','F','H',[['Forwarding header','The endpoint IPs are retained.'],['TTL check','A packet with expired TTL is discarded.']],[['TTL',variant===4?'1 → 0':'64 → 63'],['IPv4 checksum','Updated after TTL changes']],datagram)
 );
 if(variant===4)return [...stages,detailStep('Return ICMP Time Exceeded','R1 discards the expired packet and sends an ICMP Time Exceeded response toward Host A.','H','A',[['Original packet','Discarded at R1.'],['New control message','ICMP Type 11, Code 0.']],[['Original TTL','0'],['ICMP destination','192.0.2.10']],['IPv4','ICMP','Quoted packet'],'ICMP')];
 stages.push(
  detailStep('Resolve the next-hop MAC','On eth1, R1 uses the next-hop IP as its ARP lookup key. This route already has a usable cached mapping.','H','N',[['ARP cache','198.51.100.2 → R2 ingress MAC.'],['Cache miss alternative','Broadcast a request and wait for a unicast reply.']],[['ARP target IP','198.51.100.2'],['New destination MAC','R2 ingress']],datagram),
  detailStep('Compare packet size with the MTU','The outgoing link has a 1,280-byte MTU. Choose an outcome to see what happens when the packet fits or exceeds it.','N','M',[['MTU table','eth1 → 1,280 bytes'],['IPv4 flags',variant===2?'DF = 1 · fragmentation prohibited':'DF = 0 · fragmentation permitted']],[['Datagram length',size+' bytes'],['Outgoing MTU','1,280 bytes']],datagram)
 );
 if(variant===2)return [...stages,detailStep('Return ICMP Fragmentation Needed','The datagram exceeds the link MTU and DF is set. R1 drops it and sends a new ICMP message toward Host A.','M','ICMP',[['Original packet','Cannot use this outgoing link.'],['ICMP Type 3 · Code 4','Report the next-hop MTU to the sender.']],[['Next-hop MTU','1280'],['ICMP destination','192.0.2.10']],['IPv4','ICMP','Quoted packet'],'ICMP'),detailStep('ICMP travels to the sender','Host A learns that it needs a smaller IP datagram for this path.','ICMP','A',[],[['Next-hop MTU','1280']],['IPv4','ICMP'],'ICMP')];
 if(variant===1)stages.push(detailStep('Split the datagram into fragments','With a 20-byte IPv4 header, floor((1280−20)/8)×8 = 1256 payload bytes fit in the first fragment. The remaining 224 bytes form the second fragment.','M','Frag',[['Fragment 1','1276 bytes total · offset 0 · MF 1'],['Fragment 2','244 bytes total · offset 157 · MF 0']],[['Identification','Same in both headers'],['Offset units','8 bytes']],['IPv4 header','Fragment payload'],'FRAG'));
 stages.push(
  detailStep('Queue and build the outgoing frame','The router sends traffic through the selected output interface. Ethernet adds new per-link source and destination addresses.',''+(variant===1?'Frag':'M'),'O',[['Output queue','Wait if the interface is busy.'],['New frame','Source MAC = R1 eth1. Destination MAC = R2 ingress.']],[['TTL','63'],['Outgoing interface','eth1']]),
  detailStep('Cross the transit network','The frame leaves R1 and travels to R2. End-to-end IP addresses are carried inside the new Ethernet frame.','O','R2',[['Link transmission','The sender serializes the frame.'],['Signal propagation','Bits travel across the transit link.']],[['Source MAC','R1 eth1'],['Destination MAC','R2 ingress'],['TTL','63']]),
  detailStep('Deliver to Host B',variant===1?'R2 forwards the fragments to the directly connected subnet. Host B reassembles them before handing the payload to transport.':'R2 forwards directly to Host B. Host B receives the frame, removes the headers, and passes the payload upward.','R2','B',[['Direct delivery','R2 resolves Host B’s MAC using Host B’s IP.'],['Receiver',variant===1?'Reassemble using Identification, offsets and MF.':'Deliver the IP payload to the indicated transport protocol.']],[['Destination MAC','Host B'],['TTL','62']])
 );
 if(variant===1)for(const st of stages.slice(-3)){const path=st.paths[0];path.label='Frag 1';st.paths.push(send(path.from,path.to,'Frag 2','#a7a7a7',.21));}
 return stages;
}
const mainBranches=['Fits MTU','Fragment · DF 0','Drop · DF 1','Invalid header','Expired TTL'];
modes.journey.options=[
 ...mainBranches.map((label,i)=>option(label,routerJourney(i))),
 option('Same subnet',direct,['A','B'],[['A','B']],{B:'192.0.2.20'})
];
modes.journey.subtitle='Drag the packet to follow the forwarding path.';
