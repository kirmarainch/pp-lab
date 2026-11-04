import Dexie, { type EntityTable } from 'dexie'
import type { Experiment, Revision } from './schema'

export const db = new Dexie('pp-lab') as Dexie & {
  experiments: EntityTable<Experiment, 'id'>
  revisions: EntityTable<Revision, 'id'>
}

db.version(1).stores({
  experiments: 'id, updatedAt',
  revisions: 'id, experimentId, version, createdAt',
})
