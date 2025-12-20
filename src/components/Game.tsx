import { useCallback, useEffect, useRef, useState } from "react";
import { playJumpSound, playCrashSound, playMilestoneSound, playSpeedUpSound } from "@/lib/sounds";

interface Obstacle {
  id: number;
  x: number;
  width: number;
  height: number;
  y: number; // for flying obstacles
}

const GROUND_Y = 120;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 50;
const PLAYER_X = 80;
const JUMP_FORCE = 15;
const GRAVITY = 0.8;
const BASE_SPEED = 5;
const SPEED_INCREMENT = 0.5;
const SPAWN_INTERVAL_BASE = 1800;
const SPAWN_INTERVAL_MIN = 800;

export const Game = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "dead">("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("neonRunnerHighScore");
    return saved ? parseInt(saved) : 0;
  });

  const gameRef = useRef({
    playerY: GROUND_Y,
    velocityY: 0,
    isJumping: false,
    obstacles: [] as Obstacle[],
    speed: BASE_SPEED,
    lastSpawn: 0,
    spawnInterval: SPAWN_INTERVAL_BASE,
    obstacleId: 0,
    lastMilestone: 0,
    lastSpeedLevel: 0,
    frameCount: 0,
    startTime: 0,
  });

  const resetGame = useCallback(() => {
    gameRef.current = {
      playerY: GROUND_Y,
      velocityY: 0,
      isJumping: false,
      obstacles: [],
      speed: BASE_SPEED,
      lastSpawn: 0,
      spawnInterval: SPAWN_INTERVAL_BASE,
      obstacleId: 0,
      lastMilestone: 0,
      lastSpeedLevel: 0,
      frameCount: 0,
      startTime: Date.now(),
    };
    setScore(0);
  }, []);

  const jump = useCallback(() => {
    if (gameState === "idle") {
      resetGame();
      setGameState("playing");
      return;
    }
    
    if (gameState === "dead") {
      resetGame();
      setGameState("playing");
      return;
    }

    if (!gameRef.current.isJumping) {
      gameRef.current.velocityY = JUMP_FORCE;
      gameRef.current.isJumping = true;
      playJumpSound();
    }
  }, [gameState, resetGame]);

  // Handle input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      jump();
    };

    const handleClick = () => {
      jump();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouch, { passive: false });
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouch);
      window.removeEventListener("click", handleClick);
    };
  }, [jump]);

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const spawnObstacle = () => {
      const types = ["short", "tall", "flying"];
      const type = types[Math.floor(Math.random() * types.length)];
      
      let height: number;
      let y: number;
      let width: number;

      if (type === "short") {
        height = 40;
        y = GROUND_Y;
        width = 25;
      } else if (type === "tall") {
        height = 70;
        y = GROUND_Y;
        width = 20;
      } else {
        height = 30;
        y = GROUND_Y + 60 + Math.random() * 30;
        width = 35;
      }

      gameRef.current.obstacles.push({
        id: gameRef.current.obstacleId++,
        x: canvas.width + 50,
        width,
        height,
        y,
      });
    };

    const checkCollision = (obstacle: Obstacle): boolean => {
      const playerLeft = PLAYER_X;
      const playerRight = PLAYER_X + PLAYER_WIDTH;
      const playerTop = gameRef.current.playerY + PLAYER_HEIGHT;
      const playerBottom = gameRef.current.playerY;

      const obsLeft = obstacle.x;
      const obsRight = obstacle.x + obstacle.width;
      const obsTop = obstacle.y + obstacle.height;
      const obsBottom = obstacle.y;

      return (
        playerRight > obsLeft &&
        playerLeft < obsRight &&
        playerTop > obsBottom &&
        playerBottom < obsTop
      );
    };

    const update = () => {
      const game = gameRef.current;

      // Update player physics
      if (game.isJumping) {
        game.velocityY -= GRAVITY;
        game.playerY += game.velocityY;

        if (game.playerY <= GROUND_Y) {
          game.playerY = GROUND_Y;
          game.isJumping = false;
          game.velocityY = 0;
        }
      }

      // Difficulty scaling
      const elapsedSeconds = (Date.now() - game.startTime) / 1000;
      const speedLevel = Math.floor(elapsedSeconds / 10);
      
      // Play speed up sound when level increases
      if (speedLevel > game.lastSpeedLevel) {
        game.lastSpeedLevel = speedLevel;
        playSpeedUpSound();
      }
      
      game.speed = BASE_SPEED + speedLevel * SPEED_INCREMENT;
      game.spawnInterval = Math.max(
        SPAWN_INTERVAL_MIN,
        SPAWN_INTERVAL_BASE - speedLevel * 100
      );

      // Spawn obstacles
      game.frameCount++;
      if (game.frameCount - game.lastSpawn > game.spawnInterval / 16) {
        spawnObstacle();
        game.lastSpawn = game.frameCount;
      }

      // Update obstacles
      game.obstacles = game.obstacles.filter((obs) => {
        obs.x -= game.speed;
        return obs.x > -100;
      });

      // Check collisions
      for (const obs of game.obstacles) {
        if (checkCollision(obs)) {
          setGameState("dead");
          playCrashSound();
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem("neonRunnerHighScore", score.toString());
          }
          return;
        }
      }

      // Update score
      const newScore = Math.floor(elapsedSeconds * 10);
      
      // Play milestone sound every 100 points
      const currentMilestone = Math.floor(newScore / 100);
      if (currentMilestone > game.lastMilestone) {
        game.lastMilestone = currentMilestone;
        playMilestoneSound();
      }
      
      setScore(newScore);
    };

    const draw = () => {
      const game = gameRef.current;

      // Clear canvas
      ctx.fillStyle = "hsl(220, 20%, 4%)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw ground line
      ctx.strokeStyle = "hsl(180, 100%, 50%)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "hsl(180, 100%, 50%)";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - GROUND_Y + 10);
      ctx.lineTo(canvas.width, canvas.height - GROUND_Y + 10);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw player
      const playerScreenY = canvas.height - game.playerY - PLAYER_HEIGHT;
      ctx.fillStyle = "hsl(180, 100%, 50%)";
      ctx.shadowColor = "hsl(180, 100%, 60%)";
      ctx.shadowBlur = 20;
      ctx.fillRect(PLAYER_X, playerScreenY, PLAYER_WIDTH, PLAYER_HEIGHT);
      ctx.shadowBlur = 0;

      // Draw obstacles
      for (const obs of game.obstacles) {
        const obsScreenY = canvas.height - obs.y - obs.height;
        ctx.fillStyle = "hsl(320, 100%, 60%)";
        ctx.shadowColor = "hsl(320, 100%, 70%)";
        ctx.shadowBlur = 15;
        ctx.fillRect(obs.x, obsScreenY, obs.width, obs.height);
      }
      ctx.shadowBlur = 0;

      // Draw scanlines effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.02)";
      for (let i = 0; i < canvas.height; i += 4) {
        ctx.fillRect(0, i, canvas.width, 2);
      }
    };

    const gameLoop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [gameState, score, highScore]);

  // Draw static state
  useEffect(() => {
    if (gameState === "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and draw background
    ctx.fillStyle = "hsl(220, 20%, 4%)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw ground line
    ctx.strokeStyle = "hsl(180, 100%, 50%)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "hsl(180, 100%, 50%)";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - GROUND_Y + 10);
    ctx.lineTo(canvas.width, canvas.height - GROUND_Y + 10);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw player
    const playerScreenY = canvas.height - GROUND_Y - PLAYER_HEIGHT;
    ctx.fillStyle = "hsl(180, 100%, 50%)";
    ctx.shadowColor = "hsl(180, 100%, 60%)";
    ctx.shadowBlur = 20;
    ctx.fillRect(PLAYER_X, playerScreenY, PLAYER_WIDTH, PLAYER_HEIGHT);
    ctx.shadowBlur = 0;

    // Draw scanlines
    ctx.fillStyle = "rgba(0, 0, 0, 0.02)";
    for (let i = 0; i < canvas.height; i += 4) {
      ctx.fillRect(0, i, canvas.width, 2);
    }
  }, [gameState]);

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Score display */}
      <div className="absolute top-4 left-4 z-10 font-display">
        <div className="text-2xl text-game-score neon-text-score">
          {score.toString().padStart(5, "0")}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          HI: {highScore.toString().padStart(5, "0")}
        </div>
      </div>

      {/* Game canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="w-full h-auto border border-border rounded-lg neon-box"
      />

      {/* Overlays */}
      {gameState === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
          <h2 className="font-display text-4xl text-primary neon-text mb-4 animate-pulse-glow">
            NEON RUN
          </h2>
          <p className="text-foreground/80 text-lg mb-8">
            Press <span className="text-primary">SPACE</span> or{" "}
            <span className="text-primary">TAP</span> to start
          </p>
          <div className="text-muted-foreground text-sm">
            Avoid the <span className="text-secondary">obstacles</span>
          </div>
        </div>
      )}

      {gameState === "dead" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm rounded-lg">
          <h2 className="font-display text-4xl text-destructive mb-2">
            GAME OVER
          </h2>
          <p className="text-3xl font-display text-game-score neon-text-score mb-4">
            {score}
          </p>
          {score >= highScore && score > 0 && (
            <p className="text-primary text-lg mb-4 animate-pulse-glow">
              NEW HIGH SCORE!
            </p>
          )}
          <p className="text-foreground/80">
            Press <span className="text-primary">SPACE</span> or{" "}
            <span className="text-primary">TAP</span> to retry
          </p>
        </div>
      )}

      {/* Controls hint */}
      {gameState === "playing" && (
        <div className="absolute bottom-4 right-4 text-muted-foreground text-xs">
          SPACE / TAP to jump
        </div>
      )}
    </div>
  );
};
