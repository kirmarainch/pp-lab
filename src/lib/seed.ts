import { SceneSpecSchema, type Experiment, type SceneSpec } from './schema'
import { snapshotConditions } from './resolveScene'

export const SEED_EXPERIMENT_ID = 'seed-black-box-01'

// 场景内容为占位：标题、对象、条件与注释文案均由用户决定。
export const seedScene: SceneSpec = SceneSpecSchema.parse({
  schemaVersion: '1.0',
  family: 'black-box-room',
  title: '未命名实验',
  subtitle: 'Untitled Experiment',
  entities: [
    { id: 'monolith', kind: 'monolith', label: '对象 A', caption: 'OBJECT A' },
    { id: 'core', kind: 'core', label: '对象 B', caption: 'OBJECT B' },
    { id: 'reasonRing', kind: 'reason-ring', label: '对象 C', caption: 'OBJECT C' },
    { id: 'channel', kind: 'channel', label: '对象 D', caption: 'OBJECT D' },
    { id: 'observer', kind: 'observer', label: '对象 E', caption: 'OBJECT E' },
    { id: 'verifier', kind: 'verifier', label: '对象 F', caption: 'OBJECT F' },
    { id: 'hall', kind: 'environment', label: '黑箱室', caption: 'BLACK BOX ROOM' },
  ],
  conditions: [
    {
      id: 'interpretable',
      label: '条件 A',
      hint: '（待填写）',
      axis: 'epistemic',
      value: false,
    },
    {
      id: 'verifiable',
      label: '条件 B',
      hint: '（待填写）',
      axis: 'social',
      value: false,
    },
    {
      id: 'has-reasons',
      label: '条件 C',
      hint: '（待填写）',
      axis: 'internal',
      value: false,
    },
  ],
  bindings: [
    {
      conditionId: 'interpretable',
      entityId: 'monolith',
      property: 'opacity',
      off: 1,
      on: 0.18,
    },
    {
      conditionId: 'interpretable',
      entityId: 'monolith',
      property: 'seamIntensity',
      off: 0.28,
      on: 1,
    },
    {
      conditionId: 'interpretable',
      entityId: 'core',
      property: 'scale',
      off: 0,
      on: 1,
    },
    {
      conditionId: 'interpretable',
      entityId: 'core',
      property: 'spin',
      off: 0.2,
      on: 0.85,
    },
    {
      conditionId: 'interpretable',
      entityId: 'channel',
      property: 'opacity',
      off: 0.38,
      on: 1,
    },
    {
      conditionId: 'verifiable',
      entityId: 'verifier',
      property: 'scale',
      off: 0,
      on: 1,
    },
    {
      conditionId: 'verifiable',
      entityId: 'verifier',
      property: 'beam',
      off: 0,
      on: 1,
    },
    {
      conditionId: 'has-reasons',
      entityId: 'reasonRing',
      property: 'scale',
      off: 0,
      on: 1,
    },
    {
      conditionId: 'has-reasons',
      entityId: 'reasonRing',
      property: 'spin',
      off: 0.08,
      on: 0.5,
    },
    {
      conditionId: 'has-reasons',
      entityId: 'monolith',
      property: 'capLight',
      off: 0,
      on: 1,
    },
  ],
  cameraPresets: [
    {
      id: 'overview',
      label: '全览',
      position: [6.8, 4.1, 7.4],
      target: [0, 1.2, 0.2],
    },
    {
      id: 'observer',
      label: '观察者',
      position: [4.9, 1.8, 3.5],
      target: [0, 1.25, 0],
    },
    {
      id: 'closeup',
      label: '黑箱',
      position: [2.35, 1.75, 3.1],
      target: [0, 1.3, 0.1],
    },
  ],
  annotations: [
    {
      id: 'a-object-a',
      entityId: 'monolith',
      text: '对象 A',
      sublabel: 'OBJECT A',
      position: [0, 3.28, 0],
    },
    {
      id: 'a-object-d',
      entityId: 'channel',
      text: '对象 D',
      sublabel: 'OBJECT D',
      position: [1.85, 2.3, 0.95],
    },
    {
      id: 'a-object-e',
      entityId: 'observer',
      text: '对象 E',
      sublabel: 'OBJECT E',
      position: [3.45, 2.4, 1.35],
    },
    {
      id: 'a-object-b',
      entityId: 'core',
      text: '对象 B',
      sublabel: 'OBJECT B',
      conditionId: 'interpretable',
      position: [-1.75, 1.6, 0.3],
    },
    {
      id: 'a-object-f',
      entityId: 'verifier',
      text: '对象 F',
      sublabel: 'OBJECT F',
      conditionId: 'verifiable',
      position: [-3.55, 2.1, 0.4],
    },
    {
      id: 'a-object-c',
      entityId: 'reasonRing',
      text: '对象 C',
      sublabel: 'OBJECT C',
      conditionId: 'has-reasons',
      position: [1.55, 2.95, 0.2],
    },
  ],
})

export function createSeedExperiment(now = Date.now()): Experiment {
  return {
    id: SEED_EXPERIMENT_ID,
    title: seedScene.title,
    subtitle: seedScene.subtitle,
    family: 'black-box-room',
    sceneSpec: structuredClone(seedScene),
    claim: '',
    stanceId: null,
    probe: null,
    createdAt: now,
    updatedAt: now,
  }
}

export function initialConditionsNote(experiment: Experiment): string {
  const states = snapshotConditions(experiment.sceneSpec)
  const active = Object.values(states).filter(Boolean).length
  return active === 0 ? '初始占位状态。' : `初始占位状态（${active} 个条件开启）。`
}
