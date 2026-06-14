import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Deterministic hue from a string (for avatar background color) */
export function nameToHue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return h % 360
}

/** Simple djb2-based hex hash for Gravatar (no crypto dep) */
function djb2(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i)
  return (h >>> 0).toString(16).padStart(8, '0').repeat(4).slice(0, 32)
}

/** Returns Gravatar URL for email (falls back to identicon) */
export function gravatarUrl(email: string, size = 80): string {
  const hash = djb2(email.trim().toLowerCase())
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`
}
