import { Result } from "@/types";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
export const store_factory = () => {
  return {
    async update_aliyun_drive(
      id: string,
      { total_size, used_size }: { total_size: number; used_size: number }
    ) {
      const r = await prisma.drive.update({
        where: {
          id,
        },
        data: {
          total_size,
          used_size,
        },
      });
      return Result.Ok(r);
    },
    async find_aliyun_drive({ id }: { id: string }) {
      const r = await prisma.drive.findUnique({
        where: {
          id,
        },
      });
      return Result.Ok(r);
    },
    async find_aliyun_drive_token({ drive_id }: { drive_id: string }) {
      const r = await prisma.driveToken.findUnique({
        where: { drive_id },
      });
      return Result.Ok(r);
    },
    async update_aliyun_drive_token(
      id: string,
      data: {
        refresh_token: string;
        access_token: string;
        expired_at: number;
      }
    ) {
      const { refresh_token, access_token, expired_at } = data;
      const r = await prisma.driveToken.update({
        where: {
          id,
        },
        data: {
          refresh_token,
          access_token,
          expired_at,
        },
      });
      return Result.Ok(r);
    },
  };
};

export const store = store_factory();
