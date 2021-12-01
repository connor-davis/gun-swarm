let DHT = require("@hyperswarm/dht");
let { Relay } = require("@hyperswarm/dht-relay");
let ws = require("@hyperswarm/dht-relay/ws");
let { WebSocketServer } = require("ws");
let crypto = require("hypercore-crypto");
let { v4 } = require("uuid");

let dht = new DHT();
let wss = new WebSocketServer({ port: 8080 });

(async () => {
  await dht.ready();

  console.log("DHT is ready.");

  let keyPair = crypto.keyPair(crypto.data(Buffer.from("gunswarm-dht")));

  let server = dht.createServer();

  server.on("connection", function (socket) {
    console.log("Connected.");

    socket.dhtID = v4();

    socket.write(JSON.stringify({ type: "dhtID", data: socket.dhtID }));

    dht.on("out", (packet) => {
      let { from, data } = JSON.parse(packet);
      if (from !== socket.dhtID) {
        console.log(data);
        return socket.write(JSON.stringify({ type: "out", data }));
      } else return socket.write(JSON.stringify({ success: "data-out" }));
    });

    socket.on("open", () => {
      console.log("Opened.", `ID: ${socket.dhtID}`);

      socket.on("data", (packet) => {
        try {
          let { type, data } = JSON.parse(packet.toString());

          if (type === "out" && data !== undefined)
            return dht.emit(
              "out",
              JSON.stringify({
                from: socket.dhtID,
                data: data,
              })
            );
        } catch (error) {}
      });
    });

    socket.on("close", () => console.log("Closed."));
  });

  await server.listen(keyPair);

  console.log("DHT server listening.");

  console.log(server.address().publicKey.toString("hex"));

  let relay = Relay.fromTransport(ws, dht, wss);

  console.log(relay.address());
})();
