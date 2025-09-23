export type GameState = 'waiting' | 'running' | 'gameOver';

export type DinosaurStatus = 'running' | 'jumping' | 'ducking';

export interface DinosaurState {
  y: number;
  vy: number; // vertical velocity
  status: DinosaurStatus;
}

export interface Obstacle {
  x: number;
  width: number;
  height: number;
  type: string;
}

export interface ObstacleConfig {
  width: number;
  height: number;
}
