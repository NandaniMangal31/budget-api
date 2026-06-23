import { useRef, useState } from "react";
import api from "../api/axios";

export default function UploadDocument({ onScanned }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success' | 'error', text }

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("document", file);

    try {
      const res = await api.post("/scan/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const labels = {
        "structured-data": "Read directly from the file's columns — no AI needed.",
        ai: "Categorized with AI.",
        "rule-based": "Categorized with the offline rule-based categorizer (AI unavailable).",
      };
      const note = labels[res.data.parsedWith] || "";

      setResult({ type: "success", text: `${res.data.message} ${note}` });
      onScanned();
    } catch (err) {
      setResult({
        type: "error",
        text: err.response?.data?.message || "Failed to scan document",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="card">
      <div className="card-title">Scan a statement</div>

      <label className="dropzone">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.csv,.docx,.txt,.xlsx"
          onChange={(e) => handleFile(e.target.files[0])}
          disabled={uploading}
        />
        <div className="dz-title">{uploading ? "Scanning…" : "Click to upload a file"}</div>
        <div className="dz-sub">PDF, CSV, DOCX, TXT or XLSX — max 10MB</div>
      </label>

      {result && <div className={`scan-result ${result.type}`}>{result.text}</div>}
    </div>
  );
}
