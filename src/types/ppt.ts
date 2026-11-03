export interface PptSlide {
  id: string;
  type: 'title' | 'bullet' | 'imageText' | 'stats' | 'visual';
  title: string;
  subtitle?: string;
  content?: string[];
  imageQuery?: string;
  stats?: { label: string; value: string }[];
}

export interface PptTheme {
  primary: string;
  secondary: string;
  accent: string;
  font: string;
  background: string;
}

export interface PptData {
  theme: PptTheme;
  slides: PptSlide[];
}
