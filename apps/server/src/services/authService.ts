import type { BootstrapAccountInput, EmployeeCreateInput } from '@pos/shared';
import { prisma } from '../lib/prisma.js';
import { hashPin, signSession, verifyPin } from '../lib/auth.js';
import { HttpError } from '../middleware/errorHandler.js';

/**
 * PINs are looked up shop-wide (see loginWithPin) by trying every active
 * employee's hash, so two employees can't share a PIN — the second one
 * would never be reachable. Checked on every create.
 */
async function assertPinAvailable(pin: string) {
  const employees = await prisma.employee.findMany({ where: { active: true } });
  for (const employee of employees) {
    if (await verifyPin(pin, employee.pinHash)) {
      throw new HttpError(409, 'That PIN is already in use by another employee - pick a different one');
    }
  }
}

export async function hasAnyEmployees(): Promise<boolean> {
  return (await prisma.employee.count()) > 0;
}

/** First-run setup: creates the shop's initial Owner account. Refuses once any employee exists. */
export async function bootstrapOwnerAccount(input: BootstrapAccountInput) {
  if (await hasAnyEmployees()) {
    throw new HttpError(409, 'Setup already completed');
  }
  const pinHash = await hashPin(input.pin);
  const employee = await prisma.employee.create({
    data: { name: input.name, role: 'OWNER', pinHash },
  });
  const token = signSession({ employeeId: employee.id, name: employee.name, role: employee.role });
  return { token, employee: { id: employee.id, name: employee.name, role: employee.role } };
}

export async function createEmployee(input: EmployeeCreateInput) {
  await assertPinAvailable(input.pin);
  const pinHash = await hashPin(input.pin);
  return prisma.employee.create({
    data: { name: input.name, role: input.role, pinHash },
    select: { id: true, name: true, role: true, active: true },
  });
}

export async function listEmployees() {
  return prisma.employee.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  });
}

/**
 * PIN login is shop-wide, not per-employee: every active employee's hash is
 * checked against the entered PIN so staff only need to remember 4 digits,
 * not also pick their name off a list first.
 */
export async function loginWithPin(pin: string) {
  const employees = await prisma.employee.findMany({ where: { active: true } });
  for (const employee of employees) {
    if (await verifyPin(pin, employee.pinHash)) {
      const token = signSession({ employeeId: employee.id, name: employee.name, role: employee.role });
      return { token, employee: { id: employee.id, name: employee.name, role: employee.role } };
    }
  }
  throw new HttpError(401, 'Incorrect PIN');
}
