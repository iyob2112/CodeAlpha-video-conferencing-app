import { useState, useRef, useEffect } from "react";
import { Send, X, FileIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import moment from "moment";

const API = "http://192.168.1.5:5000/api";

// `messages` and `onSendMessage` are passed down from MeetingRoom, which
// owns the live socket connection (useRoomConnection). This panel just
// renders what it's given and loads history once on open.
export default function ChatPanel({
  meetingId,
  currentUser,
  messages = [],
  onSendMessage,
  onClose,
  onNewMessage,
}) {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [uploading, setUploading] = useState(false);

  const bottomRef = useRef(null);
  const lastCountRef = useRef(0);

  // Load past messages once when the panel mounts (history before we joined).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`${API}/messages/${meetingId}`);
        if (!res.ok) throw new Error("Failed to load history");
        const data = await res.json();
        if (active) setHistory(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingHistory(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [meetingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, history]);

  // Notify parent of new incoming live messages (for the unread badge)
  useEffect(() => {
    if (messages.length > lastCountRef.current) {
      onNewMessage?.();
    }
    lastCountRef.current = messages.length;
  }, [messages, onNewMessage]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage?.(input.trim());
    setInput("");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch(`${API}/files/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("File upload failed");
      const uploadData = await uploadRes.json();

      onSendMessage?.(file.name, {
        type: "file",
        file_url: uploadData.file_url,
        file_name: file.name,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // Combine loaded history with live messages, de-duplicating by _id
  // (a message we just sent ourselves may already be in `messages` once
  // the server echoes it back).
  const allMessages = [...history, ...messages].reduce((acc, msg) => {
    const key = msg._id || `${msg.sender_id}-${msg.content}-${msg.createdAt}`;
    if (!acc.some((m) => (m._id || `${m.sender_id}-${m.content}-${m.createdAt}`) === key)) {
      acc.push(msg);
    }
    return acc;
  }, []);

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-sm">Meeting Chat</h3>
        <button onClick={onClose}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loadingHistory ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : allMessages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No messages yet
          </p>
        ) : (
          allMessages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUser?.id;

            return (
              <div
                key={msg._id || idx}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <span className="text-[10px] text-muted-foreground mb-1">
                  {isMe ? "You" : msg.sender_name} ·{" "}
                  {moment(msg.createdAt).format("h:mm A")}
                </span>

                {msg.type === "file" ? (
                  <a
                    href={msg.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm max-w-[240px] ${
                      isMe ? "bg-primary text-white" : "bg-secondary text-foreground"
                    }`}
                  >
                    <FileIcon className="w-4 h-4" />
                    <span className="truncate">{msg.file_name}</span>
                  </a>
                ) : (
                  <div
                    className={`px-3 py-2 rounded-xl text-sm max-w-[240px] ${
                      isMe ? "bg-primary text-white" : "bg-secondary text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                )}
              </div>
            );
          })
        )}

        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <FileIcon className="w-4 h-4 text-muted-foreground" />
            )}
            <input type="file" hidden onChange={handleFileUpload} disabled={uploading} />
          </label>

          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
          />

          <Button onClick={handleSend} disabled={!input.trim()} size="sm">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}