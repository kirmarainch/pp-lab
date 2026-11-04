import type { Experiment, Revision } from './schema'

export function exportExperiment(experiment: Experiment, revisions: Revision[]): void {
  const payload = {
    app: 'PP Lab — Paradox & Possibility Lab',
    appVersion: '0.1.0',
    schemaVersion: experiment.sceneSpec.schemaVersion,
    exportedAt: new Date().toISOString(),
    note: 'This export contains user-created experiment state only. No API key or session credential is ever stored in experiment data.',
    experiment,
    revisions,
  }

  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10)
  const slug = experiment.id.replace(/^seed-/, '')
  const link = document.createElement('a')
  link.href = url
  link.download = `pp-lab-${slug}-${date}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
