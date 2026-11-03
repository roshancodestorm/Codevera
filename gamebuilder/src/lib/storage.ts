import { Project, PublishedGame, User } from "../types";
import { createTemplateProject } from "../data/templates";

const keys = {
  user: "gameforge:user",
  projects: "gameforge:projects",
  published: "gameforge:published",
};

const fallbackUser: User = {
  id: "user-1",
  name: "Avery Stone",
  email: "avery@gameforge.dev",
  role: "Creator",
  plan: "Pro",
};

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = <T,>(key: string, value: T) => localStorage.setItem(key, JSON.stringify(value));

export const repository = {
  bootstrap() {
    if (!localStorage.getItem(keys.user)) write(keys.user, fallbackUser);
    if (!localStorage.getItem(keys.projects)) {
      write(keys.projects, [
        createTemplateProject("Platformer", "Neon Orchard"),
        createTemplateProject("Top-down Shooter", "Orbit Break"),
        createTemplateProject("Puzzle", "Signal Rooms"),
      ]);
    }
    if (!localStorage.getItem(keys.published)) write(keys.published, []);
  },
  getUser() {
    return read<User>(keys.user, fallbackUser);
  },
  saveUser(user: User) {
    write(keys.user, user);
  },
  getProjects() {
    return read<Project[]>(keys.projects, []);
  },
  saveProjects(projects: Project[]) {
    write(keys.projects, projects);
  },
  getPublished() {
    return read<PublishedGame[]>(keys.published, []);
  },
  savePublished(games: PublishedGame[]) {
    write(keys.published, games);
  },
};
