export type View = "landing" | "auth" | "dashboard" | "editor" | "publish" | "profile" | "carRacing" | "truiser" | "railway";
export type Theme = "dark" | "light";
export type AuthMode = "login" | "signup" | "forgot";
export type ProjectStatus = "Draft" | "Testing" | "Published";
export type GameType = "Platformer" | "Endless Runner" | "Top-down Shooter" | "Puzzle" | "Racing" | "Clicker";
export type AssetCategory = "Characters" | "Enemies" | "Objects" | "Backgrounds" | "Sounds" | "UI" | "Prefabs";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "Creator" | "Team" | "Studio";
  plan: "Free" | "Pro" | "Studio";
}

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  type: "sprite" | "audio" | "font" | "background" | "prefab";
  color: string;
  url?: string;
}

export interface Entity {
  id: string;
  name: string;
  kind: "player" | "enemy" | "coin" | "platform" | "camera" | "ui" | "particle" | "checkpoint";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  physics: boolean;
  collision: boolean;
  animation: string;
  behavior: string;
  variables: Record<string, string | number | boolean>;
}

export interface Scene {
  id: string;
  name: string;
  background: string;
  camera: { x: number; y: number; zoom: number };
  entities: Entity[];
}

export interface LogicRule {
  id: string;
  trigger: string;
  condition: string;
  actions: string[];
  enabled: boolean;
}

export interface GameConfig {
  scenes: Scene[];
  activeSceneId: string;
  variables: Record<string, number | string | boolean>;
  logic: LogicRule[];
  controls: { keyboard: boolean; touch: boolean };
}

export interface Project {
  id: string;
  title: string;
  type: GameType;
  status: ProjectStatus;
  thumbnail: string;
  lastEdited: string;
  config: GameConfig;
  assets: Asset[];
  version: number;
}

export interface PublishedGame {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  shareUrl: string;
  plays: number;
  likes: number;
  completionRate: number;
  publishedAt: string;
}
