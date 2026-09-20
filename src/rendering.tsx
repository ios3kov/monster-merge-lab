import { prefersReducedMotion } from './motion';
import {
  FLOOR_Y,
  HEIGHT,
  LEFT_WALL,
  MAX_TIER,
  RIGHT_WALL,
  TIER_DEFS,
  WIDTH,
  type Body,
} from './physics';

const MONSTER_SPRITE_URL =
  '/assets/concept/monster-sprites.webp';

const monsterSheet = new Image();
monsterSheet.decoding = 'async';
monsterSheet.crossOrigin = 'anonymous';
monsterSheet.src = MONSTER_SPRITE_URL;

function spriteIndex(tier: number) {
  return Math.min(MAX_TIER, Math.max(0, tier));
}

function spritePosition(tier: number) {
  const index = spriteIndex(tier);
  return {
    column: index % 3,
    row: Math.floor(index / 3),
  };
}

export function MonsterArt({ tier, size = 42 }: { tier: number; size?: number }) {
  const { column, row } = spritePosition(tier);
  return (
    <span
      className="monster-art monster-art--reference"
      data-tier={tier}
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      <span
        className="monster-body monster-body--reference"
        style={{
          backgroundImage: 'url(' + MONSTER_SPRITE_URL + ')',
          backgroundSize: '300% 300%',
          backgroundPosition:
            String((column / 2) * 100) + '% ' + String((row / 2) * 100) + '%',
        }}
      />
    </span>
  );
}

export function drawTank(
  ctx: CanvasRenderingContext2D,
  glass: CanvasGradient,
) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  const top = 116;
  ctx.fillStyle = glass;
  ctx.fillRect(LEFT_WALL, top, RIGHT_WALL - LEFT_WALL, FLOOR_Y - top);
}

export function drawMonster(
  ctx: CanvasRenderingContext2D,
  body: Pick<
    Body,
    'id' | 'tier' | 'x' | 'y' | 'r' | 'angle' | 'impact' | 'pressure'
  > &
    Partial<Pick<Body, 'vx' | 'vy'>>,
  time: number,
  alpha = 1,
  _gazeX = body.x,
  _gazeY = body.y,
  _attention = 0,
) {
  const reducedMotion = prefersReducedMotion();
  const { column, row } = spritePosition(body.tier);
  const speed = Math.hypot(body.vx ?? 0, body.vy ?? 0);
  const idle =
    !reducedMotion && speed < 70
      ? Math.sin(time * 0.0021 + body.id * 1.19)
      : 0;
  const pressure = Math.min(1, body.pressure ?? 0);
  const impact = Math.min(1, body.impact ?? 0);
  const motionScale = reducedMotion ? 0.6 : 1;
  const squash = (impact * 0.075 + pressure * 0.035) * motionScale;
  const breathe = idle * 0.018 * (1 - pressure) * motionScale;
  const nervous =
    !reducedMotion && pressure > 0.46
      ? Math.sin(time * 0.025 + body.id) * 0.018
      : 0;
  const visualScale = [
    1.0,
    1.04,
    1.08,
    1.12,
    1.17,
    1.22,
    1.27,
    1.33,
    1.4,
  ] as const;
  const radius = body.r;
  const size =
    radius *
    2.22 *
    (visualScale[Math.min(MAX_TIER, body.tier)] ?? 1);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(body.x, body.y);
  ctx.rotate(body.angle + nervous);
  ctx.scale(1 + squash - breathe * 0.18, 1 - squash + breathe);

  if (monsterSheet.complete && monsterSheet.naturalWidth > 0) {
    const sw = monsterSheet.naturalWidth / 3;
    const sh = monsterSheet.naturalHeight / 3;
    ctx.drawImage(
      monsterSheet,
      column * sw,
      row * sh,
      sw,
      sh,
      -size / 2,
      -size / 2,
      size,
      size,
    );
  } else {
    ctx.fillStyle = TIER_DEFS[body.tier]!.base;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
