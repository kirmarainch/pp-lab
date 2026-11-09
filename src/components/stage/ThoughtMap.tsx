import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { Experiment } from '../../lib/schema'
import {
  CURRENT_EXPERIMENT_NODE_ID,
  MAP_NODE_KIND_META,
  MAP_RELATION_META,
  MAP_VIEWBOX,
  seedStarMap,
  type MapConditionTag,
  type MapEdge,
  type MapNode,
  type MapRelationType,
  type MapSource,
} from '../../lib/starmap'
import { CloseIcon } from '../ui/Icons'

type Selection = { kind: 'node'; id: string } | { kind: 'edge'; id: string }

function truncate(text: string, max: number): string {
  const chars = Array.from(text.trim() || '（待填写）')
  return chars.length > max ? `${chars.slice(0, Math.max(1, max - 1)).join('')}…` : chars.join('')
}

function radiusOf(node: MapNode): number {
  if (node.kind === 'experiment') return 118
  return MAP_NODE_KIND_META[node.kind].radius
}

function pointTowards(
  from: { x: number; y: number },
  to: { x: number; y: number },
  distance: number,
): { x: number; y: number } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: from.x + (dx / length) * distance, y: from.y + (dy / length) * distance }
}

function edgeGeometry(edge: MapEdge, from: MapNode, to: MapNode) {
  const startBase = from.position
  const endBase = to.position
  const dx = endBase.x - startBase.x
  const dy = endBase.y - startBase.y
  const length = Math.hypot(dx, dy) || 1
  const nx = -dy / length
  const ny = dx / length
  const bend = edge.bend ?? 0
  const control = {
    x: (startBase.x + endBase.x) / 2 + nx * bend,
    y: (startBase.y + endBase.y) / 2 + ny * bend,
  }
  const start = pointTowards(startBase, control, radiusOf(from) + 8)
  const end = pointTowards(endBase, control, radiusOf(to) + 10)
  const t = edge.labelAt ?? 0.5
  const mt = 1 - t
  const label = {
    x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
    y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
  }
  return {
    path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
    label,
  }
}

