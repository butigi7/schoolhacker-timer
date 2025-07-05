import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [duration, setDuration] = useState(0); // 초 단위
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
    const total = Math.floor(seconds); // 👈 소수점 버림
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const drawTimer = (progress, maxProgress, paused = false) => {
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
  
    if (!maxProgress || progress <= 0) return;
  
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + 2 * Math.PI * maxProgress;
    const currentEnd = startAngle + 2 * Math.PI * maxProgress * progress;
  
    // 회색 영역: 진행되지 않은 부분
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, currentEnd, endAngle);
    ctx.closePath();
    ctx.fillStyle = '#222222';
    ctx.fill();
  
    // 빨간 영역: 진행된 부분
    if (progress > 0) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, currentEnd);
      ctx.closePath();
      
      // ✅ paused 매개변수를 사용해 색상 결정 (기존 isPaused 참조 코드 삭제)
      ctx.fillStyle = paused ? '#aa2222' : '#ff4444';
      ctx.fill();
    }
  };
  

  const update = (timestamp) => {
    if (!startTimestamp.current) startTimestamp.current = timestamp;
  
    const elapsed = (timestamp - startTimestamp.current + pausedElapsed.current) / 1000;
    const totalSeconds = duration;
    const remaining = Math.max(totalSeconds - elapsed, 0);
    setTimeLeft(remaining);
  
    const progress = remaining / totalSeconds;
    const maxProgress = duration / 3600; // 기준: 60분 = 3600초
    drawTimer(progress, maxProgress, false);
  
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
    setTimeLeft(duration);
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
      // ✅ 여기 추가: 색상 즉시 반영
      const progress = timeLeft / duration;
      const maxProgress = duration / 3600;
      drawTimer(progress, maxProgress, true);
    } else {
      setIsPaused(false); // 상태만 바꾸고
      startTimestamp.current = null;
      requestRef.current = requestAnimationFrame(update);
    }
  };

  const handleReset = () => {
    cancelAnimationFrame(requestRef.current);
    setIsRunning(false);
    setIsPaused(false);
    pausedElapsed.current = 0;
    setTimeLeft(0);
    drawTimer(0, duration / 60);
  };

  const handleWheel = (e) => {
    if (isRunning || isPaused) return;

    let current = duration / 60;
    let delta = e.deltaY < 0 ? 1 : -1;

    if (!scrollStarted && current % 5 !== 0) {
      setScrollStarted(true);
      if (delta > 0) {
        current = Math.min(60, current + (5 - (current % 5)));
        setScrollDirection('up');
      } else {
        current = Math.max(0, current - (current % 5));
        setScrollDirection('down');
      }
    } else {
      current = Math.min(60, Math.max(0, current + delta * 5));
    }
    const newDuration = current * 60;
    setDuration(newDuration);
    const progress = 1;
    drawTimer(progress, current / 60, isPaused);
  };

  useEffect(() => {
    drawTimer(0, duration / 60);
  }, []);

  return (
    <div className="container">
      <input
        className="time-input"
        type="text"
        value={formatTime(isRunning || isPaused ? timeLeft : duration)}
        onChange={(e) => {
          const val = e.target.value.replace(/[^\d:]/g, '');
          const [m = '0', s = '0'] = val.split(':');
          const minutes = parseInt(m, 10) || 0;
          const seconds = parseInt(s, 10) || 0;
          const total = Math.min(3600, minutes * 60 + seconds);
          if (!isRunning && !isPaused) {
            setScrollStarted(false);
            setDuration(total);
            setTimeLeft(total);
            drawTimer(1, total / 3600);
          }
        }}
        onWheel={handleWheel}
        onClick={() => {
          if (isRunning || isPaused) {
            handleReset();
          }
        }}
      />

      <canvas
        ref={canvasRef}
        className="timer-canvas"
        width={400}
        height={400}
        onClick={isRunning ? handlePause : handleStart}
        onWheel={handleWheel}
      />
    </div>
  );
}

export default App;

//전체 수정함.14:33