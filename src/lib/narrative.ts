import type { SceneSpec } from './schema'

/**
 * 不生成叙事文案，只把当前条件状态读出来。
 */
export function describeScene(spec: SceneSpec): string {
  return spec.conditions
    .map((condition) => `${condition.label}：${condition.value ? '开' : '关'}`)
    .join(' · ')
}
