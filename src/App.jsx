import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [duration, setDuration] = useState(0); // 분 단위
  const [timeLeft, setTimeLeft] = useState(0); // 초 단위
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const requestRef = useRef(null);
  const startTimestamp = useRef(null);
  const pausedElapsed = useRef(0);
  const canvasRef = useRef(null);

  const drawTimer = (progress) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 10;

    ctx.clearRect(0, 0, w, h);

    // 배경 원
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#000000';
    ctx.fill();

    if (progress < 1 && progress > 0) {
      // 빨간 게이지
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * progress);
      ctx.closePath();
      ctx.fillStyle = '#ff4444';
      ctx.fill();
    }
  };

  const handleWheel = (e) => {
    if (isRunning || isPaused) return;
    setDuration((prev) => {
      let next;
      if (prev % 5 !== 0) {
        if (e.deltaY < 0) {
          next = Math.min(60, prev + (5 - (prev % 5)));
        } else {
          next = Math.max(0, prev - (prev % 5));
        }
      } else {
        next = e.deltaY < 0 ? Math.min(60, prev + 5) : Math.max(0, prev - 5);
      }
      drawTimer(next / 60);
      return next;
    });
  };

  const handleReset = () => {
    cancelAnimationFrame(requestRef.current);
    setIsRunning(false);
    setIsPaused(false);
    pausedElapsed.current = 0;
    setTimeLeft(0);
    drawTimer(0);
  };

  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    drawTimer(duration / 60);
  }, [duration]);

  useEffect(() => {
    drawTimer(0);
  }, []);

  return (
    <div className="container">
      <input
        className="time-input"
        type="text"
        value={duration}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '');
          if (!isRunning && !isPaused) {
            const clamped = Math.min(Number(val), 60);
            setDuration(clamped);
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
        onWheel={handleWheel}
        onClick={handleReset}
      />

      <div className="time-display">
        {formatTime(duration * 60)}
      </div>

      {/* <div className="buttons">
        <button onClick={handleStart} disabled={isRunning}>START</button>
        <button onClick={handlePause} disabled={!isRunning} className="pause-btn">
          {isPaused ? 'RESUME' : 'PAUSE'}
        </button>
        <button onClick={handleReset}>RESET</button>
      </div> */}
    </div>
  );
}

export default App;
