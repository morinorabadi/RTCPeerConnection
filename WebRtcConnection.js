const RTCPeerConnection = require('wrtc').RTCPeerConnection;

const TIME_TO_CONNECTED = 10000;
const TIME_TO_HOST_CANDIDATES = 3000;  // NOTE(mroberts): Too long.
const TIME_TO_RECONNECTED = 10000;


class WebRtcConnection
{
  constructor(chanelLabel, onMessege){

    const peerConnection = new RTCPeerConnection({});

    // crete datachanel
    const dataChannel = peerConnection.createDataChannel(chanelLabel);

    // masege event come from client
    function onMessagereceived(event) { onMessege(event) }
    dataChannel.onmessage = (event) => { onMessagereceived(event) }

    // this object create and timer will be active
    // and offer send to client 
    let connectionTimer = setTimeout(() => {
      if (peerConnection.iceConnectionState !== 'connected'
        && peerConnection.iceConnectionState !== 'completed') {
        this.close();
      }
    }, TIME_TO_CONNECTED);

    let reconnectionTimer = null;

    const onIceConnectionStateChange = () => {
      if (peerConnection.iceConnectionState === 'connected'
        || peerConnection.iceConnectionState === 'completed') {
        if (connectionTimer) {
          clearTimeout(connectionTimer);
          connectionTimer = null;
        }
        clearTimeout(reconnectionTimer);
        reconnectionTimer = null;
      } else if (peerConnection.iceConnectionState === 'disconnected'
        || peerConnection.iceConnectionState === 'failed') {
        if (!connectionTimer && !reconnectionTimer) {
          const self = this;
          reconnectionTimer = setTimeout(() => {
            self.close();
          }, TIME_TO_RECONNECTED );
        }
      }
    };
    peerConnection.addEventListener('iceconnectionstatechange', onIceConnectionStateChange);

    this.sendData = (data) => {
      if ( dataChannel && dataChannel.readyState == 'open' ) {
        dataChannel.send(data)
      }
    }

    /**
     * doOffer
     */
    this.doOffer = async () => {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      try {
        await waitUntilIceGatheringStateComplete(peerConnection, TIME_TO_HOST_CANDIDATES );
      } catch (error) {
        this.close();
        throw error;
      }
    };

    this.applyAnswer = async answer => {
      await peerConnection.setRemoteDescription(answer);
    };

    this.close = () => {
      peerConnection.removeEventListener('iceconnectionstatechange', onIceConnectionStateChange);
      if (connectionTimer) {
        clearTimeout(connectionTimer);
        connectionTimer = null;
      }
      if (reconnectionTimer) {
        clearTimeout(reconnectionTimer);
        reconnectionTimer = null;
      }
      if (dataChannel) {
        dataChannel.removeEventListener('message', onMessagereceived);
      }
      peerConnection.close();
    };

    Object.defineProperties(this, {
      localDescription: {
        get() {
          return peerConnection.localDescription
        }
      },
      chanelLabel: {
        get() {
          return chanelLabel
        }
      },
    })

  }
}

async function waitUntilIceGatheringStateComplete(peerConnection, TIME_TO_HOST_CANDIDATES) {
  if (peerConnection.iceGatheringState === 'complete') {
    return;
  }


  const deferred = {};
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });

  const timeout = setTimeout(() => {
    peerConnection.removeEventListener('icecandidate', onIceCandidate);
    deferred.reject(new Error('Timed out waiting for host candidates'));
  }, TIME_TO_HOST_CANDIDATES);

  function onIceCandidate({ candidate }) {
    if (!candidate) {
      clearTimeout(timeout);
      peerConnection.removeEventListener('icecandidate', onIceCandidate);
      deferred.resolve();
    }
  }

  peerConnection.addEventListener('icecandidate', onIceCandidate);

  await deferred.promise;
}


module.exports = WebRtcConnection