const Lobby = require("./models/lobby");
const User = require("./models/user");

const app = require("express")();
const server = require("http").createServer(app);
const io = require('socket.io')(server, { cors: { origin: ["http://localhost:8080"] } });

io.on('connection', socket => {
    console.log("socket connected");
    socket.emit("connected", "socket is connected");

    // on create lobby event
    socket.on("create-lobby", async ({ username, category }) => {
        const lobby = await Lobby.create(category);
        console.log(lobby);
        const lobbyId = lobby.id.toString();
        // create the socket room
        socket.join(lobbyId);
        // add host to list of players
        const host = await User.create(username, 0, lobbyId);
        console.log(host);
        io.to(lobbyId).emit("lobby-created", { host });
    });

    // on join lobby event
    socket.on("request-join-lobby", async ({ username, lobbyId }) => {
        try {
            // check is room exists for given lobby id
            if (io.sockets.adapter.rooms.has(lobbyId)) {
                // check if room is full (10 or more connections)
                if (io.sockets.adapter.rooms.get(lobbyId).size < 10) {
                    const existingPlayers = await User.findByGame(lobbyId);
                    const newPlayer = await User.create(username, 0, lobbyId);
                    // send back entry permission to join room
                    socket.emit("entry-permission", { lobbyId, existingPlayers, newPlayer });
                    // join the socket room
                    socket.join(lobbyId);
                    // add new player to local state of each player
                    io.to(lobbyId).emit("add-new-player", { newPlayer });
                    // herald the new player to other players
                    socket.to(lobbyId).emit("herald-new-player", { newPlayer });
                } else {
                    socket.emit("lobby-is-full");
                }
            } else {
                socket.emit("lobby-id-invalid");
            }
        } catch (err) {
            console.log(`Error joining lobby: ${err}`);
        }
    });

    // host loads game
    socket.on("host-load-game", async ({ lobbyId, currentPlayer }) => {
        try {
            const players = await User.findByGame(lobbyId);
            io.to(lobbyId.toString()).emit("change-view");
            io.to(lobbyId.toString()).emit("start-game", ({ lobbyData, players, currentPlayer }));
        } catch (err) {
            console.log(`Error loading game: ${err}`);
        }
    });


    // player leaves the lobby
    socket.on("leave-lobby", ({ lobbyId, player }) => {
        try {
            if (io.sockets.adapter.rooms.get(lobbyId).size === 1) {
                // TODO: delete lobby from table
            }
            socket.to(lobbyId).emit("player-left", { player });
            socket.leave(lobbyId);
        } catch (err) {
            console.log(`Error leaving lobby: ${err}`);
        }
    });

    // socket gets disconnected
    socket.on("disconnect", () => {
        console.log("socket disconnected");
    });
});

module.exports = io;

//Questions API

//npm install axios

//const axios = require('axios');

// async function getInformation() {
//   const amount = req.body.amount //any multiple up to 50
//   const category = req.body.category //must be a number from 1-32 - number corresponds to correct category
//   const difficulty = req.body.difficulty //must be easy, medium or hard
//   const type = req.body.type //must be boolean or multiple
//   try {
//     const response = await axios.get('https://opentdb.com/api.php?amount={amount}&category={category}&difficulty={difficulty}&type=multiple');
//     console.log(response);
//      return response
//   } catch (error) {
//     console.error(error);
//   }
// }

