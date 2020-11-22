const fs = require("fs");
const net = require("net");
const readline = require("readline");
//config
const HOST = process.argv[2];
const PORT = process.argv[3];

if (!HOST || !PORT) {
  console.log("Usage: node client.js <host> <port>");
  process.exit();
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: ">",
});

const client = new net.Socket();

client.connect(PORT, HOST, () => {});

client.on("data", (data) => {
  let code = data.toString().split(" ")[0];
  let message = data.toString().split(`${code} `)[1];
  switch (code) {
    case "150":
      let filename = data.toString().split(` `)[1];
      let file = data.toString().split(`${code} ${filename} `)[1];
      let writer = fs.createWriteStream(`./DATA/${filename}`);
      writer.write(file);
      break;
    case "214":
      console.log(message);
      break;
    case "212":
      console.log(message);
      break;
    case "220":
      console.log(`Connected to ${HOST} at port ${PORT}`);
      break;
    case "221":
      rl.close();
      console.log(message);
      break;
    case "230":
      //console.log(`Successfully connected.`);
      let user = JSON.parse(message);
      console.log(`Welcome ${user.username} !`);
      break;
    case "331":
      console.log(`Password required.`);
      break;
    case "332":
      console.log(`You must log in.`);
      break;
    case "430":
      console.log(`Username or password incorrect.`);
      break;
    default:
      console.log(message);
      break;
  }
});
client.on("end", () => {
  console.log("Disconnection...");
  rl.close();
});

client.on("error", (err) => {
  if (err) {
    console.log("500 Internal ERROR");
  }
  client.end();
  rl.close();
});

rl.on("line", (input) => {
  client.write(input);
});

rl.on("SIGINT", () => {
  rl.question("Are you sure you want to exit? y/n \n\r", (answer) => {
    if (answer.match(/^y(es)?$/i)) {
      client.end();
      rl.close();
    } else if (answer.match(/^n(o)?$/i)) rl.resume();
  });
});
