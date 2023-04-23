import { prisma } from "@/store";

// Authentication attributes
export interface Credentials {
  email: string;
  password: string;
}

/**
 * @param {string} email - 邮箱
 * @returns
 */
export function find_user_by_email(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      credential: true,
    },
  });
}
