import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [duration, setDuration] = useState(0); // 분 단위
  const [timeLeft, setTimeLeft] = useState(0); // 초 단위
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [scrollStarted, setScrollStarted] = useState(false);
  const [scrollDirection, setScrollDirection] = useState(null); // 'up' 또는 'down'

  const requestRef = useRef(null);
  const startTimestamp = useRef(null);
  const pausedElapsed = useRef(0);
  const canvasRef = useRef(null);

  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${m}:${s}`;
  };

  // drawTimer(progress) 함수 부분 수정
  const drawTimer = (progress, maxProgress) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 10;

    ctx.clearRect(0, 0, w, h);

    // 배경 원 (전체)
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#222';
    ctx.fill();

    if (progress <= 0) return; // 0보다 작거나 같을 경우 그리지 않음

    // 진행되지 않은 부분 (짙은 회색)
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * (1 - progress));
    ctx.closePath();
    ctx.fillStyle = '#222222';
    ctx.fill();

    // 진행된 빨간 부분
    if (progress > 0) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * progress, false); // 반시계 방향
      ctx.closePath();
      ctx.fillStyle = '#ff4444'; // 빨간색
      ctx.fill();
    }
  };

  const update = (timestamp) => {
    if (!startTimestamp.current) startTimestamp.current = timestamp;

    const elapsed = (timestamp - startTimestamp.current + pausedElapsed.current) / 1000;
    const totalSeconds = duration * 60;
    const remaining = Math.max(totalSeconds - elapsed, 0);
    setTimeLeft(remaining);

    const progress = remaining / totalSeconds;
    const maxProgress = duration / 60;
    drawTimer(progress, maxProgress);

    if (remaining > 0) {
      requestRef.current = requestAnimationFrame(update);
    } else {
      setIsRunning(false);
    }
  };

  const handleStart = () => {
    if (duration <= 0 || isRunning) return;
    setIsRunning(true);
    setIsPaused(false);
    setTimeLeft(duration * 60);
    pausedElapsed.current = 0;
    startTimestamp.current = null;
    requestRef.current = requestAnimationFrame(update);
  };

  const handlePause = () => {
    if (!isRunning) return;
    if (!isPaused) {
      cancelAnimationFrame(requestRef.current);
      pausedElapsed.current += performance.now() - startTimestamp.current;
      setIsPaused(true);
    } else {
      startTimestamp.current = null;
      requestRef.current = requestAnimationFrame(update);
      setIsPaused(false);
    }
  };

  const handleReset = () => {
    cancelAnimationFrame(requestRef.current);
    setIsRunning(false);
    setIsPaused(false);
    pausedElapsed.current = 0;
    setTimeLeft(0);
    drawTimer(0);
  };

  const handleWheel = (e) => {
    if (isRunning || isPaused) return;

    let current = duration;
    let delta = e.deltaY < 0 ? 1 : -1;

    // 5로 나눠떨어지지 않을 경우, 처음 한 번만 정렬
    if (!scrollStarted && current % 5 !== 0) {
      setScrollStarted(true);
      if (delta > 0) {
        current = Math.min(60, current + (5 - (current % 5))); // 업 스크롤
        setScrollDirection('up');
      } else {
        current = Math.max(0, current - (current % 5)); // 다운 스크롤
        setScrollDirection('down');
      }
    } else {
      current = Math.min(60, Math.max(0, current + delta * 5));
    }

    setDuration(current);
    const progress = current / 60;
    drawTimer(0, current / 60);
  };

  useEffect(() => {
    drawTimer(0);
  }, []);

  return (
    <div className="container">
      {/* 입력란 */}
      <input
        className="time-input"
        type="text"
        value={duration}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '');
          const num = Math.min(60, Number(val));
          if (!isRunning && !isPaused) {
            setScrollStarted(false); // 스크롤 보정 초기화
            setDuration(num);
            setTimeLeft(num * 60);
            drawTimer(0, num / 60); // 입력한 시간 비율로 전체 게이지 표시
          }
        }}
        onWheel={handleWheel}
        onClick={handleReset}
      />
  
      {/* 타이머 원 */}
      <canvas
        ref={canvasRef}
        className="timer-canvas"
        width={400}
        height={400}
        onClick={isRunning ? handlePause : handleStart}
        onWheel={handleWheel} // 캔버스 위에서 휠 가능
      />
  
      {/* 남은 시간 표시 */}
      <div className="time-display">{formatTime(timeLeft)}</div>
  
      {/* 버튼 영역은 주석 처리 */}
      {/*
      <div className="buttons">
        <button onClick={handleStart} disabled={isRunning}>START</button>
        <button onClick={handlePause} disabled={!isRunning} className="pause-btn">
          {isPaused ? 'RESUME' : 'PAUSE'}
        </button>
        <button onClick={handleReset}>RESET</button>
      </div>
      */}
    </div>
  );
}

export default App;
