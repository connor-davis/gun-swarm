let { Node } = require("@hyperswarm/dht-relay");
let ws = require("@hyperswarm/dht-relay/ws");
let crypto = require("hypercore-crypto");
let sodium = require("sodium-universal");

let io = new WebSocket(`ws://localhost:8080`);

let node = Node.fromTransport(ws, io);

let Gun = require("gun/gun");
require("gun/sea");

let gun = new Gun({ axe: false, peers: [] });
let user = gun.user().recall({ sessionStorage: true });

node.createServer({}, () => {
  console.log("Created server");
});

console.log.bind(console);

let keyPair = crypto.keyPair(crypto.data(Buffer.from("gunswarm-dht")));
let key = Buffer.from(keyPair.publicKey);

let socket = node.connect(key);

let keyBuffer = Buffer.allocUnsafe(32);
sodium.crypto_generichash(keyBuffer, Buffer.from("testtopic-gunswarm"));

socket.on("open", () => {
  console.log("Opened.");
});

socket.on("data", (packet) => {
  let buffer = Buffer.from(packet);

  console.log(buffer.toString("utf8"));

  let { type, data } = JSON.parse(buffer.toString("utf8"));

  if (type === "out" && data !== undefined) return gun.on("in", data);
});

gun.on("out", (data) => socket.write(JSON.stringify({ type: "out", data })));

socket.on("close", () => console.log("Closed."));
socket.on("finish", () => console.log("Finished."));

window.gun = gun;
global.gun = gun;

window.user = user;
global.user = user;
