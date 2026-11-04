import type { ResolvedScene } from '../../lib/resolveScene'
import type { Theme } from '../../lib/theme'

interface Fallback2DProps {
  scene: ResolvedScene
  theme: Theme
}

const FALLBACK_COLORS = {
  light: {
    background: '#e3e9e6',
    solid: '#26363c',
    solidSoft: '#415158',
    shadow: 'rgba(38,54,60,0.16)',
    label: '#26363c',
    sublabel: '#647278',
  },
  dark: {
    background: '#101a20',
    solid: '#17242b',
    solidSoft: '#26363e',
    shadow: 'rgba(0,0,0,0.4)',
    label: '#e5e9e4',
    sublabel: '#829198',
  },
} as const

export function Fallback2D({ scene, theme }: Fallback2DProps) {
  const colors = FALLBACK_COLORS[theme]
  const isOn = (conditionId: string) =>
    scene.spec.conditions.find((condition) => condition.id === conditionId)?.value ?? false

  const interpretable = isOn('interpretable')
  const verifiable = isOn('verifiable')
  const hasReasons = isOn('has-reasons')
  const channelOpacity = interpretable ? 1 : 0.38

  const labelFor = (entityId: string, fallback: string) =>
    scene.annotations.find((annotation) => annotation.entityId === entityId)?.text ?? fallback
  const sublabelFor = (entityId: string, fallback: string) =>
    scene.annotations.find((annotation) => annotation.entityId === entityId)?.sublabel ??
    fallback

  return (
    <div className="fallback-2d" aria-hidden="true">
      <svg viewBox="0 0 820 460" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="fb-grid" width="34" height="34" patternUnits="userSpaceOnUse">
            <path
              d="M34 0H0V34"
              fill="none"
              stroke="rgba(232,227,215,0.065)"
              strokeWidth="0.6"
            />
          </pattern>
          <radialGradient id="fb-floor" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(99,214,226,0.2)" />
            <stop offset="55%" stopColor="rgba(99,214,226,0.055)" />
            <stop offset="100%" stopColor="rgba(99,214,226,0)" />
          </radialGradient>
          <radialGradient id="fb-screen" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(99,214,226,0.5)" />
            <stop offset="100%" stopColor="rgba(99,214,226,0)" />
          </radialGradient>
          <filter id="fb-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker
            id="fb-arrow"
            viewBox="0 0 8 8"
            refX="6"
            refY="4"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M0 0 8 4 0 8Z" fill="rgba(99,214,226,0.7)" />
          </marker>
          <marker
            id="fb-arrow-amber"
            viewBox="0 0 8 8"
            refX="6"
            refY="4"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M0 0 8 4 0 8Z" fill="rgba(220,169,78,0.7)" />
          </marker>
        </defs>

        <rect width="820" height="460" fill={colors.background} />
        <rect width="820" height="460" fill="url(#fb-grid)" opacity="0.75" />

        <ellipse cx="410" cy="344" rx="300" ry="78" fill="url(#fb-floor)" />
        <ellipse
          cx="410"
          cy="340"
          rx="255"
          ry="62"
          fill="none"
          stroke="rgba(232,227,215,0.09)"
          strokeDasharray="1 6"
        />
        <ellipse
          cx="410"
          cy="340"
          rx="176"
          ry="42"
          fill="none"
          stroke="rgba(99,214,226,0.12)"
          strokeDasharray="1 4"
        />

        <path
          d="M20 44V20h24M776 20h24v24M800 416v24h-24M44 440H20v-24"
          fill="none"
          stroke="rgba(232,227,215,0.14)"
          strokeWidth="0.8"
        />

        {/* independent verification */}
        <g opacity={verifiable ? 1 : 0.16}>
          <path
            d="M212 236C260 222 312 226 354 234"
            fill="none"
            stroke="rgba(220,169,78,0.5)"
            strokeWidth="0.8"
            strokeDasharray="3 5"
            markerEnd={verifiable ? 'url(#fb-arrow-amber)' : undefined}
          />
          {[130, 170, 210].map((x, index) => {
            const height = [72, 104, 84][index] ?? 80
            return (
              <g key={x}>
                <ellipse cx={x} cy="322" rx="14" ry="4" fill="rgba(0,0,0,0.4)" />
                <rect
                  x={x - 1.2}
                  y={322 - height}
                  width="2.4"
                  height={height}
                  fill="rgba(220,169,78,0.18)"
                  stroke="rgba(220,169,78,0.55)"
                  strokeWidth="0.7"
                />
                <circle
                  cx={x}
                  cy={322 - height}
                  r="4.5"
                  fill="#080b11"
                  stroke="rgba(220,169,78,0.8)"
                  strokeWidth="0.9"
                />
                <circle cx={x} cy={296 - height / 2} r="1.2" fill="rgba(220,169,78,0.8)" />
              </g>
            )
          })}
          <text x="166" y="176" textAnchor="middle" className="fallback-label">
            {labelFor('verifier', '对象 F')}
          </text>
          <text x="166" y="188" textAnchor="middle" className="fallback-label-sub">
            {verifiable ? 'ON' : 'OFF'}
          </text>
        </g>

        {/* stated reasons */}
        {hasReasons && (
          <g>
            <ellipse
              cx="410"
              cy="76"
              rx="54"
              ry="18"
              fill="none"
              stroke="rgba(233,229,218,0.42)"
              strokeWidth="0.8"
              transform="rotate(-8 410 76)"
            />
            <ellipse
              cx="410"
              cy="76"
              rx="40"
              ry="13"
              fill="none"
              stroke="rgba(220,169,78,0.52)"
              strokeWidth="0.7"
              strokeDasharray="2 4"
              transform="rotate(12 410 76)"
            />
            <circle cx="358" cy="80" r="2" fill="rgba(233,229,218,0.8)" />
            <circle cx="463" cy="70" r="2" fill="rgba(220,169,78,0.9)" />
            <circle cx="427" cy="59" r="1.5" fill="rgba(233,229,218,0.65)" />
            <text x="478" y="66" className="fallback-label">
              {labelFor('reasonRing', '对象 C')}
            </text>
            <text x="478" y="78" className="fallback-label-sub">
              {sublabelFor('reasonRing', 'OBJECT C')} · ON
            </text>
          </g>
        )}

        {/* channel */}
        <g opacity={channelOpacity}>
          <path
            d="M466 218C518 190 568 214 618 251"
            fill="none"
            stroke="rgba(99,214,226,0.62)"
            strokeWidth="1"
            strokeDasharray="4 4"
            markerEnd="url(#fb-arrow)"
          />
          <circle cx="505" cy="205" r="1.6" fill="rgba(200,248,253,0.9)" />
          <circle cx="556" cy="209" r="1.4" fill="rgba(200,248,253,0.8)" />
          <circle cx="596" cy="232" r="1.2" fill="rgba(200,248,253,0.7)" />
          <text x="540" y="191" textAnchor="middle" className="fallback-label">
            {labelFor('channel', '对象 D')}
          </text>
          <text x="540" y="202" textAnchor="middle" className="fallback-label-sub">
            {sublabelFor('channel', 'OBJECT D')}
          </text>
        </g>

        {/* monolith */}
        <g transform="translate(410 230)">
          <ellipse cx="0" cy="105" rx="74" ry="12" fill="rgba(0,0,0,0.45)" />
          <ellipse cx="0" cy="102" rx="70" ry="9" fill="none" stroke="rgba(99,214,226,0.22)" />

          <rect
            x="-55"
            y="-92"
            width="110"
            height="184"
            fill={interpretable ? colors.solidSoft : colors.solid}
            fillOpacity={interpretable ? 0.72 : 1}
            stroke="rgba(233,229,218,0.32)"
            strokeWidth="0.9"
          />
          <rect
            x="-55"
            y="-92"
            width="110"
            height="184"
            fill="none"
            stroke="rgba(99,214,226,0.12)"
            strokeWidth="4"
          />

          <g opacity={interpretable ? 0.32 : 0.7}>
            <rect
              x="-25"
              y="-49"
              width="50"
              height="98"
              fill="none"
              stroke="rgba(223,91,79,0.5)"
              strokeWidth="0.9"
            />
            <rect
              x="-13"
              y="-31"
              width="26"
              height="62"
              fill="none"
              stroke="rgba(223,91,79,0.34)"
              strokeWidth="0.8"
            />
            <rect x="-5" y="-9" width="10" height="18" fill="rgba(223,91,79,0.28)" />
          </g>

          {interpretable ? (
            <g filter="url(#fb-glow)">
              <polygon
                points="0,-30 26,0 0,30 -26,0"
                fill="rgba(99,214,226,0.04)"
                stroke="rgba(99,214,226,0.72)"
                strokeWidth="0.9"
              />
              <polygon
                points="0,-16 14,0 0,16 -14,0"
                fill="none"
                stroke="rgba(99,214,226,0.5)"
                strokeWidth="0.7"
                strokeDasharray="2 3"
              />
              <circle cx="0" cy="0" r="3" fill="rgba(201,248,253,0.95)" />
              <line x1="-26" y1="0" x2="-44" y2="0" stroke="rgba(99,214,226,0.35)" />
              <line x1="26" y1="0" x2="44" y2="0" stroke="rgba(99,214,226,0.35)" />
              <circle cx="-44" cy="0" r="1.6" fill="rgba(99,214,226,0.6)" />
              <circle cx="44" cy="0" r="1.6" fill="rgba(99,214,226,0.6)" />
            </g>
          ) : (
            <g>
              <rect
                x="-1.5"
                y="-55"
                width="3"
                height="86"
                fill="rgba(99,214,226,0.75)"
                filter="url(#fb-glow)"
              />
              <rect x="-7" y="-55" width="14" height="86" fill="rgba(99,214,226,0.05)" />
            </g>
          )}

          <line x1="-55" y1="92" x2="55" y2="92" stroke="rgba(233,229,218,0.25)" />
          {hasReasons && (
            <circle
              cx="0"
              cy="-92"
              r="3"
              fill="rgba(220,169,78,0.75)"
              filter="url(#fb-glow)"
            />
          )}
        </g>

        {interpretable && (
          <g>
            <path d="M352 214H314" stroke="rgba(99,214,226,0.35)" strokeDasharray="2 3" />
            <text x="308" y="212" textAnchor="end" className="fallback-label">
              {labelFor('core', '对象 B')}
            </text>
            <text x="308" y="224" textAnchor="end" className="fallback-label-sub">
              {sublabelFor('core', 'OBJECT B')} · ON
            </text>
          </g>
        )}

        <text x="410" y="118" textAnchor="middle" className="fallback-label">
          {labelFor('monolith', '对象 A')}
        </text>
        <text x="410" y="130" textAnchor="middle" className="fallback-label-sub">
          {sublabelFor('monolith', 'OBJECT A')}
        </text>

        {/* observer */}
        <g>
          <ellipse cx="680" cy="326" rx="36" ry="9" fill="rgba(0,0,0,0.4)" />
          <ellipse cx="680" cy="326" rx="30" ry="6" fill="none" stroke="rgba(232,227,215,0.12)" />
          <path
            d="M666 326C668 280 672 248 676 232L684 232C688 248 692 280 694 326Z"
            fill={colors.solidSoft}
            stroke="rgba(233,229,218,0.22)"
            strokeWidth="0.8"
          />
          <circle
            cx="680"
            cy="217"
            r="13"
            fill={colors.solid}
            stroke="rgba(233,229,218,0.28)"
            strokeWidth="0.8"
          />
          <path d="M664 246C668 236 672 232 680 232" stroke="rgba(99,214,226,0.25)" />

          <g transform="translate(620 278)">
            <rect
              x="-38"
              y="-6"
              width="76"
              height="5"
              fill="#0a0f17"
              stroke="rgba(232,227,215,0.2)"
              strokeWidth="0.6"
            />
            <line x1="-28" y1="-1" x2="-28" y2="30" stroke="rgba(232,227,215,0.14)" />
            <line x1="28" y1="-1" x2="28" y2="30" stroke="rgba(232,227,215,0.14)" />
            <rect
              x="-29"
              y="-40"
              width="46"
              height="32"
              fill="#061119"
              stroke="rgba(99,214,226,0.5)"
              strokeWidth="0.8"
            />
            <rect x="-25" y="-36" width="38" height="24" fill="rgba(99,214,226,0.13)" />
            <line x1="-20" y1="-30" x2="-6" y2="-30" stroke="rgba(99,214,226,0.55)" />
            <line x1="-20" y1="-25" x2="2" y2="-25" stroke="rgba(99,214,226,0.36)" />
            <line x1="-20" y1="-20" x2="-11" y2="-20" stroke="rgba(99,214,226,0.28)" />
            <circle cx="6" cy="-14" r="10" fill="url(#fb-screen)" />
          </g>

          <text x="680" y="174" textAnchor="middle" className="fallback-label">
            {labelFor('observer', '对象 E')}
          </text>
          <text x="680" y="186" textAnchor="middle" className="fallback-label-sub">
            {sublabelFor('observer', 'OBJECT E')}
          </text>
        </g>

        <text x="36" y="428" className="fallback-label-sub">
          SCENE SPEC 1.0 · BLACK BOX ROOM · 2D SCHEMATIC
        </text>
        <text x="784" y="428" textAnchor="end" className="fallback-label-sub">
          {scene.spec.conditions.filter((condition) => condition.value).length} /{' '}
          {scene.spec.conditions.length} CONDITIONS ON
        </text>
      </svg>
    </div>
  )
}
