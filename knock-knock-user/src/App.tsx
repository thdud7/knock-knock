import { useState, useEffect, useRef } from 'react';

// [중요!] 여기에 실제 Slack 채널 초대 링크를 붙여넣으세요.
const SLACK_CHANNEL_URL = 'https://test-xo22685.slack.com/archives/C09FMCM4E85';

// [중요!] 여기에 1초 뒤에 재생할 음성 파일 경로를 입력하세요.
const AUDIO_FILE_URL = '/images/noot.mp3'; // '/images/' 폴더가 아닌 '/sounds/' 폴더로 경로 수정

function App() {
  const [buttonText, setButtonText] = useState('Slack 채널 참여하기 🚀');

  // audio 요소를 직접 제어하기 위한 ref(리모컨) 생성
  const audioRef = useRef<HTMLAudioElement>(null);

  // useEffect: 컴포넌트가 처음 화면에 렌더링될 때 딱 한 번만 실행됩니다.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().catch(error => {
          console.log('자동 재생이 브라우저 정책에 의해 차단될 수 있습니다:', error);
        });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleButtonClick = () => {
    setButtonText('이동 중입니다...');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans text-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 max-w-lg w-full transform transition-all hover:scale-105 duration-300">
        <header className="mb-6">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden shadow-lg">
            <img src="/images/pingu.jpeg" alt="Pingu" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
            Knock Knock
          </h1>
          <p className="text-slate-500 text-lg mt-2">
            매일 3시 똑똑해지자
          </p>
        </header>
        <main className="mb-8">
          <p className="text-2xl font-medium text-slate-700 leading-relaxed">
            "똑똑! 오늘의 표현이 도착했어요"
          </p>
          <p className="text-slate-600 mt-3">
            매일 오후 3시, Slack에서 새로운 일본어 표현을 받아보세요.<br/>
            여러분의 언어 학습 습관을 만들어 드립니다.
          </p>
        </main>
        <footer>
          <a
            href={SLACK_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleButtonClick}
            className="w-full inline-block bg-blue-600 text-white font-bold text-lg py-4 px-8 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 ease-in-out transform hover:-translate-y-1"
          >
            {buttonText}
          </a>
        </footer>
      </div>

      {/* 화면에 보이지 않는 오디오 플레이어를 반드시 추가해야 합니다! */}
      <audio ref={audioRef} src={AUDIO_FILE_URL} preload="auto" />

      <p className="text-slate-400 mt-8 text-sm">
        &copy; {new Date().getFullYear()} knock-knock Service. All rights reserved.
      </p>
    </div>
  );
}

export default App;

