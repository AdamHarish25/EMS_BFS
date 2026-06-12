import { Metadata } from 'next';
import pool from '@/lib/db';
import { format } from 'date-fns';

export const metadata: Metadata = {
  title: 'Audit Logs | Central AC Dashboard',
};

// Pastikan halaman ini selalu di-render dinamis (tidak di-cache secara statis)
export const dynamic = 'force-dynamic';

async function getAuditLogs() {
  try {
    const client = await pool.connect();
    // Mengambil 100 log terakhir, dapat ditambahkan paginasi nanti
    const result = await client.query(`
      SELECT 
        id, 
        user_id, 
        user_email, 
        action, 
        module, 
        description, 
        route_path, 
        ip_address, 
        created_at 
      FROM ems_audit_logs
      ORDER BY created_at DESC
      LIMIT 100
    `);
    client.release();
    return result.rows;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

export default async function AuditLogPage() {
  const logs = await getAuditLogs();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
      </div>

      <div className="border rounded-md shadow-sm overflow-hidden bg-white dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Waktu</th>
                <th className="px-4 py-3 font-medium">User ID</th>
                <th className="px-4 py-3 font-medium">Aksi</th>
                <th className="px-4 py-3 font-medium">Modul</th>
                <th className="px-4 py-3 font-medium">Deskripsi</th>
                <th className="px-4 py-3 font-medium">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    Belum ada data log aktivitas
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-zinc-500">
                      {log.user_email || log.user_id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                        log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                          log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                            'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{log.module}</td>
                    <td className="px-4 py-3">{log.description}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-zinc-500">
                      {log.ip_address || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div >

  );
}
