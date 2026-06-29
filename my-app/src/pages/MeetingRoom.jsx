import React, { useState, useEffect, useCallback } from "react";

import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import VideoTile from "@/components/meeting/VideoTile";
import MeetingControls from "@/components/meeting/MeetingControls";
import ChatPanel from "@/components/meeting/ChatPanel";
import ParticipantsPanel from "@/components/meeting/ParticipantsPanel";
import Whiteboard from "@/components/meeting/Whiteboard";
import FilesPanel from "@/components/meeting/FilesPanel";
import { useRoomConnection } from "@/hooks/useRoomConnection";
import { useAuth } from "@/lib/AuthContext";

const API_BASE = "http://192.168.1.5:5000/api";

export default function MeetingRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();

  const [meeting, setMeeting] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Media state
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Panel state
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pinnedId, setPinnedId] = useState(null);

  // Real-time room connection: Socket.io signaling + one RTCPeerConnection
  // per remote participant + live chat messages.
  const {
    remoteStreams, // { socketId: MediaStream }
    remoteUsers, // { socketId: { userId, name } }
    messages,
    sendMessage,
    replaceVideoTrack,
  } = useRoomConnection({
    roomId: id,
    userId: user?.id,
    name: user?.full_name || user?.email,
    localStream,
  });

  useEffect(() => {
    initMeeting();
    return () => {
      cleanupMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const initMeeting = async () => {
    try {
      const meRes = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (meRes.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      if (!meRes.ok) throw new Error("You're not logged in. Please log in again.");

      const me = await meRes.json();
      setUser(me);

      const meetingRes = await fetch(`${API_BASE}/meetings/${id}`);

      if (!meetingRes.ok) {
        if (meetingRes.status === 404) {
          throw new Error("Meeting not found. Check the link and try again.");
        }
        const text = await meetingRes.text().catch(() => "");
        console.error("Meeting fetch failed:", meetingRes.status, text);
        throw new Error("Couldn't load this meeting. Please try again.");
      }

      const m = await meetingRes.json();
      setMeeting(m);

      // Add ourselves to participants if not already there
      const existingParticipants = (m.participants || []).filter(Boolean);
      if (!existingParticipants.includes(me.id)) {
        const updatedRes = await fetch(`${API_BASE}/meetings/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participants: [...existingParticipants, me.id],
            status: "active",
          }),
        });
        if (updatedRes.ok) {
          const updated = await updatedRes.json();
          setMeeting(updated);
        }
      }

      // Camera/mic — request this last so the user sees the rest of the UI
      // even if they deny permission.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
      } catch (mediaErr) {
        console.error("getUserMedia failed:", mediaErr);
        toast({
          title: "Camera/mic unavailable",
          description: "Check your browser permissions. You can still chat and view others.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("initMeeting error:", err);
      setError(err.message || "Failed to join meeting");
    } finally {
      setLoading(false);
    }
  };

  const cleanupMedia = () => {
    localStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
  };

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsCameraOn(!isCameraOn);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      screenStream?.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      setIsScreenSharing(false);

      // Swap back to the camera track for all peers
      const camTrack = localStream?.getVideoTracks()[0];
      if (camTrack) replaceVideoTrack(camTrack);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
          audio: true,
        });
        setScreenStream(stream);
        setIsScreenSharing(true);

        // Send the screen track to every connected peer instead of the camera
        const screenTrack = stream.getVideoTracks()[0];
        replaceVideoTrack(screenTrack);

        screenTrack.onended = () => {
          setScreenStream(null);
          setIsScreenSharing(false);
          const camTrack = localStream?.getVideoTracks()[0];
          if (camTrack) replaceVideoTrack(camTrack);
        };
      } catch {
        // User cancelled the screen share picker
      }
    }
  };

  const togglePanel = (panel) => {
    const closers = {
      chat: () => { setChatOpen(!chatOpen); setParticipantsOpen(false); setWhiteboardOpen(false); setFilesOpen(false); if (!chatOpen) setUnreadMessages(0); },
      participants: () => { setParticipantsOpen(!participantsOpen); setChatOpen(false); setWhiteboardOpen(false); setFilesOpen(false); },
      whiteboard: () => { setWhiteboardOpen(!whiteboardOpen); setChatOpen(false); setParticipantsOpen(false); setFilesOpen(false); },
      files: () => { setFilesOpen(!filesOpen); setChatOpen(false); setParticipantsOpen(false); setWhiteboardOpen(false); },
    };
    closers[panel]?.();
  };

  const copyInvite = () => {
    if (meeting?.room_code) {
      navigator.clipboard.writeText(meeting.room_code);
      toast({ title: "Room code copied!", description: `Share "${meeting.room_code}" with others to join.` });
    }
  };

  const leaveMeeting = async () => {
    try {
      cleanupMedia();

      const currentParticipants = (meeting?.participants || []).filter(Boolean);
      const updated = currentParticipants.filter((p) => p !== user?.id);

      await fetch(`${API_BASE}/meetings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participants: updated,
          status: updated.length === 0 ? "ended" : "active",
        }),
      });

      navigate("/");
    } catch (err) {
      console.error("leaveMeeting failed:", err);
      navigate("/");
    }
  };

  const sidePanelOpen = chatOpen || participantsOpen || whiteboardOpen || filesOpen;

  // Build the participant list for the Participants panel from real
  // connected peers (not the stale DB array) plus ourselves.
  const remoteParticipantsList = Object.entries(remoteUsers).map(([socketId, info]) => ({
    id: info.userId || socketId,
    socketId,
    name: info.name || "Participant",
    isLocal: false,
  }));

  const participantsList = [
    {
      id: user?.id,
      name: user?.full_name || user?.email || "You",
      isLocal: true,
      isMuted: !isMicOn,
      isCameraOff: !isCameraOn,
    },
    ...remoteParticipantsList,
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Joining meeting...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-lg font-semibold">{error}</h2>
        <Button onClick={() => navigate("/")} variant="secondary">Back to Home</Button>
      </div>
    );
  }

  const totalTiles = participantsList.length;

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-card/60 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h1 className="font-semibold text-sm truncate">{meeting?.title}</h1>
          <span className="hidden sm:inline text-xs text-muted-foreground font-mono bg-secondary px-2 py-0.5 rounded">
            {meeting?.room_code}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MeetingTimer />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className={`flex-1 p-3 transition-all duration-300 ${sidePanelOpen ? "sm:mr-0" : ""}`}>
          <div className={`grid gap-3 h-full auto-rows-fr ${
            isScreenSharing
              ? "grid-cols-1"
              : totalTiles <= 1
                ? "grid-cols-1 max-w-2xl mx-auto"
                : totalTiles <= 4
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-2 sm:grid-cols-3"
          }`}>
            {/* Screen share tile */}
            {isScreenSharing && screenStream && (
              <VideoTile
                stream={screenStream}
                name={user?.full_name || "Your Screen"}
                isLocal
                isScreenShare
                isPinned
              />
            )}

            {/* Local video */}
            <VideoTile
              stream={isCameraOn ? localStream : null}
              name={user?.full_name || user?.email}
              isMuted={!isMicOn}
              isLocal
              isPinned={pinnedId === "local"}
              onPin={() => setPinnedId(pinnedId === "local" ? null : "local")}
            />

            {/* Remote videos — one tile per connected peer */}
            {Object.entries(remoteStreams).map(([socketId, stream]) => (
              <VideoTile
                key={socketId}
                stream={stream}
                name={remoteUsers[socketId]?.name || "Participant"}
                isPinned={pinnedId === socketId}
                onPin={() => setPinnedId(pinnedId === socketId ? null : socketId)}
              />
            ))}
          </div>
        </div>

        {/* Side panel */}
        {sidePanelOpen && (
          <div className="w-full sm:w-80 flex-shrink-0">
            {chatOpen && (
              <ChatPanel
                meetingId={id}
                currentUser={user}
                messages={messages}
                onSendMessage={sendMessage}
                onClose={() => setChatOpen(false)}
                onNewMessage={() => setUnreadMessages((p) => p + 1)}
              />
            )}
            {participantsOpen && (
              <ParticipantsPanel
                participants={participantsList}
                hostId={meeting?.host_id}
                onClose={() => setParticipantsOpen(false)}
              />
            )}
            {whiteboardOpen && (
              <Whiteboard
                meetingId={id}
                currentUser={user}
                onClose={() => setWhiteboardOpen(false)}
              />
            )}
            {filesOpen && (
              <FilesPanel
                meetingId={id}
                currentUser={user}
                onClose={() => setFilesOpen(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <MeetingControls
        isMicOn={isMicOn}
        onToggleMic={toggleMic}
        isCameraOn={isCameraOn}
        onToggleCamera={toggleCamera}
        isScreenSharing={isScreenSharing}
        onToggleScreenShare={toggleScreenShare}
        onToggleChat={() => togglePanel("chat")}
        chatOpen={chatOpen}
        unreadMessages={chatOpen ? 0 : unreadMessages}
        onToggleParticipants={() => togglePanel("participants")}
        participantsOpen={participantsOpen}
        participantCount={participantsList.length}
        onToggleWhiteboard={() => togglePanel("whiteboard")}
        whiteboardOpen={whiteboardOpen}
        onToggleFiles={() => togglePanel("files")}
        filesOpen={filesOpen}
        onLeaveMeeting={leaveMeeting}
        onCopyInvite={copyInvite}
      />
    </div>
  );
}

function MeetingTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <span className="font-mono tabular-nums">
      {hrs > 0 && `${pad(hrs)}:`}{pad(mins)}:{pad(secs)}
    </span>
  );
}