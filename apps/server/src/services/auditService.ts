import { prisma } from '../lib/prisma.js';

export async function recordAudit(params: {
  employeeId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      employeeId: params.employeeId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      beforeJson: params.before === undefined ? undefined : (params.before as object),
      afterJson: params.after === undefined ? undefined : (params.after as object),
    },
  });
}
