import { useState } from 'react';

interface PhrasePayload {
  expression: {
    jp: string;
    kr: string;
  };
  pronunciation: string;
}

interface AiResponse {
  japaneseTranslation: string;
  koreanPronunciation: string;
}

const API_ENDPOINT = 'https://4ysc0zq1b5.execute-api.ap-northeast-2.amazonaws.com/default/knockknock-api';

/**
 * @param koreanPhrase 
 */
const fetchAiSuggestions = async (koreanPhrase: string): Promise<AiResponse> => {
  console.log(`[AI 호출 시작] 입력: "${koreanPhrase}"`);
  
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ koreanText: koreanPhrase })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '알 수 없는 서버 오류' }));
    throw new Error(errorData.message || `서버 오류: ${response.status}`);
  }

  const data = await response.json();
  console.log('[AI 호출 완료] 결과:', data);
  return data;
};

/**
 * @param data 
 */
const savePhraseToDB = async (data: PhrasePayload): Promise<any> => {
  console.log('[DB 저장 시작] 데이터:', data);

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '알 수 없는 서버 오류' }));
    throw new Error(errorData.message || `서버 오류: ${response.status}`);
  }
  
  const responseData = await response.json();
  console.log('[DB 저장 완료]', responseData);
  return responseData;
};



function App() {
  const [koreanInput, setKoreanInput] = useState('');
  const [japaneseOutput, setJapaneseOutput] = useState('');
  const [pronunciation, setPronunciation] = useState('');

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [status, setStatus] = useState({ type: null as 'success' | 'error' | null, message: '' });

  const handleGenerate = async () => {
    if (!koreanInput.trim()) {
      setStatus({ type: 'error', message: '먼저 한국어 표현을 입력해주세요.' });
      return;
    }
    setIsAiLoading(true);
    setStatus({ type: null, message: '' });
    try {
      const aiResult = await fetchAiSuggestions(koreanInput);
      setJapaneseOutput(aiResult.japaneseTranslation);
      setPronunciation(aiResult.koreanPronunciation);
      setStatus({ type: 'success', message: 'AI가 번역 및 발음을 생성했습니다. 내용을 확인하고 저장하세요.' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatus({ type: 'error', message: `AI 생성 중 오류 발생: ${errorMessage}` });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!koreanInput.trim() || !japaneseOutput.trim() || !pronunciation.trim()) {
      setStatus({ type: 'error', message: '모든 필드를 채워주세요.' });
      return;
    }
    setIsDbLoading(true);
    setStatus({ type: null, message: '' });
    try {
      await savePhraseToDB({
        expression: {
          jp: japaneseOutput,
          kr: koreanInput,
        },
        pronunciation: pronunciation,
      });
      setStatus({ type: 'success', message: '데이터가 성공적으로 DB에 저장되었습니다!' });
      // 저장 후 폼 초기화
      setKoreanInput('');
      setJapaneseOutput('');
      setPronunciation('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatus({ type: 'error', message: `저장 중 오류 발생: ${errorMessage}` });
    } finally {
      setIsDbLoading(false);
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen flex items-center justify-center font-sans">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8 m-4">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-800">똑똑 서비스 관리자</h1>
          <p className="text-slate-500 mt-2">AI를 사용하여 일본어 표현을 번역하고 데이터베이스에 저장하세요.</p>
        </header>

        <main>
          <div className="space-y-6">
            <div>
              <label htmlFor="korean-input" className="block text-lg font-medium text-slate-700 mb-2">1. 한국어 표현 입력</label>
              <textarea
                id="korean-input"
                rows={3}
                className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                placeholder="여기에 번역하고 싶은 한국어 문장을 입력하세요..."
                value={koreanInput}
                onChange={(e) => setKoreanInput(e.target.value)}
                disabled={isAiLoading || isDbLoading}
              />
            </div>

            <div className="text-center">
              <button
                onClick={handleGenerate}
                disabled={isAiLoading || isDbLoading || !koreanInput}
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-transform transform hover:scale-105"
              >
                {isAiLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>생성 중...</span>
                  </div>
                ) : '🤖 AI로 번역 및 발음 생성'}
              </button>
            </div>

            <div>
              <label htmlFor="japanese-output" className="block text-lg font-medium text-slate-700 mb-2">2. AI 생성 결과 확인 및 수정</label>
              <div className="space-y-4">
                <input
                  type="text"
                  id="japanese-output"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="AI가 생성한 일본어 번역"
                  value={japaneseOutput}
                  onChange={(e) => setJapaneseOutput(e.target.value)}
                />
                <input
                  type="text"
                  id="pronunciation-output"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="AI가 생성한 한글 발음"
                  value={pronunciation}
                  onChange={(e) => setPronunciation(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            {status.message && (
              <div className={`p-4 rounded-md mb-6 ${status.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {status.message}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={isAiLoading || isDbLoading || !japaneseOutput}
              className="w-full px-8 py-4 bg-green-600 text-white font-bold text-xl rounded-md hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-transform transform hover:scale-105"
            >
              {isDbLoading ? '저장 중...' : '💾 DB에 저장하기'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;

