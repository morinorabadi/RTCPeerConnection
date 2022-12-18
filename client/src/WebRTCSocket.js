export default class WebRTCSocket
{
    constructor(){
        let dataChannel = null
        
        let localPeerConnection = null

        this.createConnection = async ({ localDescription, chanelLabel, emit, onMessege}) => {
    
            localPeerConnection = new RTCPeerConnection({});
            

            try {
            // set server localDescription to coonect tihs clinet peer in room
            await localPeerConnection.setRemoteDescription(new RTCSessionDescription(localDescription));
            
            function onWebRTCMessage(event){
                const { data } = event
                onMessege(JSON.parse(data))
            }
            // adding event liseners for data chanel
            function onDataChannel({ channel }) {
                if (channel.label !== chanelLabel) {
                return;
                }

                dataChannel = channel;
                dataChannel.onmessage = (event) => { onWebRTCMessage(event) }
            }

            localPeerConnection.addEventListener('datachannel', onDataChannel);
    
            // answer 
            const answer = await localPeerConnection.createAnswer();
            await localPeerConnection.setLocalDescription(answer);
            emit("peer-connection-answer", {answer})
    
            } catch (error) {
            localPeerConnection.close();
            throw error;
            }
        }

        this.sendData = (data) => {
            if (dataChannel){ dataChannel.send(data) }
        }

        this.close = () => {
            console.log("\n\nclose event is fire\n\n");
            if (dataChannel) {
                dataChannel.removeEventListener('message', (event) => { onWebRTCMessage(event) });
            }
            emit("peer-connection-delete")
            if (localPeerConnection){
                localPeerConnection.close()
            }
        }
    }
}