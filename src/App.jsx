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

    if (!maxProgress || progress <= 0) return;

    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + 2 * Math.PI * maxProgress;
    const currentEnd = startAngle + 2 * Math.PI * maxProgress * progress;

    // 진행되지 않은 회색 영역
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, currentEnd, endAngle);
    ctx.closePath();
    ctx.fillStyle = '#222222';
    ctx.fill();

    // 진행된 빨간 영역
    if (progress > 0) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, currentEnd);
      ctx.closePath();
      ctx.fillStyle = '#ff4444';
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
    drawTimer(0, duration / 60);
  };

  const handleWheel = (e) => {
    if (isRunning || isPaused) return;

    let current = duration;
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

    setDuration(current);
    const progress = 1;
    drawTimer(progress, current / 60);
  };

  useEffect(() => {
    drawTimer(0, duration / 60);
  }, []);

  return (
    <div className="container">
      <input
        className="time-input"
        type="text"
        value={duration}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '');
          const num = Math.min(60, Number(val));
          if (!isRunning && !isPaused) {
            setScrollStarted(false);
            setDuration(num);
            setTimeLeft(num * 60);
            drawTimer(1, num / 60);
          }
        }}
        onWheel={handleWheel}
        onClick={handleReset}
      />

      <canvas
        ref={canvasRef}
        className="timer-canvas"
        width={400}
        height={400}
        onClick={isRunning ? handlePause : handleStart}
        onWheel={handleWheel}
      />

      <div className="time-display">{formatTime(timeLeft)}</div>
    </div>
  );
}

export default App;

//전체 수정함.14:33