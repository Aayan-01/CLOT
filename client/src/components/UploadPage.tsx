import React, { useState, useRef } from "react";
import axios from "axios";
import ProgressiveLoader from "./ProgressiveLoader";
import CameraIcon from "./CameraIcon";
import { AnalysisResult } from "../types";

interface UploadPageProps {
  onAnalysisComplete: (result: AnalysisResult, sessionId: string) => void;
}

const UploadPage: React.FC<UploadPageProps> = ({ onAnalysisComplete }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API_ORIGIN: try VITE_API_ORIGIN env first, then localhost in dev, then Cloud Run backend
  const API_ORIGIN = (import.meta as any).env?.VITE_API_ORIGIN || 
    ((import.meta as any).env?.DEV 
      ? 'http://localhost:4000' 
      : 'https://clot-805145431598.asia-south1.run.app');

  /** ------------------------------
   *  HANDLE FILE SELECTION
   * ------------------------------ */
  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);
    const valid: File[] = [];
    const previewList: string[] = [];
    const errors: string[] = [];

    fileArray.forEach((file) => {
      if (!file.type.match("image/(jpeg|jpg|png)")) {
        errors.push(`${file.name}: Only JPG, JPEG, PNG allowed`);
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        errors.push(`${file.name}: Max size 8MB`);
        return;
      }
      valid.push(file);
      previewList.push(URL.createObjectURL(file));
    });

    const combinedFiles = [...files, ...valid];
    const combinedPreview = [...previews, ...previewList];

    if (combinedFiles.length > 3) {
      setFiles(combinedFiles.slice(0, 3));
      setPreviews(combinedPreview.slice(0, 3));
      setError("Maximum 3 images allowed.");
    } else {
      setFiles(combinedFiles);
      setPreviews(combinedPreview);
      setError(errors.join("; "));
    }
  };

  /** ------------------------------
   *  DRAG + DROP HANDLERS
   * ------------------------------ */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  /** ------------------------------
   *  HANDLE SUBMIT
   * ------------------------------ */
  const handleSubmit = async () => {
    // Health Check
    try {
      await axios.get(`${API_ORIGIN}/api/health`, { timeout: 2000 });
    } catch {
      setError(`Backend server unreachable at ${API_ORIGIN} — please verify your deployment or start the server locally: \`cd server && npm run dev\``);
      return;
    }

    if (files.length === 0) {
      setError("Please select at least one image");
      return;
    }

    setIsLoading(true);
    setProgress("Uploading images...");
    setError("");

    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    try {
      setProgress("Analyzing images...");

      const { data } = await axios.post(
        `${API_ORIGIN}/api/analyze`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 120000,
        }
      );

      setProgress("Analysis complete!");

      setTimeout(() => {
        onAnalysisComplete(data.analysis, data.sessionId);
      }, 500);
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        "Analysis failed. Try again.";
      setError(msg);
      setIsLoading(false);
      setProgress("");
    }
  };

  /** ------------------------------
   *  REMOVE FILE
   * ------------------------------ */
  const removeFile = (i: number) => {
    setFiles(files.filter((_, x) => x !== i));
    setPreviews(previews.filter((_, x) => x !== i));
  };

  /** ------------------------------
   *  UI SECTION
   * ------------------------------ */
  return (
    <div className="min-h-screen w-full bg-[#f8fafc] relative">

      {/* Background Grid */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e2e8f0 1px, transparent 1px),
            linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
          `,
          backgroundSize: "20px 30px",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 100%, #000 60%, transparent 100%)",
        }}
      />

      {/* Content Wrapper */}
      <div className="relative z-20 flex items-center justify-center min-h-screen p-4 pointer-events-auto">
        <div className="max-w-2xl w-full">

          {/* Header (single visible text only) */}
          <div className="text-center mb-10">
            <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Retro Rate</div>
            <p className="text-gray-600 mt-2 text-lg">
              AI-powered authenticity verification & price estimation
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-10 border border-gray-100 relative z-30">

            {!isLoading ? (
              <>
                {/* Upload Box */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    cursor-pointer rounded-2xl border-2 border-dashed
                    transition-all duration-300 ease-out p-12
                    flex flex-col items-center justify-center
                    ${
                      isDragging
                        ? "border-black bg-gray-50 scale-[0.99]"
                        : "border-gray-300 bg-gray-50/40 hover:border-gray-400 hover:bg-gray-50"
                    }
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />

                  <div className="mb-6">
                    <CameraIcon />
                  </div>

                  <p className="text-lg font-semibold text-gray-900">
                    Drag & drop images or click to browse
                  </p>

                  <p className="text-gray-500 text-sm mt-1">
                    Upload 1–3 images (JPG, PNG, max 8MB)
                  </p>
                </div>

                {/* Previews */}
                {previews.length > 0 && (
                  <div className="mt-6">
                    <p className="text-gray-700 text-sm mb-3">
                      Selected images: {files.length}/3
                    </p>

                    <div className="grid grid-cols-3 gap-4">
                      {previews.map((src, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={src}
                            className="w-full h-32 object-cover rounded-xl border border-gray-300"
                          />
                          <button
                            onClick={() => removeFile(i)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full 
                              w-6 h-6 flex items-center justify-center opacity-0 
                              group-hover:opacity-100 transition"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {error && (
                  <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-xl text-red-700">
                    {error}
                  </div>
                )}

                {/* Button */}
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleSubmit}
                    disabled={files.length === 0}
                    className={`
                      group relative px-8 py-2.5 rounded-full bg-black text-white 
                      shadow-md font-semibold inline-flex items-center gap-2 justify-center
                      transition-all duration-200 ease-out
                      ${
                        files.length === 0
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                      }
                    `}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:-translate-y-0.5 transition-transform duration-200">
                      <path d="M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M21 21H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Analyze Authenticity
                  </button>
                </div>

                {/* Disclaimer */}
                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-amber-800 text-sm leading-relaxed">
                    <strong>Disclaimer:</strong> This is an automated estimator —
                    not a legal authenticity certificate. For high-value items, consult an expert.
                  </p>
                </div>
              </>
            ) : (
              <ProgressiveLoader
                active={isLoading}
                message={progress}
                steps={[
                  "Uploading images",
                  "Analyzing images with AI",
                  "Checking authenticity",
                  "Estimating price",
                  "Finalizing results",
                ]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
