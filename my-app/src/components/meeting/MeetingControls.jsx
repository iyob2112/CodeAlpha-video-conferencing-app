import React from "react";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  MessageSquare, Users, Pencil, Share2, PhoneOff, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function ControlButton({ icon: Icon, label, active, danger, onClick, badge }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={`relative p-3.5 rounded-xl transition-all duration-200 ${
              danger
                ? "bg-red-500 hover:bg-red-600 text-white"
                : active
                  ? "bg-primary/20 text-primary hover:bg-primary/30"
                  : "bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-5 h-5" />
            {badge > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
                {badge}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-card border-border">
          <p className="text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function MeetingControls({
  isMicOn, onToggleMic,
  isCameraOn, onToggleCamera,
  isScreenSharing, onToggleScreenShare,
  onToggleChat, chatOpen, unreadMessages,
  onToggleParticipants, participantsOpen, participantCount,
  onToggleWhiteboard, whiteboardOpen,
  onToggleFiles, filesOpen,
  onLeaveMeeting, onCopyInvite
}) {
  return (
    <div className="flex items-center justify-center gap-2 p-4 bg-card/80 backdrop-blur-xl border-t border-border">
      <div className="flex items-center gap-2">
        <ControlButton
          icon={isMicOn ? Mic : MicOff}
          label={isMicOn ? "Mute" : "Unmute"}
          active={isMicOn}
          onClick={onToggleMic}
        />
        <ControlButton
          icon={isCameraOn ? Video : VideoOff}
          label={isCameraOn ? "Turn off camera" : "Turn on camera"}
          active={isCameraOn}
          onClick={onToggleCamera}
        />
        <ControlButton
          icon={isScreenSharing ? MonitorOff : Monitor}
          label={isScreenSharing ? "Stop sharing" : "Share screen"}
          active={isScreenSharing}
          onClick={onToggleScreenShare}
        />
      </div>

      <div className="w-px h-8 bg-border mx-2" />

      <div className="flex items-center gap-2">
        <ControlButton
          icon={MessageSquare}
          label="Chat"
          active={chatOpen}
          onClick={onToggleChat}
          badge={unreadMessages}
        />
        <ControlButton
          icon={Users}
          label="Participants"
          active={participantsOpen}
          onClick={onToggleParticipants}
          badge={participantCount}
        />
        <ControlButton
          icon={Pencil}
          label="Whiteboard"
          active={whiteboardOpen}
          onClick={onToggleWhiteboard}
        />
        <ControlButton
          icon={Upload}
          label="Files"
          active={filesOpen}
          onClick={onToggleFiles}
        />
      </div>

      <div className="w-px h-8 bg-border mx-2" />

      <div className="flex items-center gap-2">
        <ControlButton
          icon={Share2}
          label="Copy invite link"
          onClick={onCopyInvite}
        />
        <ControlButton
          icon={PhoneOff}
          label="Leave meeting"
          danger
          onClick={onLeaveMeeting}
        />
      </div>
    </div>
  );
}