// 主题 + 字号偏好：localStorage 持久化，写到 <html> 上让 CSS 变量实时生效

export type Theme = 'dark' | 'light';
export type FontScale = 'standard' | 'large';

const THEME_LS = 'appearance_theme';
const FONT_LS = 'appearance_font_scale';

export function getTheme(): Theme {
  const v = localStorage.getItem(THEME_LS);
  return v === 'light' ? 'light' : 'dark'; // 默认深色
}

export function getFontScale(): FontScale {
  return localStorage.getItem(FONT_LS) === 'large' ? 'large' : 'standard';
}

export function setTheme(t: Theme) {
  localStorage.setItem(THEME_LS, t);
  applyTheme(t);
}

export function setFontScale(s: FontScale) {
  localStorage.setItem(FONT_LS, s);
  applyFontScale(s);
}

export function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(t);
}

export function applyFontScale(s: FontScale) {
  // 通过 data 属性 + CSS 变量控制 html 字号
  const root = document.documentElement;
  if (s === 'large') {
    root.style.setProperty('--font-size', '20px');
  } else {
    root.style.removeProperty('--font-size'); // 退回 theme.css 里的默认值 18px
  }
}

// 启动时调用一次（main.tsx 引入前）
export function applyAppearance() {
  applyTheme(getTheme());
  applyFontScale(getFontScale());
}
