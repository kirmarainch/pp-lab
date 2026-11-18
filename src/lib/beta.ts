import { BETA_CODE_HASHES } from './betaCodes'

const UNLOCK_KEY = 'pplab.beta.unlocked'

// 规范化邀请码：转大写、仅保留 base32 字母表（A–Z、2–7），标准长度为 16 位。
// 短横线/空格/前缀等阅读辅助字符一律剔除，因此带不带分隔符都能校验。
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z2-7]/g, '')
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

// 软门禁：仅在前端比对哈希。能挡普通访客，不防绕过（见 BETA_GATE_SPEC.zh-CN.md）。
export async function verifyCode(input: string): Promise<boolean> {
  const code = normalizeCode(input)
  if (code.length !== 16) return false
  const hash = await sha256Hex(code)
  return BETA_CODE_HASHES.includes(hash)
}

export function isBetaUnlocked(): boolean {
  try {
    return localStorage.getItem(UNLOCK_KEY) === '1'
  } catch {
    return false
  }
}

export function unlockBeta(): void {
  try {
    localStorage.setItem(UNLOCK_KEY, '1')
  } catch {
    // 存储不可用时不阻断本次会话；调用方仍会在内存中置为已解锁。
  }
}