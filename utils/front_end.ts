import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function copy(str: string) {
  const textArea = document.createElement("textarea");
  textArea.value = str;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

export function goto(pathname: string, target: "_blank" = "_blank") {
  if (pathname.startsWith("http")) {
    return window.open(pathname, target);
  }
  const { origin } = window.location;
  const url = origin + pathname;
  window.open(url, target);
}
