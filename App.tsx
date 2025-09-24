
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  GAME_WIDTH, 
  GAME_HEIGHT, 
  GROUND_Y, 
  DINO_RUNNING_DIMENSIONS, 
  DINO_DUCKING_DIMENSIONS, 
  INITIAL_SPEED, 
  SPEED_INCREASE_RATE, 
  GRAVITY, 
  JUMP_FORCE, 
  OBSTACLE_INTERVAL_MIN, 
  OBSTACLE_INTERVAL_MAX, 
  OBSTACLE_CONFIGS 
} from './constants';
import { GameState, DinosaurState, DinosaurStatus, Obstacle } from './types';

const random = (min: number, max: number) => Math.random() * (max - min) + min;

const App = () => {
  const [gameState, setGameState] = useState<GameState>('waiting');
  const [dino, setDino] = useState<DinosaurState>({ y: GROUND_Y - DINO_RUNNING_DIMENSIONS.height, vy: 0, status: 'running' });
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [isMuted, setIsMuted] = useState(false);

  // Fix: Initialize useRef with null. The overload for useRef() without arguments
  // might not be available in older TypeScript/React types versions, which would
  // cause the "Expected 1 arguments, but got 0" error.
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const nextObstacleTimeRef = useRef<number>(0);
  const lastScoreMilestone = useRef(0);

  // Sound Refs
  // Fix: The type for sound refs must include `null` because they are conditionally
  // initialized with `null` when `Audio` is not available.
  const jumpSoundRef = useRef<HTMLAudioElement | null>(typeof Audio !== "undefined" ? new Audio('https://actions.google.com/sounds/v1/sports/ball_bounce.ogg') : null);
  const scoreSoundRef = useRef<HTMLAudioElement | null>(typeof Audio !== "undefined" ? new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg') : null);
  const gameOverSoundRef = useRef<HTMLAudioElement | null>(typeof Audio !== "undefined" ? new Audio('https://actions.google.com/sounds/v1/losses/negative_beeps.ogg') : null);
  const duckSoundRef = useRef<HTMLAudioElement | null>(typeof Audio !== "undefined" ? new Audio('https://actions.google.com/sounds/v1/swoosh/swoosh_2.ogg') : null);

  const playSound = useCallback((sound: 'jump' | 'score' | 'gameOver' | 'duck') => {
    if (isMuted) return;

    let soundToPlay: HTMLAudioElement | null = null;
    switch(sound) {
      case 'jump': soundToPlay = jumpSoundRef.current; break;
      case 'score': soundToPlay = scoreSoundRef.current; break;
      case 'gameOver': soundToPlay = gameOverSoundRef.current; break;
      case 'duck': soundToPlay = duckSoundRef.current; break;
    }
    
    if (soundToPlay) {
        soundToPlay.currentTime = 0;
        soundToPlay.play().catch(error => console.error("Error playing sound:", error));
    }
  }, [isMuted]);

  useEffect(() => {
    const savedHighScore = localStorage.getItem('dinoHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10) || 0);
    }
  }, []);

  const getDinoDimensions = useCallback((status: DinosaurStatus) => {
    return status === 'ducking' ? DINO_DUCKING_DIMENSIONS : DINO_RUNNING_DIMENSIONS;
  }, []);

  const resetGame = useCallback(() => {
    setGameState('running');
    setDino({ y: GROUND_Y - DINO_RUNNING_DIMENSIONS.height, vy: 0, status: 'running' });
    setObstacles([]);
    setScore(0);
    lastScoreMilestone.current = 0;
    setSpeed(INITIAL_SPEED);
    nextObstacleTimeRef.current = random(OBSTACLE_INTERVAL_MIN, OBSTACLE_INTERVAL_MAX);
    lastTimeRef.current = 0;
  }, []);

  const gameLoop = useCallback((time: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = time;
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const deltaTime = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    const currentDinoDimensions = getDinoDimensions(dino.status);
    let newDinoVy = dino.vy + GRAVITY * deltaTime;
    let newDinoY = dino.y + newDinoVy * deltaTime;

    const groundPosition = GROUND_Y - currentDinoDimensions.height;
    if (newDinoY >= groundPosition) {
      newDinoY = groundPosition;
      newDinoVy = 0;
    }

    let newObstacles = obstacles
      .map(obstacle => ({ ...obstacle, x: obstacle.x - speed * deltaTime }))
      .filter(obstacle => obstacle.x > -obstacle.width);

    nextObstacleTimeRef.current -= deltaTime * 1000;
    if (nextObstacleTimeRef.current <= 0) {
      const obstacleTypes = Object.keys(OBSTACLE_CONFIGS);
      const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
      const config = OBSTACLE_CONFIGS[type];
      newObstacles.push({
        ...config,
        x: GAME_WIDTH,
        type,
      });
      nextObstacleTimeRef.current = random(OBSTACLE_INTERVAL_MIN, OBSTACLE_INTERVAL_MAX) / (speed / INITIAL_SPEED);
    }
    
    const dinoHitbox = {
      x: 50,
      y: newDinoY,
      width: currentDinoDimensions.width,
      height: currentDinoDimensions.height
    };

    for (const obstacle of newObstacles) {
      const obstacleHitbox = {
        x: obstacle.x,
        y: GROUND_Y - obstacle.height,
        width: obstacle.width,
        height: obstacle.height
      };
      if (
        dinoHitbox.x < obstacleHitbox.x + obstacleHitbox.width &&
        dinoHitbox.x + dinoHitbox.width > obstacleHitbox.x &&
        dinoHitbox.y < obstacleHitbox.y + obstacleHitbox.height &&
        dinoHitbox.y + dinoHitbox.height > obstacleHitbox.y
      ) {
        setGameState('gameOver');
        return;
      }
    }

    setDino(prev => ({ ...prev, y: newDinoY, vy: newDinoVy }));
    setObstacles(newObstacles);
    setScore(prev => prev + speed * deltaTime / 10);
    setSpeed(prev => prev + SPEED_INCREASE_RATE * deltaTime);

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [dino, getDinoDimensions, obstacles, speed]);


  useEffect(() => {
    if (gameState === 'running') {
      lastTimeRef.current = 0;
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (gameState === 'gameOver') {
        playSound('gameOver');
        const finalScore = Math.floor(score);
        if (finalScore > highScore) {
          setHighScore(finalScore);
          localStorage.setItem('dinoHighScore', finalScore.toString());
        }
      }
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, gameLoop, score, highScore, playSound]);
  
  useEffect(() => {
      const currentMilestone = Math.floor(score / 100);
      if (currentMilestone > 0 && currentMilestone > lastScoreMilestone.current) {
        playSound('score');
        lastScoreMilestone.current = currentMilestone;
      }
  }, [score, playSound]);

  const jump = useCallback(() => {
    setDino(prevDino => {
      const dimensions = getDinoDimensions(prevDino.status);
      const isOnGround = prevDino.y >= GROUND_Y - dimensions.height;
      if (isOnGround) {
        playSound('jump');
        return { ...prevDino, vy: -JUMP_FORCE };
      }
      return prevDino;
    });
  }, [getDinoDimensions, playSound]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'running') {
        if ((e.code === 'Space' || e.code === 'ArrowUp')) {
          jump();
        } else if (e.code === 'ArrowDown') {
          setDino(prevDino => {
            if (prevDino.status !== 'ducking') {
              playSound('duck');
            }
            return { ...prevDino, status: 'ducking' };
          });
        }
      } else {
         if (e.code === 'Space' || e.code === 'ArrowUp') {
            resetGame();
         }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameState === 'running' && e.code === 'ArrowDown') {
        setDino(prevDino => ({ ...prevDino, status: 'running' }));
      }
    };
    
    const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        if (gameState === 'running') {
             jump();
        } else {
            resetGame();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('touchstart', handleTouchStart);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [gameState, resetGame, jump, playSound]);

  const dinoDimensions = getDinoDimensions(dino.status);
  const groundPosition = GROUND_Y - dinoDimensions.height;
  const dinoYPos = dino.status === 'ducking' && dino.y >= groundPosition ? groundPosition : dino.y;
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-200 font-mono">
      <div 
        className="relative bg-white overflow-hidden border-2 border-gray-400 select-none"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
      >
        {/* Mute Button */}
        <button 
          onClick={() => setIsMuted(prev => !prev)} 
          className="absolute top-2 left-2 text-gray-600 z-10 p-1"
          aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
        >
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          )}
        </button>
        
        {/* Ground */}
        <div 
          className="absolute bottom-0 left-0 w-full bg-gray-500" 
          style={{ height: 2, bottom: GROUND_Y - GAME_HEIGHT + 20 }}
        ></div>

        {/* Dinosaur */}
        <div 
          className="absolute bg-gray-700"
          style={{
            left: 50,
            bottom: GAME_HEIGHT - dinoYPos - dinoDimensions.height,
            width: dinoDimensions.width,
            height: dinoDimensions.height,
          }}
        ></div>

        {/* Obstacles */}
        {obstacles.map((obstacle, i) => (
          <div 
            key={i}
            className="absolute bg-green-600"
            style={{
              left: obstacle.x,
              bottom: 20,
              width: obstacle.width,
              height: obstacle.height,
            }}
          ></div>
        ))}
        
        {/* Score */}
        <div className="absolute top-2 right-2 text-lg text-gray-600 flex items-center space-x-4">
          <span>HI: {Math.floor(highScore)}</span>
          <span>Score: {Math.floor(score)}</span>
        </div>

        {/* Game State Overlay */}
        {(gameState === 'waiting' || gameState === 'gameOver') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-70">
            <h2 className="text-4xl font-bold text-gray-700">
              {gameState === 'gameOver' ? 'Game Over' : 'Dino Game'}
            </h2>
            <p className="mt-4 text-lg text-gray-600">Press Space/Up Arrow or Tap to start</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;