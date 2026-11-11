import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useDialogFocus<T extends HTMLElement>(active = true) {
  const ref = useRef<T>(null)
  const previousRef = useRef<HTMLElement | null>(null)
  const wasActiveRef = useRef(false)

  // 必须在渲染阶段记录触发元素：commit 阶段 autoFocus 会先把焦点移进弹窗，
  // 等到 effect 再读 activeElement 就只剩弹窗内的输入框了。
  if (active && !wasActiveRef.current) {
    previousRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
  }
  wasActiveRef.current = active

  useEffect(() => {
    if (!active) return
    const container = ref.current
    if (!container) return

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      )

    if (!container.contains(document.activeElement)) focusables()[0]?.focus()

    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const activeElement = document.activeElement
      if (event.shiftKey && (activeElement === first || !container.contains(activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (activeElement === last || !container.contains(activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }

    container.addEventListener('keydown', handleKey)
    return () => {
      container.removeEventListener('keydown', handleKey)
      const previous = previousRef.current
      if (previous && document.contains(previous)) previous.focus()
    }
  }, [active])

  return ref
}