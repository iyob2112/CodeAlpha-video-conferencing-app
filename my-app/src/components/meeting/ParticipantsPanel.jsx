import React from "react";
import { X, Mic, MicOff, Video, VideoOff, Crown } from "lucide-react";

export default function ParticipantsPanel({ participants, hostId, onClose }) {
  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-sm">
          Participants ({participants.length})
        </h3>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {participants.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-primary">
                {p.name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {p.name || "Participant"}
                {p.isLocal && <span className="text-muted-foreground ml-1">(You)</span>}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {p.id === hostId && (
                <Crown className="w-3.5 h-3.5 text-yellow-500" />
              )}
              {p.isMuted ? (
                <MicOff className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-green-400" />
              )}
              {p.isCameraOff ? (
                <VideoOff className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Video className="w-3.5 h-3.5 text-green-400" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}