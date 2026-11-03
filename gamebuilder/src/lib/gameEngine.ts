import { Entity, GameConfig } from "../types";

export interface EngineFrame {
  time: number;
  selectedId?: string;
  playing: boolean;
}

export function drawGamePreview(canvas: HTMLCanvasElement, config: GameConfig, frame: EngineFrame) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  const scene = config.scenes.find((item) => item.id === config.activeSceneId) ?? config.scenes[0];
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, scene.background);
  gradient.addColorStop(0.55, "#111827");
  gradient.addColorStop(1, "#050816");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  scene.entities.forEach((entity) => drawEntity(ctx, entity, frame));
  ctx.fillStyle = "rgba(255,255,255,.86)";
  ctx.font = "600 16px Inter, system-ui";
  ctx.fillText(`Score ${config.variables.score ?? 0}`, 22, 32);
  ctx.fillText(`Health ${config.variables.health ?? 100}`, 22, 56);
}

function drawEntity(ctx: CanvasRenderingContext2D, entity: Entity, frame: EngineFrame) {
  const pulse = frame.playing ? Math.sin(frame.time / 260 + entity.x) * 4 : 0;
  const x = entity.x + (entity.kind === "enemy" ? pulse * 2 : 0);
  const y = entity.y + (entity.kind === "coin" ? pulse : 0);

  ctx.save();
  ctx.translate(x + entity.width / 2, y + entity.height / 2);
  ctx.rotate((entity.rotation * Math.PI) / 180);
  ctx.translate(-entity.width / 2, -entity.height / 2);

  if (entity.kind === "coin") {
    ctx.fillStyle = entity.color;
    ctx.beginPath();
    ctx.arc(entity.width / 2, entity.height / 2, entity.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.4)";
    ctx.fillRect(entity.width / 2 - 2, 6, 4, entity.height - 12);
  } else if (entity.kind === "platform") {
    ctx.fillStyle = "rgba(45,212,191,.28)";
    roundedRect(ctx, 0, 0, entity.width, entity.height, 10);
    ctx.fill();
    ctx.strokeStyle = entity.color;
    ctx.stroke();
  } else {
    const grad = ctx.createLinearGradient(0, 0, entity.width, entity.height);
    grad.addColorStop(0, entity.color);
    grad.addColorStop(1, "rgba(255,255,255,.22)");
    ctx.fillStyle = grad;
    roundedRect(ctx, 0, 0, entity.width, entity.height, entity.kind === "player" ? 14 : 10);
    ctx.fill();
    ctx.fillStyle = "rgba(5,8,22,.75)";
    ctx.fillRect(entity.width * 0.22, entity.height * 0.25, 7, 7);
    ctx.fillRect(entity.width * 0.62, entity.height * 0.25, 7, 7);
  }

  if (frame.selectedId === entity.id) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(-5, -5, entity.width + 10, entity.height + 10);
  }
  ctx.restore();
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
