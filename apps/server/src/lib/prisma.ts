import pkg from '@prisma/client';
const { PrismaClient } = pkg;

// Single shared instance — this app runs single-process on the shop's own machine.
export const prisma = new PrismaClient();

