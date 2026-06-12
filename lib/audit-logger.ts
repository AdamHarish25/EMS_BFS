import pool from './db';

type AuditAction = 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'LOGIN' | 'LOGOUT';
type AuditModule = 'PAGE_NAVIGATION' | 'ROOM_MANAGEMENT' | 'DATA_EXCLUSION' | 'REPORTING' | 'AUTH' | 'SETTINGS';

export interface CreateAuditLogParams {
  userId?: string; 
  userEmail?: string;
  action: AuditAction;
  module: AuditModule;
  description: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  routePath?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  // Gunakan dummy UUID jika sistem auth belum siap (karena field user_id NOT NULL di DB)
  const defaultUserId = '00000000-0000-0000-0000-000000000000';

  const sql = `
    INSERT INTO ems_audit_logs (
      user_id, user_email, action, module, description,
      entity_id, old_values, new_values, route_path, ip_address, user_agent
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
    )
  `;

  const values = [
    params.userId || defaultUserId,
    params.userEmail || null,
    params.action,
    params.module,
    params.description,
    params.entityId || null,
    params.oldValues ? JSON.stringify(params.oldValues) : null,
    params.newValues ? JSON.stringify(params.newValues) : null,
    params.routePath || null,
    params.ipAddress || null,
    params.userAgent || null,
  ];

  try {
    await pool.query(sql, values);
    console.log(`[Audit Log] ${params.action} on ${params.module} recorded.`);
  } catch (error) {
    console.error('[Audit Log Error]: Failed to insert audit log:', error);
    // Kita tidak throw error agar aplikasi utama tidak crash hanya karena gagal insert log
  }
}
