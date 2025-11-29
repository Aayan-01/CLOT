import { useState } from 'react';
import UploadPage from './components/UploadPage';
import ResultsPage from './components/ResultsPage';
import { AnalysisResult } from './types';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
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
  );
}

export default App;