# NetworkTrain

An interactive networking lab for following packets and signals through the seven OSI layers. Select a layer and scenario, then drag the packet, scroll, or jump to a stage. The packet inspector shows the fields for that stage, and **Definitions** links networking terms to worked explanations.

[Open NetworkTrain](https://networktrain.srivastavaprisha29.chatgpt.site/) (ChatGPT sign-in required).

## Explore the labs

| Layer | Examples |
| --- | --- |
| Physical | NRZI, bipolar AMI, serialization and propagation |
| Data Link | Ethernet framing and switching, Stop-and-Wait, Go-Back-N and Selective Repeat |
| Network | IPv4 forwarding, ARP, fragmentation, switching and routing protocols |
| Transport | TCP setup, data, loss recovery and close, plus UDP headers and checksums |
| Session | Dialogue setup, checkpoints and resumption |
| Presentation | Serialization, encoding, compression and encryption |
| Application | Client/server behavior, DHCP, DNS, HTTP, and the Open a website walkthrough |

Start with **L7 Application → Open a website** to connect DHCP, DNS, TCP and HTTP in one exchange. For router internals, open **L3 Network → Router map**.

## Run locally

Serve the repository root with Python or another static file server. No package installation is required.

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000/>.

## Source layout

| File | Responsibility |
| --- | --- |
| `index.html` | Interface markup and asset loading |
| `styles.css` | Grayscale theme and responsive layouts |
| `labs.js` | OSI layers, scenario data, packet exchanges and topology |
| `lessons.js` | Worked examples, explanations and glossary terms |
| `app.js` | Canvas rendering, stage navigation, inspector and glossary UI |

The browser loads the deferred scripts in the order shown in `index.html`. For the hosted site, copy these five files to the static deployment directory before publishing.

```sh
mkdir -p dist
cp index.html styles.css labs.js lessons.js app.js dist/
```
