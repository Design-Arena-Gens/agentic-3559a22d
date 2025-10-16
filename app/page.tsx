"use client";
import { useEffect, useRef, useState } from 'react';

type Pipe = { x: number; gapY: number; passed: boolean };

type GameState = 'menu' | 'playing' | 'gameover';

const WIDTH = 400;
const HEIGHT = 600;
const GROUND = HEIGHT - 80;
const PIPE_GAP = 140;
const PIPE_WIDTH = 60;
const PIPE_INTERVAL_MS = 1500;
const GRAVITY = 0.5;
const FLAP_VELOCITY = -8.5;
const MAX_ROTATION = 45 * (Math.PI / 180);

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [state, setState] = useState<GameState>('menu');
  const [isPaused, setPaused] = useState(false);

  const bird = useRef({ x: 80, y: HEIGHT / 2, vy: 0, r: 0 });
  const pipes = useRef<Pipe[]>([]);
  const lastSpawn = useRef<number>(0);
  const lastTime = useRef<number>(0);

  useEffect(() => {
    const stored = Number(localStorage.getItem('best') || 0);
    setBest(stored);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;

    const spawnPipe = () => {
      const margin = 80;
      const gapY = Math.max(margin, Math.min(GROUND - margin, Math.random() * (GROUND - margin * 2)));
      pipes.current.push({ x: WIDTH + PIPE_WIDTH, gapY, passed: false });
    };

    const resetGame = () => {
      bird.current = { x: 80, y: HEIGHT / 2, vy: 0, r: 0 };
      pipes.current = [];
      setScore(0);
      lastSpawn.current = 0;
      lastTime.current = 0;
    };

    const flap = () => {
      if (state === 'menu') {
        setState('playing');
        resetGame();
        spawnPipe();
        return;
      }
      if (state !== 'playing') return;
      bird.current.vy = FLAP_VELOCITY;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        flap();
      } else if (e.code === 'KeyP') {
        setPaused(p => !p);
      } else if (e.code === 'Enter' && state === 'gameover') {
        setState('menu');
      }
    };

    const onPointer = () => flap();

    window.addEventListener('keydown', onKey);
    canvas.addEventListener('pointerdown', onPointer);

    const drawBackground = () => {
      const grd = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      grd.addColorStop(0, '#70c5ce');
      grd.addColorStop(1, '#e0f7fa');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      // ground
      ctx.fillStyle = '#dfe8a1';
      ctx.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);
      ctx.fillStyle = '#98c379';
      for (let i = 0; i < WIDTH; i += 20) {
        ctx.fillRect(i, GROUND - 6, 12, 6);
      }
    };

    const drawBird = () => {
      const { x, y, vy } = bird.current;
      const radius = 16;
      const rotation = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, vy * 0.05));
      bird.current.r = rotation;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      // body
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      // wing
      ctx.fillStyle = '#ffd84d';
      ctx.beginPath();
      ctx.ellipse(-2, 2, 8, 6, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // eye
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(6, -4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(8, -4, 2, 0, Math.PI * 2);
      ctx.fill();
      // beak
      ctx.fillStyle = '#ff8f00';
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(26, 4);
      ctx.lineTo(16, 8);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    const drawPipes = () => {
      ctx.fillStyle = '#2ecc71';
      for (const pipe of pipes.current) {
        // top pipe
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY - PIPE_GAP / 2);
        // bottom pipe
        ctx.fillRect(pipe.x, pipe.gapY + PIPE_GAP / 2, PIPE_WIDTH, GROUND - (pipe.gapY + PIPE_GAP / 2));
        // lip
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(pipe.x - 4, pipe.gapY - PIPE_GAP / 2 - 20, PIPE_WIDTH + 8, 20);
        ctx.fillRect(pipe.x - 4, pipe.gapY + PIPE_GAP / 2, PIPE_WIDTH + 8, 20);
        ctx.fillStyle = '#2ecc71';
      }
    };

    const aabbCollide = (bx: number, by: number, br: number, p: Pipe) => {
      const birdBox = { x: bx - br, y: by - br, w: br * 2, h: br * 2 };
      const topBox = { x: p.x, y: 0, w: PIPE_WIDTH, h: p.gapY - PIPE_GAP / 2 };
      const botBox = { x: p.x, y: p.gapY + PIPE_GAP / 2, w: PIPE_WIDTH, h: GROUND - (p.gapY + PIPE_GAP / 2) };
      const overlap = (a: any, b: any) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      return overlap(birdBox, topBox) || overlap(birdBox, botBox);
    };

    const update = (dt: number) => {
      if (state !== 'playing' || isPaused) return;
      // bird physics
      bird.current.vy += GRAVITY * dt * 0.06;
      bird.current.y += bird.current.vy;

      // ground and ceiling
      if (bird.current.y + 16 >= GROUND) {
        bird.current.y = GROUND - 16;
        setState('gameover');
      }
      if (bird.current.y - 16 <= 0) {
        bird.current.y = 16;
        bird.current.vy = 0;
      }

      // pipes spawn
      lastSpawn.current += dt;
      if (lastSpawn.current >= PIPE_INTERVAL_MS) {
        lastSpawn.current = 0;
        spawnPipe();
      }

      // move pipes
      for (const pipe of pipes.current) {
        pipe.x -= 2.4 * (dt / 16);
      }

      // score + cleanup
      pipes.current = pipes.current.filter((p) => p.x + PIPE_WIDTH > -10);
      for (const pipe of pipes.current) {
        if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.current.x) {
          pipe.passed = true;
          setScore((s) => s + 1);
        }
      }

      // collisions
      for (const pipe of pipes.current) {
        if (aabbCollide(bird.current.x, bird.current.y, 16, pipe)) {
          setState('gameover');
          break;
        }
      }
    };

    const drawHud = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = '700 28px ui-sans-serif, system-ui';
      ctx.fillText(String(score), WIDTH / 2, 20);
    };

    const drawMenu = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 40px ui-sans-serif, system-ui';
      ctx.fillText('Flappy Bird', WIDTH / 2, HEIGHT / 2 - 80);
      ctx.font = '600 20px ui-sans-serif, system-ui';
      ctx.fillText('Tap or press Space to start', WIDTH / 2, HEIGHT / 2);
    };

    const drawGameOver = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 36px ui-sans-serif, system-ui';
      ctx.fillText('Game Over', WIDTH / 2, HEIGHT / 2 - 80);
      ctx.font = '600 18px ui-sans-serif, system-ui';
      ctx.fillText('Press Enter to return to menu', WIDTH / 2, HEIGHT / 2);
    };

    const loop = (t: number) => {
      const dt = lastTime.current ? t - lastTime.current : 16;
      lastTime.current = t;

      drawBackground();
      drawPipes();
      drawBird();
      drawHud();

      if (state === 'menu') drawMenu();
      if (state === 'gameover') drawGameOver();

      update(dt);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('pointerdown', onPointer);
    };
  }, [state, isPaused, score]);

  useEffect(() => {
    if (state === 'gameover') {
      setBest((prev) => {
        const updated = Math.max(prev, score);
        localStorage.setItem('best', String(updated));
        return updated;
      });
    }
  }, [state, score]);

  return (
    <div className="container">
      <header>Flappy Bird</header>
      <main>
        <div className="card">
          <div className="canvasWrap" style={{ width: WIDTH, height: HEIGHT }}>
            <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />
            <div className="hud">
              <span className="badge">Score: {score}</span>
              <span className="badge">Best: {best}</span>
              <span className="badge">{isPaused ? 'Paused (P)' : 'Press P to Pause'}</span>
            </div>
          </div>
          <div className="controls">
            <button onClick={() => setState('menu')} className="secondary">Menu</button>
            <button onClick={() => setPaused(p => !p)}>{isPaused ? 'Resume' : 'Pause'}</button>
            <button onClick={() => setState('playing')}>Play</button>
          </div>
        </div>
      </main>
      <div className="footer">Built with Next.js on Vercel</div>
    </div>
  );
}
