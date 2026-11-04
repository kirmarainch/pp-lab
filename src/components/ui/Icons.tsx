import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base: IconProps = {
  width: 14,
  height: 14,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.3,
  strokeLinecap: 'square',
  'aria-hidden': true,
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 2v8" />
      <path d="m5 7.5 3 3 3-3" />
      <path d="M2.5 12v1.5h11V12" />
    </svg>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2 8h11" />
      <path d="m9.5 4.5 3.5 3.5-3.5 3.5" />
    </svg>
  )
}

export function RestoreIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.2 6.2A5.2 5.2 0 1 1 3 9.7" />
      <path d="M2.5 2.8v3.7h3.7" />
    </svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 2.5v11" />
      <path d="M2.5 8h11" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m3 3 10 10" />
      <path d="m13 3-10 10" />
    </svg>
  )
}

export function ProbeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="7" cy="7" r="4.2" />
      <path d="m10.2 10.2 3 3" />
      <path d="M7 5v4" />
      <path d="M5.5 6.5h3" />
    </svg>
  )
}
