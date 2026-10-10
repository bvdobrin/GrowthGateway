import { uid } from '@/lib/ids';
import type { Asset, AuditAction, AuditEvent, User } from '@/types';
import { ServiceError } from './errors';
import { hasPermission } from './iamService';
import { delay } from './latency';
import { getDb, saveDb } from './mockDb';

const MAX_EVENTS = 2000;
const DEDUPE_MS = 60_000;

export async function logEvent(user: Pick<User, 'id' | 'name'>, action: AuditAction, asset?: Pick<Asset, 'id' | 'title'>, details?: string) {
  const db = await getDb();
  const now = Date.now();
  const recent = db.audit[0];
  if (
    action === 'asset.view' &&
    recent &&
    recent.action === action &&
    recent.actorId === user.id &&
    recent.assetId === asset?.id &&
    now - new Date(recent.at).getTime() < DEDUPE_MS
  ) {
    return;
  }
  const event: AuditEvent = {
    id: uid('evt'),
    at: new Date(now).toISOString(),
    actorId: user.id,
    actorName: user.name,
    action,
    assetId: asset?.id,
    assetTitle: asset?.title,
    details,
  };
  db.audit.unshift(event);
  if (db.audit.length > MAX_EVENTS) db.audit.length = MAX_EVENTS;
  await saveDb();
}

export async function listAudit(user: User): Promise<AuditEvent[]> {
  await delay();
  if (!hasPermission(user, 'admin:audit')) throw new ServiceError('forbidden', 'Audit log requires admin:audit');
  const db = await getDb();
  return db.audit.slice(0, 500);
}
