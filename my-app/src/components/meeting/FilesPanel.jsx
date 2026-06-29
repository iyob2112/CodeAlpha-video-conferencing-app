import React, { useState, useEffect } from "react";
import { X, Upload, FileIcon, Download, Loader2 } from "lucide-react";
import moment from "moment";

const API = "http://192.168.1.5:5000/api";

export default function FilesPanel({ meetingId, currentUser, onClose }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, [meetingId]);

  const loadFiles = async () => {
    try {
      const res = await fetch(`${API}/files/${meetingId}`);
      const data = await res.json();
      setFiles(data);
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // 1. upload file to backend
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch(`${API}/files/upload`, {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.message || "Upload failed");
      }

      // 2. save metadata in DB
      await fetch(`${API}/files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meeting_id: meetingId,
          file_name: file.name,
          file_url: uploadData.file_url,
          file_size: file.size,
          uploaded_by: currentUser?.full_name || "User",
          uploaded_by_id: currentUser?.id,
        }),
      });

      // 3. refresh list
      loadFiles();
    } catch (err) {
      console.error(err);
      alert("File upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };


  
  return (
    <div className="flex flex-col h-full bg-card border-l border-border">

      {/* header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-sm">Shared Files</h3>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* upload */}
      <div className="p-3 border-b border-border">
        <label className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed cursor-pointer hover:border-primary/50 transition ${
          uploading ? "opacity-50 pointer-events-none" : ""
        }`}>
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload file
            </>
          )}

          <input
            type="file"
            className="hidden"
            onChange={handleUpload}
          />
        </label>
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground mt-8">
            No files shared yet
          </p>
        ) : (
          files.map((file) => (
            <div
              key={file._id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileIcon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {file.file_name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {file.uploaded_by} · {formatSize(file.file_size)} ·{" "}
                  {moment(file.createdAt).format("h:mm A")}
                </p>
              </div>

              <a
                href={file.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-md hover:bg-secondary"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}