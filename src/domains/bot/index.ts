/**
 * @file 机器人
 * yarn esbuild domains/bot/index.ts --bundle --platform=node --format=cjs --minify --outfile=dist/bot.js
 */
import { ReadStream } from "fs";

import { Application } from "@/domains/application/index";
import { DataStore } from "@/domains/store/types";
import { SpeechToText } from "@/domains/speech/index";
import { Result } from "@/types/index";

type FlixWechatBotProps = {
  app: Application<any>;
};
export class FlixWechatBot {
  $app: Application<any>;
  $store: DataStore;

  constructor(props: FlixWechatBotProps) {
    const { app } = props;

    this.$app = app;
    this.$store = app.store;
  }

  async handleText(text: string, talker: { id: string; name: string }) {
    const r1 = text.match(/^\/bind ([0-9a-zA-Z]{15})/);
    if (r1) {
      const [, id] = r1;
      const matched = await this.$store.prisma.member.findFirst({
        where: {
          id,
        },
      });
      if (!matched) {
        return Result.Err("没有匹配的成员");
      }
      await this.$store.prisma.member.update({
        where: {
          id: matched.id,
        },
        data: {
          // ...
        },
      });
      return Result.Ok({
        msg: "绑定成功",
      });
    }
    return Result.Err("不是合法命令");
  }
  async handleAudio(stream: ReadStream) {
    const { VOICE_RECOGNIZE_SECRET_ID: secret_id, VOICE_RECOGNIZE_SECRET_KEY: secret_key } = this.$app.env;
    if (!secret_id || !secret_key) {
      return Result.Err("缺少 VOICE_RECOGNIZE_SECRET_ID");
    }
    const chunks: Buffer[] = [];
    const r: Result<string> = await new Promise((resolve) => {
      stream.on("data", (chunk) => {
        chunks.push(chunk as Buffer);
      });
      stream.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const base64String = buffer.toString("base64");
        resolve(Result.Ok(base64String));
      });
      stream.on("error", (err) => {
        resolve(Result.Err(err.message));
      });
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const data = r.data;
    const client = new SpeechToText({
      secret_id,
      secret_key,
    });
    const r2 = await client.run(data);
    if (r2.error) {
      return Result.Err(r2.error.message);
    }
    const text = r2.data;
    if (text.match(/^搜索/)) {
      const name = text.replace(/^搜索/, "");
      if (!name) {
        return Result.Err("缺少搜索关键字");
      }
      const medias = await this.$store.prisma.media.findMany({
        where: {
          profile: {
            OR: [
              {
                name: {
                  contains: name,
                },
              },
              {
                original_name: {
                  contains: name,
                },
              },
              {
                alias: {
                  contains: name,
                },
              },
            ],
          },
        },
        include: {
          profile: true,
        },
        take: 5,
      });
      const media_names = medias.map((media) => {
        const { profile } = media;
        return profile.name;
      });
      return Result.Ok(media_names.join("\n"));
    }
    return Result.Err(`未知命令 '${text}'`);
  }
}
