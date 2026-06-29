import React, { useRef, useState, useEffect } from "react";
import {
  Pencil,
  Eraser,
  Square,
  Circle,
  Minus,
  Trash2,
  X,
} from "lucide-react";
import { getSocket } from "@/lib/socket";

const API = "http://192.168.1.5:5000/api";
const BG_COLOR = "#111827";

const COLORS = ["#ffffff", "#ef4444", "#3b82f6", "#22c55e", "#eab308"];
const WIDTHS = [2, 4, 6, 8];

export default function Whiteboard({ meetingId, currentUser, onClose }) {
  const canvasRef = useRef(null);

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#ffffff");
  const [lineWidth, setLineWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentPath = useRef([]);

  // init: size the canvas, fill background, load history, subscribe to live strokes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    loadStrokes();

    const socket = getSocket();

    const handleRemoteDraw = (stroke) => {
      // Don't redraw our own stroke a second time — we already drew it
      // locally as the user dragged the mouse.
      if (stroke.authorId === currentUser?.id) return;
      drawStrokeOnCanvas(stroke);
    };

    const handleRemoteClear = () => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, c.width, c.height);
    };

    socket.on("whiteboard_draw", handleRemoteDraw);
    socket.on("whiteboard_clear", handleRemoteClear);

    return () => {
      socket.off("whiteboard_draw", handleRemoteDraw);
      socket.off("whiteboard_clear", handleRemoteClear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  // ---------------- API ----------------

  const loadStrokes = async () => {
    try {
      const res = await fetch(`${API}/whiteboard/${meetingId}`);
      if (!res.ok) throw new Error("Failed to load whiteboard history");
      const data = await res.json();
      data.forEach(drawStrokeOnCanvas);
    } catch (err) {
      console.error("Load error:", err);
    }
  };

  const saveStroke = async (stroke) => {
    try {
      await fetch(`${API}/whiteboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stroke),
      });
    } catch (err) {
      console.error("Save stroke error:", err);
    }
  };

  const clearBoard = async () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Tell everyone else in the room to clear too
    getSocket().emit("whiteboard_clear", { roomId: meetingId });

    try {
      await fetch(`${API}/whiteboard/${meetingId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Clear error:", err);
    }
  };

  // ---------------- DRAW ----------------

  const drawStrokeOnCanvas = (stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const points = stroke.points;
    if (!points || points.length < 2) return;

    ctx.strokeStyle = stroke.tool === "eraser" ? BG_COLOR : stroke.color;
    ctx.lineWidth = stroke.tool === "eraser" ? stroke.width * 4 : stroke.width;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();

    const x = e.touches
      ? e.touches[0].clientX - rect.left
      : e.clientX - rect.left;

    const y = e.touches
      ? e.touches[0].clientY - rect.top
      : e.clientY - rect.top;

    return { x, y };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);

    const pos = getPos(e);
    currentPath.current = [pos];

    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = tool === "eraser" ? BG_COLOR : color;
    ctx.lineWidth = tool === "eraser" ? lineWidth * 4 : lineWidth;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const pos = getPos(e);
    currentPath.current.push(pos);

    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = async () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPath.current.length < 2) {
      currentPath.current = [];
      return;
    }

    const stroke = {
      meetingId,
      points: currentPath.current,
      tool,
      color,
      width: lineWidth,
      authorId: currentUser?.id,
    };

    // Broadcast live to everyone else in the room immediately...
    getSocket().emit("whiteboard_draw", { roomId: meetingId, ...stroke });
    // ...and persist so late joiners / reloads see the full history.
    await saveStroke(stroke);

    currentPath.current = [];
  };

  // ---------------- UI ----------------

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Top bar */}
      <div className="flex justify-between p-2 border-b border-gray-700">
        <h2 className="text-sm font-semibold">Whiteboard</h2>

        <div className="flex gap-2">
          <button onClick={clearBoard} title="Clear board">
            <Trash2 size={16} />
          </button>
          <button onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tools */}
      <div className="flex items-center gap-2 p-2 border-b border-gray-700">
        {[
          { icon: Pencil, name: "pen" },
          { icon: Eraser, name: "eraser" },
          { icon: Minus, name: "line" },
          { icon: Square, name: "rect" },
          { icon: Circle, name: "circle" },
        ].map(({ icon: Icon, name }) => (
          <button
            key={name}
            onClick={() => setTool(name)}
            className={`p-1.5 rounded-md ${tool === name ? "bg-gray-700" : ""}`}
            title={name}
          >
            <Icon size={16} />
          </button>
        ))}

        <div className="w-px h-5 bg-gray-700 mx-1" />

        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-4 h-4 rounded-full ${color === c ? "ring-2 ring-white" : ""}`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}

        <div className="w-px h-5 bg-gray-700 mx-1" />

        {WIDTHS.map((w) => (
          <button
            key={w}
            onClick={() => setLineWidth(w)}
            className={`flex items-center justify-center w-6 h-6 rounded-md ${
              lineWidth === w ? "bg-gray-700" : ""
            }`}
            title={`${w}px`}
          >
            <div
              className="rounded-full bg-white"
              style={{ width: w, height: w }}
            />
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
    </div>
  );
}