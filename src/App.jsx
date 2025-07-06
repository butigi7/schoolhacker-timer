import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function playAlarm() {
  const audio = new Audio('/alarm.mp3');
  audio.play();
}

function App() {
  
  const [duration, setDuration] = useState(0); // 초 단위
  const [timeLeft, setTimeLeft] = useState(0); // 초 단위
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [scrollStarted, setScrollStarted] = useState(false);
  const [isStopwatch, setIsStopwatch] = useState(false);
  const [originalDuration, setOriginalDuration] = useState(0); // 타이머 시작 시의 원래 설정 시간

  const requestRef = useRef(null);
  const startTimestamp = useRef(null);
  const pausedElapsed = useRef(0);
  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  const prevTimeLeft = useRef(timeLeft);
  const prevIsRunning = useRef(isRunning);

  const formatTime = (seconds) => {
    const total = Math.floor(seconds); // 👈 소수점 버림
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleInputChange = (e) => {
    // 모바일에서 가상 키보드로 입력된 값 처리
    if (isRunning || isPaused) return;
    
    const input = e.target;
    const value = input.value;
    
    // 숫자와 콜론만 허용
    const cleaned = value.replace(/[^\d:]/g, '');
    
    // 기본 포맷 유지 (MM:SS)
    if (cleaned.length <= 5) {
      let formatted = cleaned;
      
      // 콜론이 없으면 자동으로 추가
      if (cleaned.length >= 3 && !cleaned.includes(':')) {
        formatted = cleaned.substring(0, 2) + ':' + cleaned.substring(2);
      }
      
      // 포맷이 올바른지 확인
      const parts = formatted.split(':');
      if (parts.length === 2) {
        const minutes = Math.min(parseInt(parts[0] || '0', 10), 59);
        const seconds = Math.min(parseInt(parts[1] || '0', 10), 59);
        const total = Math.min(3600, minutes * 60 + seconds);
        
        formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        setDuration(total);
        setTimeLeft(total);
        setDisplayValue(formatted);
        drawTimer(1, total / 3600, false);
      }
      
      input.value = formatted;
    }
  };

  const handleKeyDown = (e) => {
    const input = e.target;
    const selectionStart = input.selectionStart || 0;
  
    // 숫자 입력 처리
    if (/^\d$/.test(e.key) && !isRunning && !isPaused) {
      e.preventDefault();
      
      const pos = selectionStart;
      
      // ':' 위치(pos === 2)에서 입력하면 다음 위치로 이동
      let actualPos = pos;
      if (pos === 2) {
        actualPos = 3;
      }
      
      // 유효한 위치인지 확인
      if (actualPos < 0 || actualPos > 4) return;
      
      // 현재 값에서 숫자만 추출
      const raw = input.value.replace(/[^\d]/g, '').padStart(4, '0').split('');
      
      // 커서 위치를 숫자 배열 인덱스로 변환
      let digitIndex;
      if (actualPos === 0) {
        digitIndex = 0;
      } else if (actualPos === 1) {
        digitIndex = 1;
      } else if (actualPos === 3) {
        digitIndex = 2;
      } else if (actualPos === 4) {
        digitIndex = 3;
      } else {
        return;
      }
      
      // 해당 위치의 숫자만 대체
      raw[digitIndex] = e.key;
      
      // 새로운 포맷된 값 생성
      const formatted = `${raw[0]}${raw[1]}:${raw[2]}${raw[3]}`;
      
      // 값 설정
      input.value = formatted;
      
      // 시간 계산 및 업데이트
      const minutes = parseInt(raw[0] + raw[1], 10);
      const seconds = Math.min(parseInt(raw[2] + raw[3], 10), 59);
      const total = Math.min(3600, minutes * 60 + seconds);
      
      setDuration(total);
      setTimeLeft(total);
      setDisplayValue(formatted);
      drawTimer(1, total / 3600, false);
      
      // 다음 커서 위치 계산
      let nextPos;
      if (actualPos === 0) {
        nextPos = 1;
      } else if (actualPos === 1) {
        nextPos = 3; // ':' 건너뛰고 초 자리로
      } else if (actualPos === 3) {
        nextPos = 4;
      } else if (actualPos === 4) {
        nextPos = 5;
      } else {
        nextPos = actualPos + 1;
      }
      
      // 커서 위치 설정
      requestAnimationFrame(() => {
        input.selectionStart = input.selectionEnd = Math.min(nextPos, 5);
      });
      
      return;
    }
  
    // Backspace 처리
    if (e.key === 'Backspace' && !isRunning && !isPaused) {
      e.preventDefault();
      let raw = input.value.replace(/[^\d]/g, '').padStart(4, '0').split('');
      let idx = selectionStart < 3 ? selectionStart - 1 : selectionStart - 2;
      if (idx >= 0) {
        raw[idx] = '0';
        const formatted = `${raw[0]}${raw[1]}:${raw[2]}${raw[3]}`;
        input.value = formatted;
  
        const minutes = parseInt(raw[0] + raw[1], 10);
        const seconds = Math.min(parseInt(raw[2] + raw[3], 10), 59);
        const total = Math.min(3600, minutes * 60 + seconds);
  
        setDuration(total);
        setTimeLeft(total);
        setDisplayValue(formatted);
        drawTimer(1, total / 3600, false);
  
        // 커서 왼쪽으로 이동
        requestAnimationFrame(() => {
          input.selectionStart = input.selectionEnd = Math.max(selectionStart - 1 - (selectionStart === 3 ? 1 : 0), 0);
        });
      }
    }
    if (e.key === 'Enter' && !isRunning && !isPaused) {
      e.preventDefault();
      if (duration > 0) {
        handleStart();
        e.target.blur();
      }
    }
    
    // 모바일에서 가상 키보드의 '이동', '완료', '다음' 등의 키 처리
    if ((e.key === 'Go' || e.key === 'Done' || e.key === 'Next' || e.keyCode === 13) && !isRunning && !isPaused) {
      e.preventDefault();
      if (duration > 0) {
        handleStart();
        e.target.blur();
      }
    }
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

    // 시계 눈금 그리기 (게이지 뒤에 그리기)
    ctx.strokeStyle = '#666'; // 검은색(#000)과 짙은 회색(#222)의 중간 색상
    ctx.lineWidth = 2;
    
    // 60개의 분 눈금 (작은 눈금)
    for (let i = 0; i < 60; i++) {
      const angle = (i * 6 - 90) * Math.PI / 180; // 6도씩 (360/60)
      const innerRadius = radius - 7;
      const outerRadius = radius;
      
      const x1 = cx + Math.cos(angle) * innerRadius;
      const y1 = cy + Math.sin(angle) * innerRadius;
      const x2 = cx + Math.cos(angle) * outerRadius;
      const y2 = cy + Math.sin(angle) * outerRadius;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    
    // 12개의 시간 눈금 (큰 눈금)
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 - 90) * Math.PI / 180; // 30도씩 (360/12)
      const innerRadius = radius - 14;
      const outerRadius = radius;
      
      const x1 = cx + Math.cos(angle) * innerRadius;
      const y1 = cy + Math.sin(angle) * innerRadius;
      const x2 = cx + Math.cos(angle) * outerRadius;
      const y2 = cy + Math.sin(angle) * outerRadius;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // 게이지 그리기 (눈금 위에 그리기)
    if (maxProgress > 0 && progress > 0) {
      const startAngle = -Math.PI / 2;
      const currentEnd = startAngle + 2 * Math.PI * maxProgress * progress;

      // 빨간 영역: 진행된 부분만 그리기
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, currentEnd);
      ctx.closePath();
      ctx.fillStyle = paused ? '#aa2222' : '#ff4444';
      ctx.fill();
    }
  };

  const update = (timestamp, forcedStopwatch = isStopwatch) => {
    if (!startTimestamp.current) startTimestamp.current = timestamp;
  
    const elapsed = (timestamp - startTimestamp.current + pausedElapsed.current) / 1000;
  
    let current = 0;
    let progress = 0;
    let maxProgress = 0;
    let shouldContinue = false;
  
    if (forcedStopwatch) {
      current = Math.min(elapsed, 3600);
      progress = current / 3600;
      maxProgress = 1;
      shouldContinue = current < 3600;
      setTimeLeft(current);
    } else {
      const remaining = Math.max(duration - elapsed, 0);
      progress = remaining / duration;
      maxProgress = duration / 3600;
      shouldContinue = remaining > 0;
      setTimeLeft(remaining);
    }
  
    drawTimer(progress, maxProgress, false);
  
    if (shouldContinue) {
      requestRef.current = requestAnimationFrame((ts) => update(ts, forcedStopwatch));
    } else {
      setIsRunning(false);
    }
  };

  const handleStart = () => {
    if (isRunning) return;
    const watchMode = duration <= 0;
    setIsStopwatch(watchMode);
    setTimeLeft(watchMode ? 0 : duration);
    setOriginalDuration(duration); // 타이머 시작 시의 원래 설정 시간 저장
    setIsRunning(true);
    setIsPaused(false);
    pausedElapsed.current = 0;
    startTimestamp.current = null;
  
    drawTimer(0, watchMode ? 1 : duration / 3600, false);
  
    // ⬇️ watchMode 값을 넘김
    requestRef.current = requestAnimationFrame((ts) => update(ts, watchMode));
  };

  const handlePause = () => {
    if (!isRunning) return;
    if (!isPaused) {
      cancelAnimationFrame(requestRef.current);
      pausedElapsed.current += performance.now() - startTimestamp.current;
      setIsPaused(true);
    } else {
      setIsPaused(false);
      startTimestamp.current = null;
      requestRef.current = requestAnimationFrame(update);
    }
  };

  const handleReset = () => {
    cancelAnimationFrame(requestRef.current);
    setIsRunning(false);
    setIsPaused(false);
    setIsStopwatch(false);
    pausedElapsed.current = 0;
    
    // 원래 설정 시간으로 복원
    const resetDuration = originalDuration || duration;
    setDuration(resetDuration);
    setTimeLeft(resetDuration);
  
    // 원래 설정 시간 기준으로 게이지 그리기
    const maxProgress = resetDuration / 3600;
    drawTimer(1, maxProgress, false);
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
    drawTimer(0, 0, false); // 초기 로드 시 눈금만 그리기
  }, []);
  
  useEffect(() => {
    // 이전에 실행 중이었고, 이전 timeLeft가 0보다 크고, 현재 timeLeft가 0일 때 알람 재생
    if (prevIsRunning.current && prevTimeLeft.current > 0 && timeLeft === 0 && !isStopwatch) {
      playAlarm();
    }
    prevTimeLeft.current = timeLeft;
    prevIsRunning.current = isRunning;
  }, [timeLeft, isRunning, isStopwatch]);

  useEffect(() => {
    if (isRunning) {
      const progress = isStopwatch
        ? timeLeft / 3600
        : timeLeft / duration;
      const maxProgress = isStopwatch
        ? 1
        : duration / 3600;
      drawTimer(progress, maxProgress, isPaused);
    }
  }, [isPaused]);



  return (
    <div className="container">
      <input
        ref={inputRef}
        className="time-input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={formatTime(isRunning || isPaused ? timeLeft : duration)}
        onInput={handleInputChange}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        onClick={() => {
          if (isRunning || isPaused) {
            handleReset();
          } else if (duration === 0 && timeLeft === 0) {
            // 정말 초기 상태일 때만 초기화
            setTimeLeft(0);
            drawTimer(0, 0, false); // 눈금만 그리기
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