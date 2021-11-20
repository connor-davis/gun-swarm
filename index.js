let Gun = require("gun/gun");
require("gun/sea");

let gun = new Gun({ peers: [], axe: false });
let user = gun.user().recall({ sessionStorage: true });

let hyperswarm = require("hyperswarm-web");
let sodium = require("sodium-universal");
let { v4 } = require("uuid");
let { Subject } = require("rxjs");

let subject = new Subject();
let notifications = new Subject();
let connection = new Subject();

let swarmInstance = {
  sockets: {},
  receive: subject,
  notifications,
  connection,
};

console.log(
  "Welcome to the new LoneWolf Protocol! This protocol allows you to decentralize your messaging. You keep your data locally and you can optionally enable our relay peers to store it for you. Our relay peers are also decentralized!"
);

swarmInstance.initialize = (key = "global-swarm") => {
  let keyBuffer = Buffer.allocUnsafe(32);
  sodium.crypto_generichash(keyBuffer, Buffer.from(key));

  let swarm = hyperswarm({
    bootstrap: ["wss://chakrachain-verify.glitch.me/"],
  });

  console.log(`Joining swarm on key ${keyBuffer.toString("hex")}`);

  swarm.join(keyBuffer, { announce: true });

  console.log("Waiting for connections.");

  swarm.on("connection", (socket, details) => {
    console.log("New connection.");

    console.log(socket);
    console.log(details);

    console.log("Assigning id to connection.");

    socket.id = v4();
    swarmInstance.sockets[socket.id] = socket;

    connection.next(socket.id);

    socket.on("data", (data) => {
      gun._.on("in", JSON.parse(data.toString("utf8")));
    });

    gun._.on("out", (data) => socket.write(JSON.stringify(data)));

    socket.on("close", () => {
      delete swarmInstance.sockets[socket.id];
    });

    socket.on("error", () => {});
  });
};

swarmInstance.send = (data) => {
  for (let id in swarmInstance.sockets) {
    let socket = swarmInstance.sockets[id];

    socket.write(JSON.stringify(data));
  }
};

window.swarmInstance = swarmInstance;
global.swarmInstance = swarmInstance;

window.gun = gun;
global.gun = gun;

window.user = user;
global.user = user;
