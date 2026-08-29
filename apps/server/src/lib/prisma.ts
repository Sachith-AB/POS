import { PrismaClient } from '@prisma/client';

// Single shared instance — this app runs single-process on the shop's own machine.
export const prisma = new PrismaClient();
