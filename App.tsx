
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

  const gameLoopRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const nextObstacleTimeRef = useRef<number>(0);

  useEffect(() => {
    const savedHighScore = localStorage.getItem('dinoHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10) || 0);
    }
  }, []);

  const getDinoDimensions = useCallback(() => {
    return dino.status === 'ducking' ? DINO_DUCKING_DIMENSIONS : DINO_RUNNING_DIMENSIONS;
  }, [dino.status]);

  const resetGame = useCallback(() => {
    setGameState('running');
    setDino({ y: GROUND_Y - DINO_RUNNING_DIMENSIONS.height, vy: 0, status: 'running' });
    setObstacles([]);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    nextObstacleTimeRef.current = random(OBSTACLE_INTERVAL_MIN, OBSTACLE_INTERVAL_MAX);
    lastTimeRef.current = 0;
  }, [setGameState, setDino, setObstacles, setScore, setSpeed]);

  const gameLoop = useCallback((time: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = time;
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const deltaTime = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    // Update Dinosaur
    setDino(prevDino => {
      const dimensions = getDinoDimensions();
      let newVy = prevDino.vy + GRAVITY * deltaTime;
      let newY = prevDino.y + newVy * deltaTime;

      const groundPosition = GROUND_Y - dimensions.height;
      if (newY >= groundPosition) {
        newY = groundPosition;
        newVy = 0;
      }
      return { ...prevDino, y: newY, vy: newVy };
    });

    // Update Obstacles
    setObstacles(prevObstacles => {
      return prevObstacles
        .map(obstacle => ({ ...obstacle, x: obstacle.x - speed * deltaTime }))
        .filter(obstacle => obstacle.x > -obstacle.width);
    });

    // Generate new obstacles
    nextObstacleTimeRef.current -= deltaTime * 1000;
    if (nextObstacleTimeRef.current <= 0) {
      const obstacleTypes = Object.keys(OBSTACLE_CONFIGS);
      const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
      const config = OBSTACLE_CONFIGS[type];
      setObstacles(prev => [...prev, {
        ...config,
        x: GAME_WIDTH,
        type,
      }]);
      nextObstacleTimeRef.current = random(OBSTACLE_INTERVAL_MIN, OBSTACLE_INTERVAL_MAX) / (speed / INITIAL_SPEED);
    }
    
    // Update score and speed
    setScore(prev => prev + speed * deltaTime / 10);
    setSpeed(prev => prev + SPEED_INCREASE_RATE * deltaTime);

    // Collision detection
    const dinoDimensions = getDinoDimensions();
    const dinoHitbox = {
      x: 50,
      y: dino.y,
      width: dinoDimensions.width,
      height: dinoDimensions.height
    };

    for (const obstacle of obstacles) {
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

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [dino.y, getDinoDimensions, obstacles, speed, setGameState]);


  useEffect(() => {
    if (gameState === 'running') {
      lastTimeRef.current = 0;
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (gameState === 'gameOver') {
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
  }, [gameState, gameLoop, score, highScore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'running') {
        if ((e.code === 'Space' || e.code === 'ArrowUp')) {
          setDino(prevDino => {
            const isOnGround = prevDino.y >= GROUND_Y - getDinoDimensions().height;
            if(isOnGround) {
               return { ...prevDino, vy: -JUMP_FORCE };
            }
            return prevDino;
          });
        } else if (e.code === 'ArrowDown') {
          setDino(prevDino => ({ ...prevDino, status: 'ducking' }));
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

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, resetGame, getDinoDimensions]);

  const dinoDimensions = getDinoDimensions();
  const groundPosition = GROUND_Y - dinoDimensions.height;
  const dinoYPos = dino.status === 'ducking' && dino.y >= groundPosition ? groundPosition : dino.y;
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-200 font-mono">
      <div 
        className="relative bg-white overflow-hidden border-2 border-gray-400"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
      >
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
            <p className="mt-4 text-lg text-gray-600">Press Space or Up Arrow to start</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
