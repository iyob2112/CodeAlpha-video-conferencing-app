import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";

// Free public STUN server — good enough for most home/office networks.
// For users behind strict corporate NATs you'll eventually want a TURN
// server too (e.g. via a paid service like Twilio or Metered), but STUN
// alone covers most real-world cases for a 2-4 person call.
const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

/**
 * Manages one RTCPeerConnection per remote participant ("mesh" topology).
 * Good for small rooms (2-4 people). For bigger rooms you'd want an SFU
 * (e.g. mediasoup/LiveKit) instead of connecting every peer to every peer.
 */
export function useRoomConnection({ roomId, userId, name, localStream }) {
  const [remoteStreams, setRemoteStreams] = useState({}); // socketId -> MediaStream
  const [remoteUsers, setRemoteUsers] = useState({}); // socketId -> { userId, name }
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);

  const peersRef = useRef({}); // socketId -> RTCPeerConnection
  const localStreamRef = useRef(localStream);

  const socketRef = useRef(null);

  useEffect(() => {
    localStreamRef.current = localStream;
    if (!localStream) return;

    // If peer connections already exist (created before the camera was
    // ready), either replace an existing sender's track or, if no sender
    // exists yet for that kind, add it as a new track and renegotiate —
    // replaceTrack() alone does nothing when there was never a sender.
    Object.entries(peersRef.current).forEach(([remoteSocketId, pc]) => {
      const senders = pc.getSenders();
      let addedNewTrack = false;

      localStream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          pc.addTrack(track, localStream);
          addedNewTrack = true;
        }
      });

      if (addedNewTrack && socketRef.current) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            socketRef.current.emit("webrtc_offer", {
              to: remoteSocketId,
              sdp: pc.localDescription,
            });
          })
          .catch((err) => console.error("Renegotiation error:", err));
      }
    });
  }, [localStream]);

  const createPeerConnection = useCallback((remoteSocketId) => {
    if (peersRef.current[remoteSocketId]) {
      return peersRef.current[remoteSocketId];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[remoteSocketId] = pc;

    // Attach our current local tracks, if the camera/mic is ready yet.
    // If not, the effect above will add them later and renegotiate.
    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        getSocket().emit("webrtc_ice_candidate", {
          to: remoteSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [remoteSocketId]: event.streams[0],
      }));
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        console.log(`Peer ${remoteSocketId} connection state:`, pc.connectionState);
      }
    };

    return pc;
  }, []);

  const closePeerConnection = useCallback((remoteSocketId) => {
    const pc = peersRef.current[remoteSocketId];
    if (pc) {
      pc.close();
      delete peersRef.current[remoteSocketId];
    }
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[remoteSocketId];
      return next;
    });
    setRemoteUsers((prev) => {
      const next = { ...prev };
      delete next[remoteSocketId];
      return next;
    });
  }, []);

  useEffect(() => {
    if (!roomId || !userId) return; // need to know who's joining, camera is optional

    const socket = getSocket();
    socketRef.current = socket;
    socket.connect();

    const handleConnect = () => {
      setConnected(true);
      socket.emit("join_room", { roomId, userId, name });
    };

    // Existing users already in the room when we join.
    // We initiate the offer to each of them.
    const handleRoomUsers = (users) => {
      users.forEach(({ socketId, userId: uid, name: uname }) => {
        setRemoteUsers((prev) => ({ ...prev, [socketId]: { userId: uid, name: uname } }));

        const pc = createPeerConnection(socketId);
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            socket.emit("webrtc_offer", { to: socketId, sdp: pc.localDescription });
          })
          .catch((err) => console.error("Error creating offer:", err));
      });
    };

    // A new user joined after us — whoever was already in the room
    // initiates the offer, so we just register them and wait.
    const handleUserJoined = ({ socketId, userId: uid, name: uname }) => {
      setRemoteUsers((prev) => ({ ...prev, [socketId]: { userId: uid, name: uname } }));
    };

    const handleOffer = async ({ from, sdp }) => {
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc_answer", { to: from, sdp: pc.localDescription });
    };

    const handleAnswer = async ({ from, sdp }) => {
      const pc = peersRef.current[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    };

    const handleIceCandidate = async ({ from, candidate }) => {
      const pc = peersRef.current[from];
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      }
    };

    const handleUserLeft = ({ socketId }) => {
      closePeerConnection(socketId);
    };

    const handleReceiveMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("connect", handleConnect);
    socket.on("room_users", handleRoomUsers);
    socket.on("user_joined", handleUserJoined);
    socket.on("webrtc_offer", handleOffer);
    socket.on("webrtc_answer", handleAnswer);
    socket.on("webrtc_ice_candidate", handleIceCandidate);
    socket.on("user_left", handleUserLeft);
    socket.on("receive_message", handleReceiveMessage);

    if (socket.connected) handleConnect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("room_users", handleRoomUsers);
      socket.off("user_joined", handleUserJoined);
      socket.off("webrtc_offer", handleOffer);
      socket.off("webrtc_answer", handleAnswer);
      socket.off("webrtc_ice_candidate", handleIceCandidate);
      socket.off("user_left", handleUserLeft);
      socket.off("receive_message", handleReceiveMessage);

      Object.keys(peersRef.current).forEach(closePeerConnection);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  const sendMessage = useCallback(
    (content, extra = {}) => {
      getSocket().emit("send_message", {
        roomId,
        meeting_id: roomId,
        sender_id: userId,
        sender_name: name,
        content,
        type: "text",
        ...extra,
      });
    },
    [roomId, userId, name]
  );

  // Swap the video track being sent to all peers (used for screen share).
  const replaceVideoTrack = useCallback((newTrack) => {
    Object.values(peersRef.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(newTrack);
    });
  }, []);

  return {
    remoteStreams,
    remoteUsers,
    messages,
    connected,
    sendMessage,
    replaceVideoTrack,
  };
}