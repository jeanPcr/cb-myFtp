const net = require("net");

const client = new net.Socket();

client.connect(3000, "127.0.0.1", () => {
  console.log("connected");
});
