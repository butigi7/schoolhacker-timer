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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false); // 스크롤 입력 중인지 확인

  const requestRef = useRef(null);
  const startTimestamp = useRef(null);
  const pausedElapsed = useRef(0);
  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  const prevTimeLeft = useRef(timeLeft);
  const prevIsRunning = useRef(isRunning);
  const prevIsStopwatch = useRef(isStopwatch);
  const isResetting = useRef(false);
  const touchStartAngle = useRef(0);
  const touchCurrentAngle = useRef(0);
  const isDragging = useRef(false);
  const dragThreshold = 10; // 드래그 판정 임계값 (픽셀)
  
  // 키보드 이벤트 후 터치 이벤트 간섭 방지
  const keyboardEventTime = useRef(0);
  const touchStartTime = useRef(0);

  const formatTime = (seconds) => {
    const total = Math.floor(seconds); // 👈 소수점 버림
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleInputChange = (e) => {
    // 실행 중일 때는 입력란 직접 수정 불가 (스크롤 입력만 허용)
    if (isRunning || isPaused) return;
    
    const input = e.target;
    const value = input.value;
    const cursorPos = input.selectionStart;
    
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
        drawTimer(1, total / 3600, false);
        
        // 값이 변경되었을 때만 커서 위치 조정
        if (input.value !== formatted) {
          // 커서 위치를 먼저 저장한 후 값 설정
          const savedStart = input.selectionStart;
          const savedEnd = input.selectionEnd;
          
          input.value = formatted;
          
          // 즉시 커서 위치 복원 (깜빡임 방지)
          input.setSelectionRange(savedStart, savedEnd);
        }
      }
    }
  };

  const handleKeyDown = (e) => {
    // 실행 중일 때는 키보드 입력 불가 (스크롤 입력만 허용)
    if (isRunning || isPaused) return;
    
    const input = e.target;
    const selectionStart = input.selectionStart || 0;

    // 숫자 입력 처리
    if (/^\d$/.test(e.key)) {
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
      
      // 커서 위치 설정 - 즉시 적용으로 깜빡임 방지
      const finalPos = Math.min(nextPos, 5);
      input.setSelectionRange(finalPos, finalPos);
      
      return;
    }

    // Backspace 처리
    if (e.key === 'Backspace') {
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
        drawTimer(1, total / 3600, false);

        // 커서 왼쪽으로 이동 - 즉시 적용으로 깜빡임 방지
        const newPos = Math.max(selectionStart - 1 - (selectionStart === 3 ? 1 : 0), 0);
        input.setSelectionRange(newPos, newPos);
      }
    }

    // Enter 키 및 가상 키보드 버튼 처리
    if (e.key === 'Enter' || e.key === 'Go' || e.key === 'Done' || e.key === 'Next' || e.keyCode === 13) {
      e.preventDefault();

      keyboardEventTime.current = Date.now(); // 키보드 이벤트 시간 기록
      
      if (duration > 0) {
        handleStart(); // handleStart에서 blur 처리하므로 여기서는 제거
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
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
      if (!isScrolling) {
        setTimeLeft(current);
      }
    } else {
      const remaining = Math.max(duration - elapsed, 0);
      progress = remaining / duration;
      maxProgress = duration / 3600;
      shouldContinue = remaining > 0;
      if (!isScrolling) {
        setTimeLeft(remaining);
      }
    }
  
    // update 함수에서는 isPaused 상태를 직접 사용하지 않고, 
    // handlePause에서 재시작 시 명시적으로 false를 전달
    drawTimer(progress, maxProgress, false);
  
    if (shouldContinue) {
      requestRef.current = requestAnimationFrame((ts) => update(ts, forcedStopwatch));
    } else {
      setIsRunning(false);
    }
  };

  const handleStart = () => {
    if (isRunning || isPaused) return; // 이미 실행 중이거나 일시정지 상태면 무시
    const watchMode = duration <= 0;
    setIsStopwatch(watchMode);
    setTimeLeft(watchMode ? 0 : duration);
    setOriginalDuration(duration); // 타이머 시작 시의 원래 설정 시간 저장
    setIsRunning(true);
    setIsPaused(false);
    pausedElapsed.current = 0;
    startTimestamp.current = null;
  
    // 타이머 시작 시 입력란 포커스 해제 (모바일에서 커서 제거)
    if (inputRef.current) {
      inputRef.current.blur();
    }
  
    drawTimer(0, watchMode ? 1 : duration / 3600, isPaused);
  
    // ⬇️ watchMode 값을 넘김
    requestRef.current = requestAnimationFrame((ts) => update(ts, watchMode));
  };

  const handlePause = () => {
    if (!isRunning) return;
    if (!isPaused) {
      cancelAnimationFrame(requestRef.current);
      pausedElapsed.current += performance.now() - startTimestamp.current;
      setIsPaused(true);
      
      // 일시정지 시 즉시 색상 업데이트
      const progress = isStopwatch ? timeLeft / 3600 : timeLeft / duration;
      const maxProgress = isStopwatch ? 1 : duration / 3600;
      drawTimer(progress, maxProgress, true);
    } else {
      setIsPaused(false);
      // 재시작 시 pausedElapsed를 고려하여 startTimestamp 설정
      startTimestamp.current = performance.now() - pausedElapsed.current;
      pausedElapsed.current = 0; // 일시정지 해제 시 누적값 초기화
      
      // 재시작 시 즉시 색상 업데이트 (명시적으로 false 전달)
      const progress = isStopwatch ? timeLeft / 3600 : timeLeft / duration;
      const maxProgress = isStopwatch ? 1 : duration / 3600;
      drawTimer(progress, maxProgress, false);
      
      // 약간의 지연 후 update 함수 시작 (상태 업데이트 완료 후)
      setTimeout(() => {
        requestRef.current = requestAnimationFrame(update);
      }, 10);
    }
  };

  const handleReset = () => {
    isResetting.current = true;  // 리셋 시작
    cancelAnimationFrame(requestRef.current);
    setIsRunning(false);
    setIsPaused(false);
    setIsStopwatch(false);
    setScrollStarted(false);  // 스크롤 상태 초기화
    pausedElapsed.current = 0;
    
    const resetDuration = originalDuration || duration;
    setDuration(resetDuration);
    setTimeLeft(resetDuration);
  
    const maxProgress = resetDuration / 3600;
    drawTimer(1, maxProgress, isPaused);
    
    setTimeout(() => {
      isResetting.current = false;  // 리셋 완료
    }, 0);
  };

  // 캔버스 중심에서 터치 위치까지의 각도 계산
  const calculateAngle = (touch, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const x = touch.clientX - cx;
    const y = touch.clientY - cy;
    return Math.atan2(y, x) * 180 / Math.PI;
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentTime = Date.now();
    touchStartTime.current = currentTime;
    
    // 키보드 이벤트 후 300ms 이내의 터치는 무시
    if (currentTime - keyboardEventTime.current < 300) {
      return;
    }
    
    // 터치 시작 위치 저장 (각도 기반)
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    touchStartAngle.current = calculateAngle(touch, canvas);
    touchCurrentAngle.current = touchStartAngle.current;
    isDragging.current = false;
    
    // 터치 이벤트가 발생했음을 표시
    e.target.setAttribute('data-touched', 'true');
    
    // 모바일에서 캔버스 터치 시 키패드 숨김
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    touchCurrentAngle.current = calculateAngle(touch, canvas);
    const angleDiff = touchCurrentAngle.current - touchStartAngle.current;
    let normalizedAngleDiff = angleDiff;
    if (normalizedAngleDiff > 180) {
      normalizedAngleDiff -= 360;
    } else if (normalizedAngleDiff < -180) {
      normalizedAngleDiff += 360;
    }
    if (Math.abs(normalizedAngleDiff) > 5) {
      isDragging.current = true;
      const delta = normalizedAngleDiff > 0 ? 1 : -1;
      if (isRunning || isPaused) {
        setIsScrolling(true);
        const currentSeconds = timeLeft;
        const newSeconds = Math.min(3600, Math.max(0, currentSeconds + delta * 60));
        if (!isStopwatch) {
          // duration은 유지하고 timeLeft만 조정
          setTimeLeft(newSeconds);
          // 경과 시간 보정
          if (isPaused) {
            // 일시정지 상태에서는 pausedElapsed 업데이트
            // pausedElapsed는 일시정지 시점까지의 경과 시간 + 스크롤로 조정된 시간
            const totalElapsed = duration - newSeconds;
            pausedElapsed.current = totalElapsed * 1000;
          } else if (startTimestamp.current) {
            // 실행 중에는 startTimestamp 보정
            const newElapsed = duration - newSeconds;
            startTimestamp.current = performance.now() - (newElapsed * 1000);
          }
        } else {
          setTimeLeft(newSeconds);
        }
        const progress = isStopwatch ? newSeconds / 3600 : newSeconds / (newSeconds || 1);
        drawTimer(progress, isStopwatch ? 1 : newSeconds / 3600, isPaused);
        setTimeout(() => {
          setIsScrolling(false);
        }, 100);
      } else {
        let currentMinutes = duration / 60;
        if (currentMinutes % 1 !== 0) {
          if (delta > 0) {
            currentMinutes = Math.min(60, Math.ceil(currentMinutes));
          } else {
            currentMinutes = Math.max(0, Math.floor(currentMinutes));
          }
        } else {
          currentMinutes = Math.min(60, Math.max(0, currentMinutes + delta));
        }
        const newDuration = currentMinutes * 60;
        setDuration(newDuration);
        setTimeLeft(newDuration);
        const progress = 1;
        drawTimer(progress, currentMinutes / 60, isPaused);
      }
      touchStartAngle.current = touchCurrentAngle.current;
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentTime = Date.now();
    
    // 키보드 이벤트 후 300ms 이내의 터치는 무시
    if (currentTime - keyboardEventTime.current < 300) {
      return;
    }
    
    // 드래그가 아닌 단순 터치인 경우에만 타이머 제어
    if (!isDragging.current) {
      // 현재 상태에 따라 동작 결정
      if (isRunning && !isPaused) {
        handlePause(); // 실행 중이면 일시정지
      } else if (isRunning && isPaused) {
        handlePause(); // 일시정지 중이면 재시작 (handlePause에서 resume 처리)
      } else {
        handleStart(); // 정지 상태면 시작
      }
    }
    
    // 드래그 상태 초기화
    isDragging.current = false;
    touchStartAngle.current = 0;
    touchCurrentAngle.current = 0;
  };

  // 캔버스 이벤트 리스너 등록 시 사용할 이벤트들
  // onTouchStart={handleTouchStart}
  // onTouchMove={handleTouchMove}
  // onTouchEnd={handleTouchEnd}
  // onWheel={handleWheel}
  // onClick={handleCanvasClick}

  const handleCanvasTouch = handleTouchStart;

  const handleCanvasClick = (e) => {
    const currentTime = Date.now();
    
    // 키보드 이벤트 후 300ms 이내의 클릭은 무시 (더 짧은 시간으로 조정)
    if (currentTime - keyboardEventTime.current < 300) {
      return;
    }
    
    // 터치 이벤트가 이미 처리되었다면 클릭 이벤트는 무시
    if (e.target.getAttribute('data-touched') === 'true') {
      e.target.removeAttribute('data-touched');
      return;
    }
    
    // 터치 이벤트와 클릭 이벤트가 동시에 발생하는 경우 방지
    if (currentTime - touchStartTime.current < 100) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // 현재 상태에 따라 동작 결정
    if (isRunning && !isPaused) {
      handlePause(); // 실행 중이면 일시정지
    } else if (isRunning && isPaused) {
      handlePause(); // 일시정지 중이면 재시작 (handlePause에서 resume 처리)
    } else {
      handleStart(); // 정지 상태면 시작
    }
  };

  const handleWheel = (e) => {
    let delta = e.deltaY < 0 ? 1 : -1;

    // 1분 단위로 조절
    if (isRunning || isPaused) {
      setIsScrolling(true);
      const currentSeconds = timeLeft;
      const newSeconds = Math.min(3600, Math.max(0, currentSeconds + delta * 60));
              if (!isStopwatch) {
          // duration은 유지하고 timeLeft만 조정
          setTimeLeft(newSeconds);
          // 경과 시간 보정
          if (isPaused) {
            // 일시정지 상태에서는 pausedElapsed 업데이트
            // pausedElapsed는 일시정지 시점까지의 경과 시간 + 스크롤로 조정된 시간
            const totalElapsed = duration - newSeconds;
            pausedElapsed.current = totalElapsed * 1000;
          } else if (startTimestamp.current) {
            // 실행 중에는 startTimestamp 보정
            const newElapsed = duration - newSeconds;
            startTimestamp.current = performance.now() - (newElapsed * 1000);
          }
        } else {
          setTimeLeft(newSeconds);
        }
      const progress = isStopwatch ? newSeconds / 3600 : newSeconds / duration;
      drawTimer(progress, isStopwatch ? 1 : duration / 3600, isPaused);
      setTimeout(() => {
        setIsScrolling(false);
      }, 100);
    } else {
      let current = duration / 60;
      if (current % 1 !== 0) {
        if (delta > 0) {
          current = Math.min(60, Math.ceil(current));
        } else {
          current = Math.max(0, Math.floor(current));
        }
      } else {
        current = Math.min(60, Math.max(0, current + delta));
      }
      const newDuration = current * 60;
      setDuration(newDuration);
      setTimeLeft(newDuration);
      const progress = 1;
      drawTimer(progress, current / 60, isPaused);
    }
  };

  useEffect(() => {
    drawTimer(0, 0, false); // 초기 로드 시 눈금만 그리기
  }, []);

  // 전체화면 상태 변화 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  useEffect(() => {
    if (prevIsRunning.current && 
        prevTimeLeft.current > 0 && 
        timeLeft === 0 && 
        !isStopwatch && 
        !isResetting.current) {  // 리셋 중이 아닐 때만
      playAlarm();
    }
    prevTimeLeft.current = timeLeft;
    prevIsRunning.current = isRunning;
  }, [timeLeft, isRunning, isStopwatch]);

  // isPaused 변경 시 drawTimer 호출 제거 - 스크롤 입력 시 간섭 방지
  // useEffect(() => {
  //   if (isRunning && !isPaused) {
  //     const progress = isStopwatch
  //       ? timeLeft / 3600
  //       : timeLeft / duration;
  //     const maxProgress = isStopwatch
  //       ? 1
  //       : duration / 3600;
  //     drawTimer(progress, maxProgress, false);
  //   }
  // }, [isPaused]);

  return (
    <div className="container">
      <button 
        className="fullscreen-btn"
        onClick={toggleFullscreen}
        title={isFullscreen ? "전체화면 해제" : "전체화면"}
      >
        <img 
          src={isFullscreen ? "/fullscreen.svg" : "/fullscreen.svg"} 
          alt={isFullscreen ? "전체화면 해제" : "전체화면"}
        />
      </button>
      
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        style={{ 
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
      />
    </div>
  );
}

export default App;