export function ThoughtMap({ experiment }: { experiment: Experiment }) {
  const [selection, setSelection] = useState<Selection | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inspectorRef = useRef<HTMLDivElement>(null)

  const activeConditions = useMemo(
    () => new Set(experiment.sceneSpec.conditions.filter((condition) => condition.value).map((condition) => condition.id)),
    [experiment],
  )

  const nodes = useMemo(
    () =>
      seedStarMap.nodes.map((node) =>
        node.id === CURRENT_EXPERIMENT_NODE_ID
          ? {
              ...node,
              title: experiment.title,
              en: experiment.subtitle,
              summary: experiment.claim.trim() || '（待填写）',
              relevance: '当前实验本身；图谱中的其余节点都相对于它定位。',
              conditionTags: experiment.sceneSpec.conditions
                .filter((condition) => condition.value)
                .map((condition) => condition.id as MapConditionTag),
            }
          : node,
      ),
    [experiment],
  )

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const sourceById = useMemo(
    () => new Map(seedStarMap.sources.map((source) => [source.id, source])),
    [],
  )

  const selectedNode = selection?.kind === 'node' ? nodeById.get(selection.id) : undefined
  const selectedEdge =
    selection?.kind === 'edge'
      ? seedStarMap.edges.find((edge) => edge.id === selection.id)
      : undefined

  const focusedNodeId = selectedNode?.id
  const focusedEdge = selectedEdge
  const relatedNodeIds = useMemo(() => {
    if (selectedNode) {
      const ids = new Set([selectedNode.id])
      for (const edge of seedStarMap.edges) {
        if (edge.from === selectedNode.id || edge.to === selectedNode.id) {
          ids.add(edge.from)
          ids.add(edge.to)
        }
      }
      return ids
    }
    if (selectedEdge) {
      return new Set([selectedEdge.from, selectedEdge.to])
    }
    return null
  }, [selectedNode, selectedEdge])

  useEffect(() => {
    if (!selection) return
    inspectorRef.current?.focus({ preventScroll: true })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelection(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selection])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    let centered = false
    const center = () => {
      if (centered) return
      const canScrollX = element.scrollWidth > element.clientWidth
      const canScrollY = element.scrollHeight > element.clientHeight
      if (canScrollX) element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2
      if (canScrollY) element.scrollTop = (element.scrollHeight - element.clientHeight) / 2
      if (canScrollX || canScrollY) centered = true
    }
    const frame = requestAnimationFrame(center)
    const observer = new ResizeObserver(center)
    observer.observe(element)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  const selectNode = (id: string) => setSelection({ kind: 'node', id })
  const selectEdge = (id: string) => setSelection({ kind: 'edge', id })

  return (
    <div className="thought-map">
      <div className="thought-map-scroll" ref={scrollRef}>
        <div className="thought-map-canvas">
          <svg
            className="thought-map-svg"
            viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
            role="group"
            aria-label="思想星图"
          >
            <defs>
              <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" className="map-grid-line" fill="none" />
              </pattern>
              {(['influence', 'counterexample', 'support'] as const).map((type) => (
                <marker
                  key={type}
                  id={`map-arrow-${type}`}
                  viewBox="0 0 7 7"
                  refX="6"
                  refY="3.5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto"
                >
                  <path
                    d="M0,0 L7,3.5 L0,7 Z"
                    className={`map-arrow is-${MAP_RELATION_META[type].tone}`}
                  />
                </marker>
              ))}
            </defs>

            <rect
              width={MAP_VIEWBOX.width}
              height={MAP_VIEWBOX.height}
              fill="url(#map-grid)"
              className="map-grid-fill"
            />

            <g className="map-orbits" aria-hidden="true">
              <circle cx={600} cy={360} r={178} />
              <circle cx={600} cy={360} r={304} />
            </g>

            {seedStarMap.edges.map((edge) => {
              const from = nodeById.get(edge.from)
              const to = nodeById.get(edge.to)
              if (!from || !to) return null
              const meta = MAP_RELATION_META[edge.type]
              const geometry = edgeGeometry(edge, from, to)
              const isSelected = focusedEdge?.id === edge.id
              const isDimmed = Boolean(relatedNodeIds && !isSelected && (focusedNodeId
                ? edge.from !== focusedNodeId && edge.to !== focusedNodeId
                : true))
              return (
                <g
                  key={edge.id}
                  className={`map-edge is-${meta.tone} ${isSelected ? 'is-selected' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
                  data-edge-id={edge.id}
                  onClick={() => selectEdge(edge.id)}
                >
                  <path
                    className="map-edge-path"
                    d={geometry.path}
                    strokeDasharray={meta.dash}
                    markerEnd={meta.arrow ? `url(#map-arrow-${edge.type})` : undefined}
                  />
                  <path className="map-edge-hit" d={geometry.path} />
                  <text
                    className="map-edge-label"
                    x={geometry.label.x}
                    y={geometry.label.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {meta.label}
                  </text>
                </g>
              )
            })}

            {nodes.map((node) =>
              node.kind === 'experiment' ? (
                <g
                  key={node.id}
                  className={`map-center ${selectedNode?.id === node.id ? 'is-selected' : ''}`}
                  transform={`translate(${node.position.x} ${node.position.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`当前实验：${node.title}`}
                  onClick={() => selectNode(node.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      selectNode(node.id)
                    }
                  }}
                >
                  <rect className="map-center-card" x={-148} y={-76} width={296} height={152} rx={18} />
                  <text className="map-center-kicker" y={-46} textAnchor="middle">
                    CURRENT EXPERIMENT
                  </text>
                  <text className="map-center-title" y={-14} textAnchor="middle">
                    {truncate(node.title, 14)}
                  </text>
                  <text className="map-center-claim" y={14} textAnchor="middle">
                    {truncate(node.summary, 22)}
                  </text>
                  <line className="map-center-rule" x1={-92} x2={92} y1={30} y2={30} />
                  <text className="map-center-conditions" y={50} textAnchor="middle">
                    {experiment.sceneSpec.conditions.map((condition, index) => (
                      <tspan key={condition.id} className={condition.value ? 'is-on' : ''}>
                        {condition.label}
                        {index < experiment.sceneSpec.conditions.length - 1 ? ' · ' : ''}
                      </tspan>
                    ))}
                  </text>
                  <title>
                    {node.title} — {node.summary}
                  </title>
                </g>
              ) : (
                <ExternalNode
                  key={node.id}
                  node={node}
                  activeConditions={activeConditions}
                  selected={selectedNode?.id === node.id}
                  dimmed={Boolean(relatedNodeIds && !relatedNodeIds.has(node.id))}
                  onSelect={selectNode}
                />
              ),
            )}
          </svg>
        </div>
      </div>

      <MapLegend />

      {selection && (
        <MapInspector
          panelRef={inspectorRef}
          selection={selection}
          nodeById={nodeById}
          sourceById={sourceById}
          experiment={experiment}
          onSelectEdge={selectEdge}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  )
}

function ExternalNode({
  node,
  activeConditions,
  selected,
  dimmed,
  onSelect,
}: {
  node: MapNode
  activeConditions: Set<string>
  selected: boolean
  dimmed: boolean
  onSelect: (id: string) => void
}) {
  const radius = MAP_NODE_KIND_META[node.kind].radius
  const labelAbove = node.position.y > 610
  const conditionTags = node.conditionTags
  const startX = -((conditionTags.length - 1) * 9) / 2

  return (
    <g
      className={`map-node is-${node.kind} ${selected ? 'is-selected' : ''} ${dimmed ? 'is-dimmed' : ''}`}
      transform={`translate(${node.position.x} ${node.position.y})`}
      data-node-id={node.id}
      role="button"
      tabIndex={0}
      aria-label={`${node.title}，${MAP_NODE_KIND_META[node.kind].label}`}
      onClick={() => onSelect(node.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(node.id)
        }
      }}
    >
      <circle className="map-node-ring" r={radius + 6} />
      {node.kind === 'thought-experiment' ? (
        <path
          className="map-node-shape"
          d={`M 0 ${-radius} L ${radius} 0 L 0 ${radius} L ${-radius} 0 Z`}
        />
      ) : node.kind === 'technical-case' || node.kind === 'case' ? (
        <rect
          className="map-node-shape"
          x={-radius}
          y={-radius}
          width={radius * 2}
          height={radius * 2}
          rx={10}
        />
      ) : (
        <circle className="map-node-shape" r={radius} />
      )}
      <circle className="map-node-core" r={2.8} />
      {conditionTags.map((tag, index) => (
        <circle
          key={tag}
          className={`map-node-condition ${activeConditions.has(tag) ? 'is-active' : ''}`}
          cx={startX + index * 9}
          cy={-radius - 11}
          r={3.2}
        />
      ))}
      <text
        className="map-node-label"
        y={labelAbove ? -radius - 22 : radius + 23}
        textAnchor="middle"
      >
        {truncate(node.title, 9)}
      </text>
      <text
        className="map-node-en"
        y={labelAbove ? -radius - 7 : radius + 38}
        textAnchor="middle"
      >
        {node.en}
      </text>
      <title>
        {node.title} — {node.summary}
      </title>
    </g>
  )
}

function MapLegend() {
  const relations = Object.entries(MAP_RELATION_META) as [
    MapRelationType,
    (typeof MAP_RELATION_META)[MapRelationType],
  ][]

  return (
    <div className="map-legend" aria-label="关系类型图例">
      <div className="map-legend-title">Relations / 关系类型</div>
      <div className="map-legend-grid">
        {relations.map(([type, meta]) => (
          <span className={`map-legend-item is-${meta.tone}`} key={type}>
            <span
              className={`map-legend-line ${meta.dash ? 'is-dashed' : ''} ${meta.arrow ? 'has-arrow' : ''}`}
              aria-hidden="true"
            />
            {meta.label}
          </span>
        ))}
      </div>
    </div>
  )
}

const MapInspector = ({
  panelRef,
  selection,
  nodeById,
  sourceById,
  experiment,
  onSelectEdge,
  onClose,
}: {
  panelRef: RefObject<HTMLDivElement | null>
  selection: Selection
  nodeById: Map<string, MapNode>
  sourceById: Map<string, MapSource>
  experiment: Experiment
  onSelectEdge: (id: string) => void
  onClose: () => void
}) => {
  const node = selection.kind === 'node' ? nodeById.get(selection.id) : undefined
  const edge =
    selection.kind === 'edge'
      ? seedStarMap.edges.find((item) => item.id === selection.id)
      : undefined
  const edgeMeta = edge ? MAP_RELATION_META[edge.type] : undefined
  const from = edge ? nodeById.get(edge.from) : undefined
  const to = edge ? nodeById.get(edge.to) : undefined

  const relatedEdges = node
    ? seedStarMap.edges.filter((item) => item.from === node.id || item.to === node.id)
    : []
  const sources = node
    ? node.sourceIds.map((id) => sourceById.get(id)).filter((source): source is MapSource => Boolean(source))
    : edge
      ? edge.sourceIds
          .map((id) => sourceById.get(id))
          .filter((source): source is MapSource => Boolean(source))
      : []

  return (
    <aside
      className="map-inspector"
      role="dialog"
      aria-label="星图详情"
      tabIndex={-1}
      ref={panelRef}
    >
      <div className="map-inspector-head">
        <div>
          <div className="map-inspector-kicker">
            {node
              ? MAP_NODE_KIND_META[node.kind].label
              : edgeMeta
                ? edgeMeta.fullLabel
                : 'Detail'}
          </div>
          <h3>{node ? node.title : edgeMeta?.label}</h3>
          {node?.en && <div className="map-inspector-en">{node.en}</div>}
        </div>
        <button type="button" className="map-inspector-close" onClick={onClose} aria-label="关闭详情">
          <CloseIcon />
        </button>
      </div>

      {node && (
        <>
          <p className="map-inspector-summary">{node.summary}</p>
          <div className="map-inspector-block">
            <div className="map-inspector-label">为什么与你有关</div>
            <p className="map-inspector-relevance">{node.relevance}</p>
          </div>
          {node.kind === 'experiment' && (
            <div className="map-inspector-block">
              <div className="map-inspector-label">当前条件</div>
              <ul className="map-condition-list">
                {experiment.sceneSpec.conditions.map((condition) => (
                  <li key={condition.id} className={condition.value ? 'is-on' : ''}>
                    <span>{condition.label}</span>
                    <span>{condition.value ? '开' : '关'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="map-inspector-block">
            <div className="map-inspector-label">关系</div>
            <div className="map-relation-list">
              {relatedEdges.map((item) => {
                const meta = MAP_RELATION_META[item.type]
                const other = nodeById.get(item.from === node.id ? item.to : item.from)
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="map-relation-row"
                    onClick={() => onSelectEdge(item.id)}
                  >
                    <span className={`map-relation-type is-${meta.tone}`}>{meta.label}</span>
                    <span className="map-relation-title">{other?.title ?? '当前实验'}</span>
                    <span className="map-relation-explanation">{item.explanation}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <SourceList sources={sources} emptyText="暂无来源。" />
        </>
      )}

      {edge && edgeMeta && (
        <>
          <p className="map-inspector-summary">{edge.explanation}</p>
          {edge.type === 'proposed' && (
            <p className="map-disclaimer">系统提出的待查关联，尚未找到文献支持。</p>
          )}
          <div className="map-inspector-block">
            <div className="map-inspector-label">两端</div>
            <div className="map-endpoints">
              <span>{from?.title ?? edge.from}</span>
              <span className="map-endpoint-arrow" aria-hidden="true">→</span>
              <span>{to?.title ?? edge.to}</span>
            </div>
          </div>
          <SourceList sources={sources} emptyText="尚未找到文献支持。" />
        </>
      )}
    </aside>
  )
}

function SourceList({ sources, emptyText }: { sources: MapSource[]; emptyText: string }) {
  return (
    <div className="map-inspector-block">
      <div className="map-inspector-label">来源</div>
      {sources.length === 0 ? (
        <p className="map-inspector-empty">{emptyText}</p>
      ) : (
        <div className="map-source-list">
          {sources.map((source) => (
            <a
              key={source.id}
              className="map-source"
              href={source.url}
              target="_blank"
              rel="noreferrer"
            >
              <span className="map-source-citation">{source.citation}</span>
              {source.note && <span className="map-source-note">{source.note}</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
