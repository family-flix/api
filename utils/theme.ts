export enum Theme {
  light = "light",
  dark = "dark",
}

/**
 * 切换到浅色主题
 */
export function to_light_theme() {
  localStorage.theme = "light";
  document.documentElement.classList.remove("dark");
  document.documentElement.style["colorScheme"] = "light";
}

/**
 * 切换到黑暗主题
 */
export function to_dark_theme() {
  localStorage.theme = "dark";
  document.documentElement.classList.add("dark");
  document.documentElement.style["colorScheme"] = "dark";
}

/**
 * 切换主题
 * @returns
 */
export function toggle_theme() {
  if (document.documentElement.classList.contains("dark")) {
    to_light_theme();
    return Theme.light;
  }
  to_dark_theme();
  return Theme.dark;
}
export function auto_theme() {
  // respect the OS preference
  localStorage.removeItem("theme");
}

/**
 * 获取当前主题
 * @returns
 */
export function get_cur_theme() {
  if (
    localStorage.theme === Theme.dark ||
    (!("theme" in localStorage) &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    return Theme.dark;
  }
  return Theme.light;
}

export function init_theme() {
  if (get_cur_theme() === Theme.dark) {
    to_dark_theme();
    return;
  }
}
