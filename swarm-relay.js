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

    socket.on("open", () => {
      console.log("Opened.");

      console.log(socket.dhtID);

      dht.on("out", (data) =>
        JSON.parse(data).from !== socket.dhtID
          ? socket.write(data)
          : socket.write(JSON.stringify({ success: "data-out" }))
      );

      socket.on("data", (packet) => {
        try {
          let { type, data } = JSON.parse(packet.toString());

          switch (type) {
            case "out":
              dht.emit(
                "out",
                JSON.stringify({
                  from: socket.dhtID,
                  data: data,
                })
              );

              break;

            default:
              socket.write(
                JSON.stringify({
                  error: "Please adhere to the protocol packet specification.",
                })
              );

              break;
          }
        } catch (error) {}
      });
    });

    socket.on("close", () => console.log("Closed."));
  });

  await server.listen(keyPair);

  console.log("DHT server listening.");

  console.log(server.address().publicKey.toString("hex"));

  let relay = Relay.fromTransport(ws, dht, wss);
})();
