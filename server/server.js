const net = require("net");
const fs = require("fs");
const path = require("path");

//config
const PORT = process.argv[2];
const DB = JSON.parse(fs.readFileSync("./config/db.json"));

let connectedUsers = [];

if (!PORT) {
  console.log("Usage: node server.js <port>");
  process.exit();
}

const verifyUser = (input, username) => {
  let user = false;
  DB.users.forEach((dbUser) => {
    if (
      dbUser.username === username &&
      dbUser.password === input.toLowerCase()
    ) {
      user = dbUser;
    }
  });
  return user;
};

//Connexion
const server = net.createServer((socket) => {
  let currentUser = {};
  let connected = false;
  let currentDir = "./";
  socket.write("220");
  socket.on("data", (data) => {
    let CMD = data.toString().split(" ")[0];
    let input = data.toString().split(" ")[1];
    switch (CMD) {
      case "USER":
        if (input) {
          currentUser.username = input;
          socket.write(`331`);
        } else {
          socket.write(`501 myFTP: Usage: USER <username>`);
        }
        break;

      case "PASS":
        if (connected || connectedUsers.includes(currentUser.username)) {
          socket.write(`214 myFTP: you already have been connected.`);
          break;
        }
        if (!currentUser.username) {
          socket.write(`332`);
          break;
        }
        if (input) {
          let user = verifyUser(input, currentUser.username);
          if (user) {
            socket.write(`230 ${JSON.stringify(user)}`);
            connectedUsers.push(user.username);
            console.log(`${user.username} has been connected`);
            console.log(`Connected users: ${connectedUsers.length}`);
            connected = true;
          } else socket.write(`430`);
        } else {
          socket.write(`430`);
        }
        break;
      case "LIST":
        if (!connected) {
          socket.write(`530 myFTP: You are not connected.`);
          break;
        }
        socket.write(
          `212 myFTP: *****  LIST DIRECTORY : ${currentDir}  *****\n\r`
        );

        let dir = fs.readdir(currentDir, (err, data) => {
          if (err) console.log(err);
          data.forEach((file) => {
            if (file !== "server.js") {
              let stat = fs.statSync(path.join(currentDir, file));
              if (stat.isDirectory()) {
                console.log(`212 ${file}`);
                socket.write(`212 ${file}`);
              } else {
                let fileSize = convertBytes(stat.size);
                socket.write(`212 ${file} ${fileSize}`);
                console.log(`212 ${file} ${fileSize}`);
              }
            }
          });
        });

        break;
      case "CWD":
        if (!connected) {
          socket.write(`530 myFTP: You are not connected.`);
          break;
        }
        if (!input) {
          socket.write(`501 myFTP: Usage: CWD <directory>`);
          break;
        }
        if (currentDir === "./" && input.startsWith("..")) {
          socket.write(`450 myFTP: No such directory found.`);
          break;
        }
        if (
          path.join(currentDir, input).startsWith("..") ||
          !fs.existsSync(path.join(currentDir, input))
        ) {
          socket.write(`450 myFTP: No such directory found.`);
          break;
        }
        if (fs.statSync(path.join(currentDir, input)).isDirectory()) {
          currentDir = path.join(currentDir, input);
        } else {
          socket.write(`501 myFTP: ${input} is not a directory.`);
        }

        break;

      case "RETR":
        if (!connected) {
          socket.write(`530 myFTP: You are not connected.`);
          break;
        }
        if (!input) {
          socket.write(`501 myFTP: Usage: RETR <filename>`);
          break;
        }
        socket.write(`125 myFTP: transfert server -> client...`);
        let file = path.join(currentDir, input);
        console.log(path.join(currentDir, input));
        let read = fs.createReadStream(file);
        read.on("data", (data) => {
          socket.write(`150 ${input} ${data}`);
        });

        socket.write("226 myFTP: Transfert complete");

        break;
      case "STOR":
        if (!connected) {
          socket.write(`530 myFTP: You are not connected.`);
          break;
        }
        if (!input) {
          socket.write(`501 myFTP: Usage: STOR <filename>`);
          break;
        }
        break;
      case "PWD":
        if (!connected) {
          socket.write(`530 myFTP: You are not connected.`);
          break;
        }
        socket.write(`212 myFTP: ${currentDir}`);

        break;

      case "HELP":
        let COMMANDS = !currentUser.username
          ? "USER <username>: check if the user exist\n\r" +
            "PASS <password>: authenticate the user with a password\n\r"
          : "LIST: list the current directory of the server\n\r" +
            "CWD <directory>: change the current directory of the server\n\r" +
            "RETR <filename>: transfer a copy of the file FILE from the server to the client\n\r" +
            "STOR <filename>: transfer a copy of the file FILE from the client to the server\n\r" +
            "PWD: display the name of the current directory of the server\n\r" +
            "HELP: send helpful information to the client\n\r" +
            "QUIT: close the connection and stop the program\n\r";
        socket.write(`214 myFTP: Availabled comands :\n\r\n\r${COMMANDS}`);
        break;

      case "QUIT":
        socket.end("221 myFTP: Goodbye");
        break;

      default:
        socket.write(`502 myFTP: Error: ${CMD} is not a command.`);
        break;
    }
  });

  socket.on("end", (err) => {
    if (err) console.log(err);
    connectedUsers.splice(connectedUsers.indexOf(currentUser.username), 1);
    console.log(`${currentUser.username} has been disconnected`);
    console.log(`Connected users: ${connectedUsers.length}`);
    currentUser = {};
    connected = false;
  });
  socket.on("error", (err) => {
    console.error(err.message);
  });
});

server.on("error", (err) => {
  console.log(err);
});

const convertBytes = function (bytes) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  if (bytes == 0) {
    return "n/a";
  }

  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));

  if (i == 0) {
    return bytes + " " + sizes[i];
  }

  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
};

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
