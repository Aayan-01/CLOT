import { useState } from 'react';
import UploadPage from './components/UploadPage';
import ResultsPage from './components/ResultsPage';
import { AnalysisResult } from './types';
import BottomBanner from './components/BottomBanner';

function App() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleAnalysisComplete = (result: AnalysisResult, sid: string) => {
    setAnalysisResult(result);
    setSessionId(sid);
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setSessionId(null);
  };

  // Note: social links are handled by the BottomBanner component (reads VITE env vars)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="pt-4">
        {!analysisResult ? (
          <UploadPage onAnalysisComplete={handleAnalysisComplete} />
        ) : (
          <ResultsPage
            result={analysisResult}
            sessionId={sessionId!}
            onReset={handleReset}
          />
        )}
      </div>
      <footer className="mt-8 py-6 text-center text-sm text-gray-400">
        <div className="container mx-auto">
          <a href="privacy.html" target="_blank" rel="noopener noreferrer" className="mx-2 hover:underline">Privacy Policy</a>
          <span className="mx-1">•</span>
          <a href="terms.html" target="_blank" rel="noopener noreferrer" className="mx-2 hover:underline">Terms</a>
          <span className="mx-1">•</span>
          <a href="mailto:help.retrorate@gmail.com" className="mx-2 hover:underline">Contact</a>
        </div>
      </footer>

      {/* Global bottom banner (icons + contact) */}
      <BottomBanner />
    </div>
  );
}

export default App;