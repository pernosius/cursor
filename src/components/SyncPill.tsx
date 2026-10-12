import { Link } from 'react-router-dom';
import { CloudOff } from 'lucide-react';
import { useSync } from '../sync/engine';
import { cx } from './ui';

const LABELS = {
  unconfigured: 'Set up sync',
  'signed-out': 'Sign in to sync',
  syncing: 'Syncing',
  synced: 'Synced',
  offline: 'Offline',
  error: 'Sync error',
} as const;

export default function SyncPill() {
  const status = useSync((s) => s.status);
  return (
    <Link to="/settings" className={cx('sync-pill', status)} title="Sync settings">
      {status === 'unconfigured' || status === 'signed-out' ? <CloudOff size={14} /> : <i />}
      {LABELS[status]}
    </Link>
  );
}
