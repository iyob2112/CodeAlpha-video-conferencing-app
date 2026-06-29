import React, { useState, useEffect } from "react";

import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Video, Plus, LogIn, Clock, Users, Shield, Monitor,
  Pencil, Upload, ArrowRight, Loader2, LogOut, Copy, Check
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import moment from "moment";

function generateRoomCode() {
  const token = localStorage.getItem("token");
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 9; i++) {
    if (i === 3 || i === 6) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();

  useEffect(() => {
    init();
  }, []);

const init = async () => {
  try {
    const meRes = await fetch("http://192.168.1.5:5000/api/auth/me", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (meRes.status === 401) {
      // Token is expired/invalid — bounce to login instead of showing
      // a degraded Home page with no user/meetings data.
      logout();
      navigate("/login", { replace: true });
      return;
    }

    if (!meRes.ok) {
      throw new Error("Failed to load user");
    }

    const me = await meRes.json();
    setUser(me);

    if (!me.id) {
      throw new Error("User ID not found");
    }

    const mRes = await fetch(
      `http://192.168.1.5:5000/api/meetings/user/${me.id}`
    );

    if (!mRes.ok) {
      throw new Error(await mRes.text());
    }

    const meetings = await mRes.json();
    setMeetings(meetings);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

const handleCreate = async () => {
  if (!newTitle.trim()) return;
  setCreating(true);

  const code = generateRoomCode();

  try {
    const res = await fetch("http://192.168.1.5:5000/api/meetings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: newTitle.trim(),
        room_code: code,
        status: "active",
        host_name: user.email,
        host_id: user.id,
        participants: [user.id],
      }),
    });

    if (!res.ok) throw new Error("Failed to create meeting");

    const meeting = await res.json();

    setCreateOpen(false);
    setNewTitle("");

    navigate(`/meeting/${meeting._id}`);
  } catch (err) {
    console.error("handleCreate failed:", err);
    toast({
      title: "Couldn't create meeting",
      description: "Please try again.",
      variant: "destructive",
    });
  } finally {
    setCreating(false);
  }
};

const handleJoin = async () => {
  if (!joinCode.trim()) return;

  try {
    const res = await fetch(
      `http://192.168.1.5:5000/api/meetings/join/${joinCode.trim()}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id,
        }),
      }
    );

    if (!res.ok) {
      toast({
        title: "Meeting not found",
        description: "Check the room code and try again.",
        variant: "destructive",
      });
      return;
    }

    const meeting = await res.json();
    navigate(`/meeting/${meeting._id}`);
  } catch (err) {
    console.error("handleJoin failed:", err);
    toast({
      title: "Couldn't join meeting",
      description: "Please try again.",
      variant: "destructive",
    });
  }
};

const handleLogout = () => {
  localStorage.removeItem("token");
  window.location.href = "/login";
};

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const features = [
    { icon: Video, title: "HD Video Calls", desc: "Crystal-clear multi-user video conferencing" },
    { icon: Monitor, title: "Screen Sharing", desc: "Share your screen with one click" },
    { icon: Pencil, title: "Whiteboard", desc: "Draw and collaborate in real-time" },
    { icon: Upload, title: "File Sharing", desc: "Share documents during meetings" },
    { icon: Shield, title: "Encrypted", desc: "End-to-end encrypted communication" },
    { icon: Users, title: "Multi-User", desc: "Support for up to 10 participants" },
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">ConnectHub</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">
                  {user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <span className="text-xs font-medium text-foreground">{user?.full_name || user?.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
            Meet, Collaborate, Create
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            HD video conferencing with screen sharing, whiteboard, file sharing — all in one secure platform.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="h-12 px-6 gap-2 text-sm font-semibold rounded-xl w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                New Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Create a new meeting</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Meeting title</Label>
                  <Input
                    placeholder="e.g. Team Standup"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    className="bg-secondary border-0 h-11"
                    autoFocus
                  />
                </div>
                <Button onClick={handleCreate} disabled={!newTitle.trim() || creating} className="w-full h-11">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Video className="w-4 h-4 mr-2" />}
                  Start Meeting
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              placeholder="Enter room code..."
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="bg-secondary border-0 h-12 sm:w-52"
            />
            <Button variant="secondary" size="lg" onClick={handleJoin} disabled={!joinCode.trim()} className="h-12 px-5 rounded-xl">
              <LogIn className="w-4 h-4 mr-2" />
              Join
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-16">
          {features.map((f) => (
            <div key={f.title} className="p-5 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all group">
              <f.icon className="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Recent meetings */}
        {meetings.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Recent Meetings</h2>
            <div className="grid gap-3">
              {meetings.map((m) => (
                <div
                  key={m._id}
                  className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.status === "active" ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{m.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Clock className="w-3 h-3" />
                        {moment(m.created_date).fromNow()}
                        <span>·</span>
                        <span className="font-mono text-[11px]">{m.room_code}</span>
                        <button onClick={() => copyCode(m.room_code)} className="ml-1 hover:text-foreground transition-colors">
                          {copiedId === m.room_code ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <Link to={`/meeting/${m._id}`}>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      {m.status === "active" ? "Rejoin" : "Open"}
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}