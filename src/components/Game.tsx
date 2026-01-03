import { useCallback, useEffect, useRef, useState } from "react";
import { playJumpSound, playCrashSound, playMilestoneSound, playSpeedUpSound, playPowerUpSound } from "@/lib/sounds";
import { useIsMobile } from "@/hooks/use-mobile";

interface Obstacle {
  id: number;
  x: number;
  width: number;
  height: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface PowerUp {
  id: number;
  x: number;
  y: number;
  size: number;
}

const GROUND_Y = 120;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 50;
const PLAYER_X = 80;
const JUMP_FORCE = 15;
const GRAVITY = 0.8;
const BASE_SPEED = 5;
const SPEED_INCREMENT = 0.7;
const SPAWN_INTERVAL_BASE = 1800;
const SPAWN_INTERVAL_MIN = 800;
const POWERUP_SIZE = 25;

export const Game = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "dead">("idle");
  const [score, setScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 });
  const isMobile = useIsMobile();
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("neonRunnerHighScore");
    return saved ? parseInt(saved) : 0;
  });

  // Responsive canvas sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const maxWidth = Math.min(containerWidth, 800);
        const height = maxWidth * 0.5; // maintain 2:1 aspect ratio
        setCanvasSize({ width: maxWidth, height });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const gameRef = useRef({
    playerY: GROUND_Y,
    velocityY: 0,
    isJumping: false,
    hasDoubleJump: false,
    usedDoubleJump: false,
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    powerUps: [] as PowerUp[],
    speed: BASE_SPEED,
    lastSpawn: 0,
    lastPowerUpSpawn: 0,
    spawnInterval: SPAWN_INTERVAL_BASE,
    obstacleId: 0,
    powerUpId: 0,
    lastMilestone: 0,
    lastSpeedLevel: 0,
    frameCount: 0,
    startTime: 0,
  });

  const spawnJumpParticles = useCallback(() => {
    const game = gameRef.current;
    for (let i = 0; i < 8; i++) {
      game.particles.push({
        x: PLAYER_X + PLAYER_WIDTH / 2 + (Math.random() - 0.5) * 20,
        y: GROUND_Y + 5,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 1,
        life: 1,
        maxLife: 1,
        size: Math.random() * 4 + 2,
        color: "hsl(180, 100%, 60%)",
      });
    }
  }, []);

  const spawnDeathParticles = useCallback(() => {
    const game = gameRef.current;
    const centerX = PLAYER_X + PLAYER_WIDTH / 2;
    const centerY = game.playerY + PLAYER_HEIGHT / 2;
    
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30 + Math.random() * 0.5;
      const speed = Math.random() * 8 + 4;
      const isSecondary = Math.random() > 0.5;
      
      game.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        size: Math.random() * 6 + 3,
        color: isSecondary ? "hsl(320, 100%, 60%)" : "hsl(180, 100%, 60%)",
      });
    }
  }, []);

  const resetGame = useCallback(() => {
    gameRef.current = {
      playerY: GROUND_Y,
      velocityY: 0,
      isJumping: false,
      hasDoubleJump: false,
      usedDoubleJump: false,
      obstacles: [],
      particles: [],
      powerUps: [],
      speed: BASE_SPEED,
      lastSpawn: 0,
      lastPowerUpSpawn: 0,
      spawnInterval: SPAWN_INTERVAL_BASE,
      obstacleId: 0,
      powerUpId: 0,
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

    const game = gameRef.current;
    
    // First jump (from ground)
    if (!game.isJumping) {
      game.velocityY = JUMP_FORCE;
      game.isJumping = true;
      game.usedDoubleJump = false;
      playJumpSound();
      spawnJumpParticles();
    } 
    // Double jump (in air, if power-up collected)
    else if (game.hasDoubleJump && !game.usedDoubleJump) {
      game.velocityY = JUMP_FORCE * 0.85;
      game.usedDoubleJump = true;
      game.hasDoubleJump = false;
      playJumpSound();
      // Spawn particles at current position
      for (let i = 0; i < 6; i++) {
        game.particles.push({
          x: PLAYER_X + PLAYER_WIDTH / 2 + (Math.random() - 0.5) * 15,
          y: game.playerY + PLAYER_HEIGHT / 2,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          life: 1,
          maxLife: 1,
          size: Math.random() * 3 + 2,
          color: "hsl(60, 100%, 60%)",
        });
      }
    }
  }, [gameState, resetGame, spawnJumpParticles]);

  // Handle input (keyboard only - touch handled by button on mobile)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [jump]);

  // Handle canvas click/touch (non-mobile or when not using button)
  const handleCanvasInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    jump();
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

      // Spawn power-ups occasionally (every ~500 frames, roughly every 8 seconds)
      if (game.frameCount - game.lastPowerUpSpawn > 500 && Math.random() < 0.02) {
        game.powerUps.push({
          id: game.powerUpId++,
          x: canvas.width + 50,
          y: GROUND_Y + 80 + Math.random() * 60,
          size: POWERUP_SIZE,
        });
        game.lastPowerUpSpawn = game.frameCount;
      }

      // Update obstacles
      game.obstacles = game.obstacles.filter((obs) => {
        obs.x -= game.speed;
        return obs.x > -100;
      });

      // Update power-ups and check collection
      game.powerUps = game.powerUps.filter((pu) => {
        pu.x -= game.speed;
        
        // Check if player collects power-up
        const playerCenterX = PLAYER_X + PLAYER_WIDTH / 2;
        const playerCenterY = game.playerY + PLAYER_HEIGHT / 2;
        const dist = Math.sqrt(
          Math.pow(pu.x - playerCenterX, 2) + 
          Math.pow(pu.y - playerCenterY, 2)
        );
        
        if (dist < pu.size + 20) {
          game.hasDoubleJump = true;
          playPowerUpSound();
          // Spawn collection particles
          for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            game.particles.push({
              x: pu.x,
              y: pu.y,
              vx: Math.cos(angle) * 4,
              vy: Math.sin(angle) * 4,
              life: 1,
              maxLife: 1,
              size: 4,
              color: "hsl(60, 100%, 60%)",
            });
          }
          return false;
        }
        
        return pu.x > -50;
      });

      // Check collisions with obstacles
      for (const obs of game.obstacles) {
        if (checkCollision(obs)) {
          spawnDeathParticles();
          setGameState("dead");
          playCrashSound();
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem("neonRunnerHighScore", score.toString());
          }
          return;
        }
      }

      // Update particles
      game.particles = game.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.15; // gravity
        p.life -= 0.02;
        return p.life > 0;
      });

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

      // Draw power-ups
      for (const pu of game.powerUps) {
        const puScreenY = canvas.height - pu.y;
        const pulse = Math.sin(Date.now() / 150) * 0.2 + 1;
        
        // Outer glow
        ctx.fillStyle = "hsl(60, 100%, 60%)";
        ctx.shadowColor = "hsl(60, 100%, 70%)";
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(pu.x, puScreenY, pu.size * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner core
        ctx.fillStyle = "hsl(45, 100%, 80%)";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(pu.x, puScreenY, pu.size * 0.5 * pulse, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Draw double-jump indicator on player if they have it
      if (game.hasDoubleJump) {
        ctx.strokeStyle = "hsl(60, 100%, 60%)";
        ctx.lineWidth = 2;
        ctx.shadowColor = "hsl(60, 100%, 70%)";
        ctx.shadowBlur = 10;
        ctx.strokeRect(PLAYER_X - 3, playerScreenY - 3, PLAYER_WIDTH + 6, PLAYER_HEIGHT + 6);
        ctx.shadowBlur = 0;
      }

      // Draw particles
      for (const p of game.particles) {
        const particleScreenY = canvas.height - p.y;
        const alpha = p.life / p.maxLife;
        ctx.fillStyle = p.color.replace(")", ` / ${alpha})`).replace("hsl", "hsl");
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, particleScreenY, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
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
  }, [gameState, score, highScore, spawnDeathParticles]);

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

  // Calculate scale factor for responsive canvas drawing
  const scaleFactor = canvasSize.width / 800;

  return (
    <div 
      ref={containerRef} 
      className="relative w-full max-w-4xl mx-auto select-none"
      style={{ touchAction: 'manipulation' }}
    >
      {/* Score display */}
      <div className="absolute top-2 md:top-4 left-2 md:left-4 z-10 font-display">
        <div className="text-lg md:text-2xl text-game-score neon-text-score">
          {score.toString().padStart(5, "0")}
        </div>
        <div className="text-xs md:text-sm text-muted-foreground mt-1">
          HI: {highScore.toString().padStart(5, "0")}
        </div>
      </div>

      {/* Double jump indicator */}
      {gameRef.current.hasDoubleJump && gameState === "playing" && (
        <div className="absolute top-2 md:top-4 right-2 md:right-4 z-10">
          <div className="text-xs md:text-sm text-yellow-400 font-display animate-pulse-glow">
            2x JUMP
          </div>
        </div>
      )}

      {/* Game canvas */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="w-full h-auto border border-border rounded-lg neon-box cursor-pointer"
        onClick={!isMobile ? handleCanvasInteraction : undefined}
        onTouchStart={!isMobile ? handleCanvasInteraction : undefined}
      />

      {/* Overlays */}
      {gameState === "idle" && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg px-4"
          onClick={handleCanvasInteraction}
          onTouchStart={handleCanvasInteraction}
        >
          <h2 className="font-display text-2xl md:text-4xl text-primary neon-text mb-2 md:mb-4 animate-pulse-glow text-center">
            NEON RUN
          </h2>
          <p className="text-foreground/80 text-sm md:text-lg mb-4 md:mb-8 text-center">
            {isMobile ? (
              <>Tap <span className="text-primary">JUMP</span> to start</>
            ) : (
              <>Press <span className="text-primary">SPACE</span> or <span className="text-primary">CLICK</span> to start</>
            )}
          </p>
          <div className="text-muted-foreground text-xs md:text-sm text-center">
            Avoid the <span className="text-secondary">obstacles</span>
          </div>
        </div>
      )}

      {gameState === "dead" && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm rounded-lg px-4"
          onClick={handleCanvasInteraction}
          onTouchStart={handleCanvasInteraction}
        >
          <h2 className="font-display text-2xl md:text-4xl text-destructive mb-2">
            GAME OVER
          </h2>
          <p className="text-xl md:text-3xl font-display text-game-score neon-text-score mb-2 md:mb-4">
            {score}
          </p>
          {score >= highScore && score > 0 && (
            <p className="text-primary text-sm md:text-lg mb-2 md:mb-4 animate-pulse-glow">
              NEW HIGH SCORE!
            </p>
          )}
          <p className="text-foreground/80 text-sm md:text-base text-center">
            {isMobile ? (
              <>Tap <span className="text-primary">JUMP</span> to retry</>
            ) : (
              <>Press <span className="text-primary">SPACE</span> or <span className="text-primary">CLICK</span> to retry</>
            )}
          </p>
        </div>
      )}

      {/* Mobile Jump Button */}
      {isMobile && (
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            jump();
          }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 
            w-32 h-16 rounded-xl
            bg-primary/20 border-2 border-primary
            text-primary font-display text-xl
            active:bg-primary/40 active:scale-95
            transition-all duration-100
            select-none touch-none"
          style={{
            boxShadow: '0 0 20px hsl(180 100% 50% / 0.5), 0 0 40px hsl(180 100% 50% / 0.2)',
            touchAction: 'none'
          }}
        >
          JUMP
        </button>
      )}

      {/* Controls hint - desktop only */}
      {gameState === "playing" && !isMobile && (
        <div className="absolute bottom-4 right-4 text-muted-foreground text-xs">
          SPACE / CLICK to jump
        </div>
      )}
    </div>
  );
};
