import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [duration, setDuration] = useState(15); // 분 단위
  const [timeLeft, setTimeLeft] = useState(0); // 초 단위
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const requestRef = useRef(null);
  const startTimestamp = useRef(null);
  const pausedElapsed = useRef(0);

  const canvasRef = useRef(null);

  // ⏳ 남은 시간 표시용
  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${m}:${s}`;
  };

  // 타이머 애니메이션
  const drawTimer = (progress) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 10;

    ctx.clearRect(0, 0, w, h);

    // 1. 배경 원 - 검정색
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // 2. 진행되지 않은 부분 - 아주 어두운 회색
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 - 2 * Math.PI * progress, true);
    ctx.closePath();
    ctx.fillStyle = '#ff4444';
    ctx.fill();

    // 3. 진행된 부분 - 빨간색
    if (progress < 1) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, -Math.PI / 2 - 2 * Math.PI * progress, -Math.PI / 2, true);
      ctx.closePath();
      ctx.fillStyle = '#222222';
      ctx.fill();
    }
  };

  // 타이머 업데이트 함수
  const update = (timestamp) => {
    if (!startTimestamp.current) startTimestamp.current = timestamp;

    const elapsed = (timestamp - startTimestamp.current + pausedElapsed.current) / 1000;
    const totalSeconds = Number(duration) * 60;
    const remaining = Math.max(totalSeconds - elapsed, 0);
    setTimeLeft(remaining);

    const progress = remaining / totalSeconds;
    drawTimer(progress);

    if (remaining > 0) {
      requestRef.current = requestAnimationFrame(update);
    } else {
      setIsRunning(false);
    }
  };

  // start 버튼
  const handleStart = () => {
    const numericDuration = Number(duration);
    if (duration <= 0 || isRunning) return;
    setIsRunning(true);
    setIsPaused(false);
    setTimeLeft(duration * 60);
    pausedElapsed.current = 0;
    startTimestamp.current = null;
    requestRef.current = requestAnimationFrame(update);
  };

  // pause 버튼
  const handlePause = () => {
    if (!isRunning) return; // 타이머가 시작되지 않았으면 무시
  
    if (!isPaused) {
      // 타이머 일시정지
      cancelAnimationFrame(requestRef.current);
      pausedElapsed.current += performance.now() - startTimestamp.current;
      setIsPaused(true);
    } else {
      // 타이머 재개
      startTimestamp.current = null;
      requestRef.current = requestAnimationFrame(update);
      setIsPaused(false);
    }
  };
  

  // reset 버튼
  const handleReset = () => {
    cancelAnimationFrame(requestRef.current);
    setIsRunning(false);
    setIsPaused(false);
    pausedElapsed.current = 0;
    setTimeLeft(0);
    drawTimer(1);
  };

  // 입력란에서 마우스 휠로 시간 조정
  const handleWheel = (e) => {
    if (isRunning || isPaused) return;
    const delta = e.deltaY < 0 ? 5 : -5;
    setDuration(prev => Math.max(0, prev + delta));
  };

  // 초기 한번 타이머 기본 상태 렌더링
  useEffect(() => {
    drawTimer(1);
  }, []);

  return (
    <div
      style={{
        backgroundColor: 'transparent',
        color: 'black',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* 입력란 */}
      <input
        type="text"
        value={duration}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, ''); // 숫자 이외 제거
          if (!isRunning && !isPaused) {
            setDuration(Number(val));
          }
        }}
        onWheel={handleWheel}
        style={{
          appearance: 'none',
          border: '#222222',
          borderRadius: '4px',
          boxShadow: 'none',
          backgroundColor: '#222222',
          color: 'white',
          fontSize: '1.5rem',
          width: '80px',
          height: '40px',
          textAlign: 'center',
          marginTop: '5px',
          marginBottom: '20px'
        }}
      />

      {/* 타이머 원 */}
      <canvas ref={canvasRef} width={400} height={400} style={{ marginBottom: '10px' }} />

      {/* 남은 시간 */}
      <div style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#cccccc' }}>
        {formatTime(timeLeft)}
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '5px' }}>
        <button onClick={handleStart} disabled={isRunning}>START</button>
        <button onClick={handlePause} disabled={!isRunning} style={{ width: '90px', display: 'flex', textAlign: 'center', justifyContent: 'center' }}>
          {isPaused ? 'RESUME' : 'PAUSE'}
        </button>
        <button onClick={handleReset}>RESET</button>
      </div>
    </div>
  );
}

export default App;
