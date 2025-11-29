import React, { useState, useRef } from 'react';
import { AnalysisResult } from '../types';
import axios from 'axios';
import ProgressiveLoader from './ProgressiveLoader';

interface UploadPageProps {
  onAnalysisComplete: (result: AnalysisResult, sessionId: string) => void;
}

// Removed inline LoadingSpinner — using ProgressiveLoader for a richer experience

const UploadPage: React.FC<UploadPageProps> = ({ onAnalysisComplete }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);
    const validFiles: File[] = [];
    const newPreviews: string[] = [];
    const errors: string[] = [];

    // Check all files and collect errors
    fileArray.forEach((file) => {
      if (!file.type.match('image/(jpeg|jpg|png)')) {
        errors.push(`${file.name}: Only JPG, JPEG, and PNG files are allowed`);
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        errors.push(`${file.name}: File size must be less than 8MB`);
        return;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    // Limit to 3 files total (combining with existing files)
    const totalFiles = [...files, ...validFiles];
    const totalPreviews = [...previews, ...newPreviews];
    
    if (totalFiles.length > 3) {
      const filesToKeep = totalFiles.slice(0, 3);
      const previewsToKeep = totalPreviews.slice(0, 3);
      setFiles(filesToKeep);
      setPreviews(previewsToKeep);
      setError(`Maximum 3 images allowed. Only the first 3 were selected.`);
    } else {
      setFiles(totalFiles);
      setPreviews(totalPreviews);
      if (errors.length > 0) {
        setError(errors.join('; '));
      } else {
        setError('');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    // quick health check to avoid noisy proxy error when server is down
    try {
      // call backend directly to avoid triggering vite dev proxy logs when server is down
      await axios.get('http://localhost:4000/api/health', { timeout: 2000 });
    } catch (hErr) {
      setError('Backend server unreachable at http://localhost:4000 — please start the server: `cd server && npm run dev`');
      return;
    }
    if (files.length === 0) {
      setError('Please select at least one image');
      return;
    }

    setIsLoading(true);
    setProgress('Uploading images...');
    setError('');

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });

    try {
      setProgress('Analyzing images with AI...');
      const response = await axios.post<{
        sessionId: string;
        analysis: AnalysisResult;
      }>('/api/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      setProgress('Analysis complete!');
      setTimeout(() => {
        onAnalysisComplete(response.data.analysis, response.data.sessionId);
      }, 500);
    } catch (err: any) {
      // Detect connection refused / proxy unreachable and show helpful message
      const message =
        err?.code === 'ECONNREFUSED' || (err?.message || '').includes('ECONNREFUSED')
          ? 'Unable to contact backend server at http://localhost:4000 — please start the server: `cd server && npm run dev`'
          : (err.response?.data?.error || (err?.message && err.message.includes('Network Error') ? 'Network error contacting backend — is the server running?' : 'Analysis failed. Please try again.'));

      setError(message);
      setIsLoading(false);
      setProgress('');
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Cloth Authenticator
          </h1>
          <p className="text-gray-400 text-lg">
            AI-powered authenticity verification & price estimation
          </p>
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
          {!isLoading ? (
            <>
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <div className="space-y-4">
                  <div className="text-6xl">📸</div>
                  <div>
                    <p className="text-xl font-semibold mb-2 text-white">
                      Drop images here or click to browse
                    </p>
                    <p className="text-gray-400 text-sm">
                      Upload 1-3 images (JPG, PNG, max 8MB each)
                    </p>
                  </div>
                </div>
              </div>

              {previews.length > 0 && (
                <div className="mt-6">
                  <p className="text-gray-300 text-sm mb-3">
                    Selected images: {files.length}/3
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {previews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-600"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={files.length === 0}
                className="mt-6 w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-[1.02]"
              >
                Analyze Authenticity
              </button>

              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-200 text-sm">
                  ⚠️ <strong>Disclaimer:</strong> This is an automated estimator
                  – not a legal authenticity certificate. For high-value items,
                  consult an expert.
                </p>
              </div>
            </>
          ) : (
            <ProgressiveLoader
              active={isLoading}
              steps={[
                'Uploading images',
                'Analyzing images with AI',
                'Checking authenticity',
                'Estimating price',
                'Finalizing results',
              ]}
              message={progress}
              onComplete={() => {
                // keep progress string in sync, small delay for UX
                setProgress('Analysis complete!');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadPage;