import io from 'socket.io-client'
import WebRTCSocket from './WebRTCSocket'


// create connection
const socket = io("http://localhost:3000")


// data will convert to json format in WebRTCSocket
function onUpdateData(data){
    console.log(data);
}

// global emit function
function emit(event, data){
    socket.emit(event, data)
}

let peerConnection = null
// handele events
socket.on('connect', () => {
    console.log("socket connected");

    // emit some dumy event "load-over"
    emit("load-over")

    // handele requset from server to create webrtc peer connection
    socket.on("create-webrtc", option => {
        peerConnection = new WebRTCSocket()
        peerConnection.createConnection({
            onMessege :  onUpdateData,
            emit : emit,
            ...option
        })

    // start game loop after peer-to-peer connection is craeted
    socket.on("room-start-game",(response) => {
        console.log("ok");
        setInterval(() => {
            peerConnection.sendData(JSON.stringify({ i : response.gameId ,at : Date.now() }))
        }, 1000)
    })
    // to send out data to server we can use 
    })
})

