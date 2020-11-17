const net = require("net");
const { argv } = require("process");
const PORT = 3000;

const server = net.createServer((socket) => {
  console.log("Welcome !");
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
