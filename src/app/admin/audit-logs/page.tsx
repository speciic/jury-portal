'use client';

import React, { useEffect, useState } from 'react';
import { History, ShieldCheck, Clock } from 'lucide-react';

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
        const res = await fetch('/api/admin/audit-logs');
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs);
        }
      } catch (err) {
        console.error('Error loading audit logs:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2">
          <History className="w-7 h-7 text-indigo-400" />
          <span>System Audit Trail</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Complete historical audit logs for evaluation submits, unlocks, team edits, and password resets
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Loading audit logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center text-slate-400 text-sm">
          No audit logs recorded yet.
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-300 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4 w-40">Timestamp</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4 text-center">Role</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">Reason / Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 font-sans font-bold text-white">
                      {log.user ? log.user.name : 'System'}
                      {log.user && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          @{log.user.username}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {log.userRole || 'SYSTEM'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-indigo-300 font-bold">
                      {log.action}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-sans">
                      {log.entity} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ''}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 font-sans text-xs max-w-xs truncate">
                      {log.reason ? (
                        <span className="text-amber-300 italic">"{log.reason}"</span>
                      ) : log.newValue ? (
                        <span className="text-slate-300">{log.newValue}</span>
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
