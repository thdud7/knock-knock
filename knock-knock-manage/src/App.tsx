import { useState, useEffect } from 'react';

interface Phrase {
  id: string;
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

function App() {
  const [koreanInput, setKoreanInput] = useState('');
  const [japaneseOutput, setJapaneseOutput] = useState('');
  const [pronunciation, setPronunciation] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDbSaving, setIsDbSaving] = useState(false);
  const [createStatus, setCreateStatus] = useState({ type: null as 'success' | 'error' | null, message: '' });
  
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Omit<Phrase, 'id'>>({
    expression: { jp: '', kr: '' },
    pronunciation: '',
  });

  const fetchPhrases = async () => {
    setIsListLoading(true);
    setListError(null);
    try {
      const response = await fetch(API_ENDPOINT);
      if (!response.ok) throw new Error('데이터를 불러오는 데 실패했습니다.');
      const data = await response.json();
      setPhrases(data.items || []);
    } catch (err) {
      setListError(err instanceof Error ? err.message : '알 수 없는 오류 발생');
    } finally {
      setIsListLoading(false);
    }
  };
  
  const fetchAiSuggestions = async (koreanPhrase: string): Promise<AiResponse> => {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ koreanText: koreanPhrase })
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '알 수 없는 AI 서버 오류' }));
        throw new Error(errorData.message || `AI 서버 오류: ${response.status}`);
    }
    return await response.json();
  };

  const createPhrase = async (data: Omit<Phrase, 'id'>) => {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '알 수 없는 DB 서버 오류' }));
        throw new Error(errorData.message || `DB 서버 오류: ${response.status}`);
    }
    return await response.json();
  };

  const updatePhrase = async (id: string, data: Omit<Phrase, 'id'>) => {
    const response = await fetch(API_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });
      if (!response.ok) throw new Error('데이터 수정에 실패했습니다.');
  };

  const deletePhrase = async (id: string) => {
     const response = await fetch(API_ENDPOINT, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
     if (!response.ok) throw new Error('데이터 삭제에 실패했습니다.');
  };

  useEffect(() => {
    fetchPhrases();
  }, []);
  
  const handleGenerate = async () => {
    if (!koreanInput.trim()) {
      setCreateStatus({ type: 'error', message: '먼저 한국어 표현을 입력해주세요.' });
      return;
    }
    setIsAiLoading(true);
    setCreateStatus({ type: null, message: '' });
    try {
      const aiResult = await fetchAiSuggestions(koreanInput);
      setJapaneseOutput(aiResult.japaneseTranslation);
      setPronunciation(aiResult.koreanPronunciation);
      setCreateStatus({ type: 'success', message: 'AI 생성이 완료되었습니다. 내용을 확인하고 저장하세요.' });
    } catch (error) {
      setCreateStatus({ type: 'error', message: `AI 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}` });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!koreanInput.trim() || !japaneseOutput.trim() || !pronunciation.trim()) {
      setCreateStatus({ type: 'error', message: '모든 필드를 채워주세요.' });
      return;
    }
    setIsDbSaving(true);
    setCreateStatus({ type: null, message: '' });
    try {
      await createPhrase({
        expression: { jp: japaneseOutput, kr: koreanInput },
        pronunciation: pronunciation,
      });
      setCreateStatus({ type: 'success', message: '성공적으로 저장되었습니다!' });
      setKoreanInput('');
      setJapaneseOutput('');
      setPronunciation('');
      await fetchPhrases();
    } catch (error) {
      setCreateStatus({ type: 'error', message: `저장 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}` });
    } finally {
      setIsDbSaving(false);
    }
  };
  
  const handleEditClick = (phrase: Phrase) => {
    setEditingId(phrase.id);
    setEditingData({ 
      expression: { ...phrase.expression }, 
      pronunciation: phrase.pronunciation 
    });
  };

  const handleUpdateSave = async (id: string) => {
    try {
        await updatePhrase(id, editingData);
        setEditingId(null);
        await fetchPhrases();
    } catch (err) {
        setListError(err instanceof Error ? err.message : "수정 실패");
    }
  };

  const handleCancelEdit = () => setEditingId(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm('정말로 이 항목을 삭제하시겠습니까?')) return;
    try {
        await deletePhrase(id);
        await fetchPhrases();
    } catch (err) {
        setListError(err instanceof Error ? err.message : "삭제 실패");
    }
  };

  const handleEditChange = (field: 'jp' | 'kr' | 'pronunciation', value: string) => {
    setEditingData(prev => ({
        ...prev,
        expression: (field === 'jp' || field === 'kr') ? { ...prev.expression, [field]: value } : prev.expression,
        pronunciation: field === 'pronunciation' ? value : prev.pronunciation
    }));
  };

  return (
    <div className="bg-slate-100 min-h-screen p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-800">새 콘텐츠 생성</h1>
            <p className="text-slate-500 mt-2">AI로 일본어 표현을 생성하고 DB에 추가합니다.</p>
          </header>
          <div className="space-y-6">
            <div>
              <label htmlFor="korean-input" className="block text-lg font-medium text-slate-700 mb-2">1. 한국어 표현 입력</label>
              <textarea
                id="korean-input"
                rows={3}
                className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                placeholder="여기에 번역할 한국어 문장을 입력하세요..."
                value={koreanInput}
                onChange={(e) => setKoreanInput(e.target.value)}
                disabled={isAiLoading || isDbSaving}
              />
            </div>
            <div className="text-center">
              <button
                onClick={handleGenerate}
                disabled={isAiLoading || isDbSaving || !koreanInput}
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-transform transform hover:scale-105"
              >
                {isAiLoading ? '생성 중...' : '🤖 AI로 번역/발음 생성'}
              </button>
            </div>
            <div>
              <label className="block text-lg font-medium text-slate-700 mb-2">2. AI 생성 결과 확인 및 수정</label>
              <div className="space-y-4">
                <input type="text" placeholder="AI가 생성한 일본어 번역" value={japaneseOutput} onChange={(e) => setJapaneseOutput(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-md"/>
                <input type="text" placeholder="AI가 생성한 한글 발음" value={pronunciation} onChange={(e) => setPronunciation(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-md"/>
              </div>
            </div>
          </div>
          <div className="mt-8 text-center">
            {createStatus.message && (
              <div className={`p-4 rounded-md mb-6 ${createStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {createStatus.message}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={isAiLoading || isDbSaving || !japaneseOutput}
              className="w-full px-8 py-4 bg-green-600 text-white font-bold text-xl rounded-md hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-transform transform hover:scale-105"
            >
              {isDbSaving ? '저장 중...' : '💾 DB에 새로 저장하기'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg">
           <header className="p-6 border-b">
             <h2 className="text-2xl font-bold text-slate-800">콘텐츠 관리 대시보드</h2>
             <p className="text-slate-500 mt-1">저장된 표현을 확인, 수정, 삭제합니다.</p>
           </header>
          {listError && <div className="m-6 bg-red-100 text-red-700 p-4 rounded-md">{listError}</div>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                <tr>
                  <th className="px-6 py-3">한국어</th>
                  <th className="px-6 py-3">일본어</th>
                  <th className="px-6 py-3">발음</th>
                  <th className="px-6 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {isListLoading ? (
                  <tr><td colSpan={4} className="text-center p-8">목록을 불러오는 중...</td></tr>
                ) : phrases.map((phrase) => (
                  <tr key={phrase.id} className="bg-white border-b hover:bg-slate-50">
                    {editingId === phrase.id ? (
                      <>
                        <td className="px-6 py-4"><input value={editingData.expression.kr} onChange={(e) => handleEditChange('kr', e.target.value)} className="w-full p-1 border rounded-md" /></td>
                        <td className="px-6 py-4"><input value={editingData.expression.jp} onChange={(e) => handleEditChange('jp', e.target.value)} className="w-full p-1 border rounded-md" /></td>
                        <td className="px-6 py-4"><input value={editingData.pronunciation} onChange={(e) => handleEditChange('pronunciation', e.target.value)} className="w-full p-1 border rounded-md" /></td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => handleUpdateSave(phrase.id)} className="font-medium text-green-600 hover:underline">저장</button>
                          <button onClick={handleCancelEdit} className="font-medium text-slate-500 hover:underline">취소</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 font-medium">{phrase.expression.kr}</td>
                        <td className="px-6 py-4">{phrase.expression.jp}</td>
                        <td className="px-6 py-4">{phrase.pronunciation}</td>
                        <td className="px-6 py-4 text-right space-x-4">
                          <button onClick={() => handleEditClick(phrase)} className="font-medium text-blue-600 hover:underline">수정</button>
                          <button onClick={() => handleDelete(phrase.id)} className="font-medium text-red-600 hover:underline">삭제</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

