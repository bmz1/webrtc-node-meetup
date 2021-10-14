import { io } from 'socket.io-client';
import './style.css';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global State
const pc = new RTCPeerConnection(servers);
let localStream, remoteStream;

pc.onicecandidate = (event) => {
  event.candidate && socket.emit('candidate', event.candidate);
};

const pendingCandidates = [];

const socket = io('http://localhost:5000', { transports: ['websocket'] });
socket.on('connect', () => console.log('connected'));
socket.on('error', (e) => console.log('e', e));
socket.on('disconnect', (e) => console.log('e', e));

socket.on('offer', async (offer) => {
  await getUserMedia();
  console.log('set remote desc');
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  if (pendingCandidates.length) {
    pendingCandidates.forEach((candidate) => pc.addIceCandidate(candidate));
    pendingCandidates.length = 0;
  }
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  const answerToSend = {
    sdp: answer.sdp,
    type: answer.type,
  };
  socket.emit('answer', answerToSend);
});

socket.on('answer', async (answer) => {
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('candidate', async (candidate) => {
  console.log('gotCandidates');
  const c = new RTCIceCandidate(candidate);
  if (!pc.currentRemoteDescription) {
    pendingCandidates.push(c);
    return;
  }
  await pc.addIceCandidate(c);
});

socket.on('hangup', hangUp)

// html
const localStreamVideoEl = document.getElementById('localStream');
const remoteStreamVideoEl = document.getElementById('remoteStream');
const cameraButton = document.getElementById('camera');
const callButton = document.getElementById('call');
const hangUpButton = document.getElementById('hangup');

cameraButton.addEventListener('click', getUserMedia);
callButton.addEventListener('click', call);
hangUpButton.addEventListener('click', hangUp);

async function getUserMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
    localStreamVideoEl.srcObject = localStream;
    remoteStream = new MediaStream();
    remoteStreamVideoEl.srcObject = remoteStream;

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
    };
    callButton.disabled = false;
    hangUpButton.disabled = false;
  } catch (err) {
    console.log(err);
  }
}

async function call() {
  try {
    const offerDescripton = await pc.createOffer();
    await pc.setLocalDescription(offerDescripton);

    const offer = {
      sdp: offerDescripton.sdp,
      type: offerDescripton.type,
    };

    socket.emit('offer', offer);
  } catch (err) {
    console.log(err);
  }
}

async function hangUp() {
  try {
    if (remoteStream) {
      socket.emit('hangup');
    }
    pc.close();
    remoteStream = null;
    localStream.getTracks().forEach((track) => {
      track.stop();
    });
  } catch (err) {
    console.log(err);
  }
}
