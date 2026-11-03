import { Asset, GameType, Project } from "../types";

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const builtInAssets: Asset[] = [
  { id: "asset-hero", name: "Nova Runner", category: "Characters", type: "sprite", color: "#44f1c8" },
  { id: "asset-coin", name: "Pulse Coin", category: "Objects", type: "sprite", color: "#ffd166" },
  { id: "asset-drone", name: "Patrol Drone", category: "Enemies", type: "sprite", color: "#ff5c8a" },
  { id: "asset-forest", name: "Cyber Forest", category: "Backgrounds", type: "background", color: "#17324d" },
  { id: "asset-click", name: "Arcade Blip", category: "Sounds", type: "audio", color: "#9b8cff" },
  { id: "asset-health", name: "Health Bar", category: "UI", type: "prefab", color: "#38bdf8" },
  { id: "asset-platform", name: "Glass Platform", category: "Prefabs", type: "prefab", color: "#8ee3f5" },
];

const palette: Record<GameType, string> = {
  Platformer: "#44f1c8",
  "Endless Runner": "#ffb703",
  "Top-down Shooter": "#8b5cf6",
  Puzzle: "#38bdf8",
  Racing: "#fb7185",
  Clicker: "#facc15",
};

export function createTemplateProject(type: GameType, title = `${type} Prototype`): Project {
  const accent = palette[type];
  const playerY = type === "Top-down Shooter" || type === "Racing" ? 260 : 300;
  return {
    id: id("project"),
    title,
    type,
    status: "Draft",
    thumbnail: accent,
    lastEdited: now(),
    version: 1,
    assets: builtInAssets,
    config: {
      activeSceneId: "scene-main",
      controls: { keyboard: true, touch: true },
      variables: { score: 0, health: 100, coins: 0, checkpoint: "start" },
      scenes: [
        {
          id: "scene-main",
          name: "Level 1",
          background: "#0b1224",
          camera: { x: 0, y: 0, zoom: 1 },
          entities: [
            {
              id: "entity-player",
              name: "Player",
              kind: "player",
              x: 90,
              y: playerY,
              width: 44,
              height: 54,
              rotation: 0,
              color: accent,
              physics: true,
              collision: true,
              animation: "Run",
              behavior: "Keyboard + touch movement",
              variables: { speed: 220, jump: 420 },
            },
            {
              id: "entity-coin",
              name: "Coin",
              kind: "coin",
              x: 420,
              y: 235,
              width: 32,
              height: 32,
              rotation: 0,
              color: "#ffd166",
              physics: false,
              collision: true,
              animation: "Spin",
              behavior: "Collectible",
              variables: { score: 10 },
            },
            {
              id: "entity-enemy",
              name: "Enemy Drone",
              kind: "enemy",
              x: 560,
              y: 290,
              width: 48,
              height: 42,
              rotation: 0,
              color: "#ff5c8a",
              physics: true,
              collision: true,
              animation: "Hover",
              behavior: "Patrol AI",
              variables: { damage: 20, patrol: 160 },
            },
            {
              id: "entity-platform",
              name: "Start Platform",
              kind: "platform",
              x: 40,
              y: 365,
              width: 620,
              height: 34,
              rotation: 0,
              color: "#2dd4bf",
              physics: false,
              collision: true,
              animation: "None",
              behavior: "Static ground",
              variables: {},
            },
          ],
        },
      ],
      logic: [
        {
          id: "logic-coin",
          trigger: "When player collides with coin",
          condition: "coin is visible",
          actions: ["increase score by 10", "play Arcade Blip", "destroy coin"],
          enabled: true,
        },
        {
          id: "logic-enemy",
          trigger: "When enemy touches player",
          condition: "health is above 0",
          actions: ["reduce health by 20", "shake camera", "restart level if health is 0"],
          enabled: true,
        },
      ],
    },
  };
}

export const templateTypes: GameType[] = [
  "Platformer",
  "Endless Runner",
  "Top-down Shooter",
  "Puzzle",
  "Racing",
  "Clicker",
];
