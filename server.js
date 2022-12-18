const WebRtcConnection = require('./WebRtcConnection')

// therd package
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const { log } = require('console')


// set up express
const app = express()

// create server
const server = http.createServer(app)

// setup socket io
const io = new Server(server,{ cors : { origin : '*' } })

// map to save peerConnections 
const peerConnections = new Map()
const gameInfo = new Map()

// create RTCPeerConnection specify to this socket
const createRTCConnection = async (socketId) => {
    // create WebRtcConnection
    const connection = new WebRtcConnection("players-info", updateGameInfo)
    await connection.doOffer()

    // add the Connection to the Map.
    peerConnections.set(socketId, connection)

    // send out RTCPeerConnection info to socket
    emit(socketId, "create-webrtc", {
        localDescription : connection.localDescription,
        chanelLabel : connection.chanelLabel
    })
}

// global emit function
const emit = (to,event,response) => {
    io.to(to).emit(event, response)
}

// we generete some simple ID to decrese bites send from server to client
let lastplayerGameId = 0
const createGameId = () => {
    lastplayerGameId++
    gameInfo.set(lastplayerGameId, {i : lastplayerGameId, r : Math.random(), t : Date.now()})
    return lastplayerGameId
}

// update info 
const updateGameInfo = ({data}) => {
    // data come from clinetPeerConnection
    const newInfo = JSON.parse(data)
    const lastInfo = gameInfo.get(newInfo.i)
    if (newInfo.t > lastInfo.t) { gameInfo.set(newInfo.i,newInfo) }
}

let isGameStart = false
function startGame(){ 
    isGameStart = true
    const loopID = setInterval(() => {
        console.log("send out data");
        const data = JSON.stringify(Array.from(gameInfo.values()))
        peerConnections.forEach( (peer , _ ) => {
            peer.sendData(data)
        });
    }, 1000)
}


io.on('connection', (socket) => { 

    // wait until some event in this case "load-over" to create peerConnections
    socket.on("load-over",() => { createRTCConnection(socket.id) })

    // after we emit "create-webrtc" we wait for answer from client
    socket.on("peer-connection-answer", async ({answer}) => {
        // search for server side peer
        const connection = peerConnections.get(socket.id)
        if ( connection ){
            try {
                // start game
                if (!isGameStart){ startGame() }
                // if exsit we "applyAnswer" receive from client
                await connection.applyAnswer(answer);
                // if request reach here everything is good
                // and we created peer-to-peer connection between client and server
                // send out some event to client do somthing after connection created
                const id = createGameId()
                emit(socket.id,"room-start-game", {status : 200, gameId : id} )
            } catch (error) {
                console.log(error);
            }
        }
    })
})

// setup server
server.listen(3000, () => { console.log("server is active") })
