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

const HYBRID_ATLAS_URL = '/assets/monster-atlas-v1.webp';
const HYBRID_TIER_MAP = [0, 1, 2, 3, 4, 5, 6, 7, 7];
const HYBRID_IRIS = [
  '#245ee8',
  '#13a757',
  '#7230a8',
  '#6b3519',
  '#a84a16',
  '#7831b5',
  '#1977df',
  '#7f4b25',
  '#7f4b25',
];

const hybridAtlas = new Image();
hybridAtlas.decoding = 'async';
hybridAtlas.src = HYBRID_ATLAS_URL;

type FaceMode = 'normal' | 'cyclops' | 'closed' | 'wink';

function faceMode(tier: number): FaceMode {
  if (tier === 1 || tier === 6) return 'cyclops';
  if (tier === 3) return 'closed';
  if (tier >= 7) return 'wink';
  return 'normal';
}

function atlasIndex(tier: number) {
  return HYBRID_TIER_MAP[Math.min(MAX_TIER, tier)] ?? 7;
}

function atlasPosition(index: number) {
  return {
    column: index % 4,
    row: Math.floor(index / 4),
  };
}

export function MonsterArt({ tier, size = 42 }: { tier: number; size?: number }) {
  const index = atlasIndex(tier);
  const { column, row } = atlasPosition(index);
  const mode = faceMode(tier);
  return (
    <span
      className={'monster-art face-' + mode}
      data-tier={tier}
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      <span
        className="monster-body"
        style={{
          backgroundImage: 'url(' + HYBRID_ATLAS_URL + ')',
          backgroundSize: '400% 200%',
          backgroundPosition:
            String((column / 3) * 100) + '% ' + String(row * 100) + '%',
        }}
      />
      <span className="thumb-eye thumb-eye-left"><i /></span>
      <span className="thumb-eye thumb-eye-right"><i /></span>
      <span className="thumb-mouth" />
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

function drawEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  pupilX: number,
  pupilY: number,
  pupilRadius: number,
  iris: string,
) {
  ctx.fillStyle = '#fffdf5';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(72,40,45,.22)';
  ctx.lineWidth = Math.max(0.7, rx * 0.07);
  ctx.stroke();

  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(x + pupilX, y + pupilY, pupilRadius * 1.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#14203c';
  ctx.beginPath();
  ctx.arc(x + pupilX, y + pupilY, pupilRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(
    x + pupilX - pupilRadius * 0.32,
    y + pupilY - pupilRadius * 0.36,
    pupilRadius * 0.27,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

function drawClosedEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
) {
  ctx.strokeStyle = '#4e2638';
  ctx.lineWidth = Math.max(1.3, width * 0.14);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - width / 2, y);
  ctx.quadraticCurveTo(x, y - width * 0.34, x + width / 2, y);
  ctx.stroke();
}

function drawRuntimeFace(
  ctx: CanvasRenderingContext2D,
  body: Pick<Body, 'id' | 'tier' | 'x' | 'y'> & {
    pressure?: number;
    impact?: number;
  },
  radius: number,
  time: number,
  gazeTargetX = body.x,
  gazeTargetY = body.y,
  attention = 0,
) {
  const tier = Math.min(MAX_TIER, body.tier);
  const mode = faceMode(tier);
  const pressure = Math.min(1, body.pressure ?? 0);
  const impact = Math.min(1, body.impact ?? 0);
  const attentionLevel = Math.min(1, attention);
  const nervous = pressure > 0.42;
  const blink =
    !nervous &&
    ((time * 0.001 + body.id * 0.83) % (3.15 + (Math.abs(body.id) % 4) * 0.22)) <
      0.13;

  const targetX = gazeTargetX - body.x;
  const targetY = gazeTargetY - body.y;
  const targetLength = Math.max(1, Math.hypot(targetX, targetY));
  const gazeScaleX = radius * (0.055 + attentionLevel * 0.025);
  const gazeScaleY = radius * (0.04 + attentionLevel * 0.018);
  const idleWeight = Math.max(0, 1 - attentionLevel);
  const idleGazeX =
    Math.sin(time * 0.00135 + body.id * 1.31) * radius * 0.027 * idleWeight;
  const idleGazeY =
    Math.cos(time * 0.00105 + body.id * 0.73) * radius * 0.018 * idleWeight;
  const gazeX = (targetX / targetLength) * gazeScaleX + idleGazeX;
  const gazeY = (targetY / targetLength) * gazeScaleY + idleGazeY;
  const eyeY = -radius * (nervous ? 0.15 : 0.13);
  const iris = HYBRID_IRIS[tier] ?? '#315ed8';

  if (mode === 'closed') {
    drawClosedEye(ctx, -radius * 0.24, eyeY, radius * 0.25);
    drawClosedEye(ctx, radius * 0.24, eyeY, radius * 0.25);
  } else if (mode === 'cyclops') {
    if (blink) {
      drawClosedEye(ctx, 0, eyeY, radius * 0.42);
    } else {
      drawEye(
        ctx,
        0,
        eyeY,
        radius * 0.34,
        radius * (nervous ? 0.28 : 0.36),
        gazeX * 1.2,
        gazeY,
        radius * 0.14,
        iris,
      );
    }
  } else if (mode === 'wink') {
    if (blink) {
      drawClosedEye(ctx, -radius * 0.23, eyeY, radius * 0.24);
    } else {
      drawEye(
        ctx,
        -radius * 0.23,
        eyeY,
        radius * 0.22,
        radius * 0.28,
        gazeX,
        gazeY,
        radius * 0.095,
        iris,
      );
    }
    drawClosedEye(ctx, radius * 0.24, eyeY + radius * 0.015, radius * 0.23);
  } else if (blink) {
    drawClosedEye(ctx, -radius * 0.23, eyeY, radius * 0.23);
    drawClosedEye(ctx, radius * 0.23, eyeY, radius * 0.23);
  } else {
    const eyeRy = radius * (nervous ? 0.235 : 0.28);
    drawEye(
      ctx,
      -radius * 0.23,
      eyeY,
      radius * 0.215,
      eyeRy,
      gazeX,
      gazeY,
      radius * 0.095,
      iris,
    );
    drawEye(
      ctx,
      radius * 0.23,
      eyeY,
      radius * 0.215,
      eyeRy,
      gazeX,
      gazeY,
      radius * 0.095,
      iris,
    );
  }

  if (tier === 0 || tier === 2 || tier === 3) {
    ctx.fillStyle = 'rgba(255,112,144,.34)';
    ctx.beginPath();
    ctx.arc(-radius * 0.52, radius * 0.12, radius * 0.095, 0, Math.PI * 2);
    ctx.arc(radius * 0.52, radius * 0.12, radius * 0.095, 0, Math.PI * 2);
    ctx.fill();
  }

  if (nervous) {
    ctx.strokeStyle = '#5c2939';
    ctx.lineWidth = Math.max(1.3, radius * 0.045);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-radius * 0.17, radius * 0.28);
    ctx.quadraticCurveTo(
      -radius * 0.05,
      radius * 0.21,
      0,
      radius * 0.3,
    );
    ctx.quadraticCurveTo(
      radius * 0.06,
      radius * 0.39,
      radius * 0.18,
      radius * 0.29,
    );
    ctx.stroke();
    if (pressure > 0.62) {
      ctx.fillStyle = 'rgba(190,242,255,.92)';
      ctx.beginPath();
      ctx.ellipse(
        radius * 0.58,
        -radius * 0.31,
        radius * 0.065,
        radius * 0.115,
        -0.35,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    return;
  }

  ctx.fillStyle = '#5c2031';
  ctx.beginPath();
  if (attentionLevel > 0.72 || impact > 0.52) {
    ctx.ellipse(
      0,
      radius * 0.25,
      radius * 0.155,
      radius * 0.18,
      0,
      0,
      Math.PI * 2,
    );
  } else {
    ctx.arc(
      0,
      radius * 0.19,
      radius * 0.23,
      0.07 * Math.PI,
      0.93 * Math.PI,
    );
    ctx.lineTo(-radius * 0.23, radius * 0.19);
  }
  ctx.fill();

  ctx.fillStyle = '#ff6475';
  ctx.beginPath();
  ctx.ellipse(
    0,
    radius * 0.31,
    radius * 0.105,
    radius * 0.07,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  if (tier === 2 || tier === 4 || tier === 5 || tier === 6) {
    ctx.fillStyle = '#fff8eb';
    const fangY = radius * 0.18;
    const fangSize = radius * 0.1;
    for (const x of tier === 6 ? [-0.13, 0.13] : [-0.11]) {
      ctx.beginPath();
      ctx.moveTo(x * radius - fangSize * 0.45, fangY);
      ctx.lineTo(x * radius + fangSize * 0.45, fangY);
      ctx.lineTo(x * radius, fangY + fangSize);
      ctx.closePath();
      ctx.fill();
    }
  }
}

export function drawMonster(
  ctx: CanvasRenderingContext2D,
  body: Pick<Body, 'id' | 'tier' | 'x' | 'y' | 'r' | 'angle' | 'impact' | 'pressure'> &
    Partial<Pick<Body, 'vx' | 'vy'>>,
  time: number,
  alpha = 1,
  gazeX = body.x,
  gazeY = body.y,
  attention = 0,
) {
  const index = atlasIndex(body.tier);
  const { column, row } = atlasPosition(index);
  const speed = Math.hypot(body.vx ?? 0, body.vy ?? 0);
  const idle =
    !prefersReducedMotion() && speed < 70
      ? Math.sin(time * 0.0021 + body.id * 1.19)
      : 0;
  const pressure = Math.min(1, body.pressure ?? 0);
  const impact = Math.min(1, body.impact ?? 0);
  const motionScale = prefersReducedMotion() ? 0.6 : 1;
  const squash = (impact * 0.075 + pressure * 0.035) * motionScale;
  const breathe = idle * 0.018 * (1 - pressure) * motionScale;
  const nervous =
    !prefersReducedMotion() && pressure > 0.46
      ? Math.sin(time * 0.025 + body.id) * 0.018
      : 0;
  const radius = body.r * (body.tier >= 5 ? 1.08 : 1.12);
  const size = radius * 2.46;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(body.x, body.y);
  ctx.rotate(body.angle + nervous);
  ctx.scale(1 + squash - breathe * 0.18, 1 - squash + breathe);

  if (hybridAtlas.complete && hybridAtlas.naturalWidth > 0) {
    const sw = hybridAtlas.naturalWidth / 4;
    const sh = hybridAtlas.naturalHeight / 2;
    ctx.drawImage(
      hybridAtlas,
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

  drawRuntimeFace(ctx, body, radius, time, gazeX, gazeY, attention);
  ctx.restore();
}
