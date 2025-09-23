import { ObstacleConfig } from './types';

// Game area dimensions
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 250;
export const GROUND_Y = GAME_HEIGHT - 20;

// Dinosaur physics (pixels per second)
export const GRAVITY = 1800;
export const JUMP_FORCE = 650;

// Dinosaur dimensions
export const DINO_RUNNING_DIMENSIONS = { width: 44, height: 47 };
export const DINO_DUCKING_DIMENSIONS = { width: 59, height: 30 };

// Game progression
export const INITIAL_SPEED = 300; // pixels per second
export const SPEED_INCREASE_RATE = 8; // pixels per second squared

// Obstacle generation
export const OBSTACLE_INTERVAL_MIN = 700; // ms
export const OBSTACLE_INTERVAL_MAX = 1800; // ms

// Obstacle configurations
export const OBSTACLE_CONFIGS: { [key: string]: ObstacleConfig } = {
  CACTUS_SMALL: {
    width: 25,
    height: 50,
  },
  CACTUS_LARGE: {
    width: 50,
    height: 50,
  },
};
