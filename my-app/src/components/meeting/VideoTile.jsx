import React, { useRef, useEffect } from "react";
import { Mic, MicOff, Pin } from "lucide-react";

export default function VideoTile({ stream, name, isMuted, isLocal, isPinned, onPin, isScreenShare }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-secondary/60 group transition-all duration-300 ${
        isPinned ? "col-span-2 row-span-2" : ""
      }`}
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal && !isScreenShare ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center min-h-[180px]">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {name?.charAt(0)?.toUpperCase() || "?"}
            </span>
          </div>
        </div>
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Name badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-xs font-medium text-white">
          {isLocal ? "You" : name || "Participant"}
        </span>
        {isMuted && (
          <span className="p-1 rounded-md bg-red-500/80 backdrop-blur-sm">
            <MicOff className="w-3 h-3 text-white" />
          </span>
        )}
      </div>

      {/* Pin button */}
      {onPin && (
        <button
          onClick={onPin}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
        >
          <Pin className={`w-3.5 h-3.5 ${isPinned ? "text-primary" : ""}`} />
        </button>
      )}

      {isScreenShare && (
        <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-primary/80 backdrop-blur-sm text-xs font-medium text-white">
          Screen Share
        </div>
      )}
    </div>
  );
}