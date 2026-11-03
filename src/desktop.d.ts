export interface DesktopAPI {
  pickFolder(): Promise<string | null>;
  pickFolders(): Promise<string[]>;
  isDesktop: boolean;
  version(): Promise<string>;
}

declare global {
  interface Window {
    desktopAPI?: DesktopAPI;
  }
}

export {};
