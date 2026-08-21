import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

interface AuditLogItem {
  id: string;
  userId: string | null;
  userRole: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  previousValue: string | null;
  newValue: string | null;
  reason: string | null;
  timestamp: string;
  user: { name: string; username: string } | null;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const [logsSnap, usersSnap] = await Promise.all([
          getDocs(query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(100))),
          getDocs(collection(db, 'users'))
        ]);
        
        const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        const fetchedLogs = logsSnap.docs.map(doc => {
          const data = doc.data() as any;
          const user = users.find(u => u.id === data.userId);
          
          return {
            id: doc.id,
            userId: data.userId || null,
            userRole: data.userRole || null,
            action: data.action || 'UNKNOWN_ACTION',
            entity: data.entity || 'System',
            entityId: data.entityId || null,
            previousValue: typeof data.previousValue === 'object' ? JSON.stringify(data.previousValue) : data.previousValue,
            newValue: typeof data.newValue === 'object' ? JSON.stringify(data.newValue) : data.newValue,
            reason: data.reason || null,
            timestamp: data.timestamp || data.createdAt || new Date().toISOString(),
            user: user ? { name: user.name || user.username, username: user.username } : null
          };
        });
        
        setLogs(fetchedLogs);
      } catch (err) {
        console.error('Error loading audit logs:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 pb-12 text-white">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              System Audit Trail
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Immutable historical logs for evaluation submits, admin unlocks, team modifications & security events
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Loading System Audit Stream...
          </p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-[#0e1420] border border-white/[0.08] rounded-2xl p-12 text-center text-slate-400 text-sm">
          No audit logs recorded in this session.
        </div>
      ) : (
        <div className="bg-[#0e1420] border border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-black/40 text-slate-300 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-4 px-5 w-44">Timestamp</th>
                  <th className="py-4 px-5">Initiator</th>
                  <th className="py-4 px-5 text-center">Role</th>
                  <th className="py-4 px-5">Action Event</th>
                  <th className="py-4 px-5">Entity Context</th>
                  <th className="py-4 px-5">Audit Notes / Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-4 px-5 text-slate-400 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    <td className="py-4 px-5 font-bold text-white">
                      {log.user ? log.user.name : 'System Core'}
                      {log.user && (
                        <span className="block text-[10px] text-slate-400 font-mono font-normal mt-0.5">
                          @{log.user.username}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.05] text-slate-300 border border-white/[0.08]">
                        {log.userRole || 'SYSTEM'}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-indigo-300 font-mono font-bold">
                      {log.action}
                    </td>

                    <td className="py-4 px-5 text-slate-300">
                      <span className="font-semibold">{log.entity}</span>{' '}
                      {log.entityId && (
                        <span className="font-mono text-slate-500 text-[10px]">
                          #{log.entityId.slice(0, 8)}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-5 text-slate-300 text-xs max-w-sm">
                      {log.reason ? (
                        <span className="text-amber-300 italic">"{log.reason}"</span>
                      ) : log.newValue ? (
                        <span className="font-mono text-slate-400 text-[11px] truncate block max-w-xs overflow-hidden text-ellipsis">{log.newValue}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
