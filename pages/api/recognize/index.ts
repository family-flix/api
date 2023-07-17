/**
 * @file 识别一段话
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import * as tencentcloud from "tencentcloud-sdk-nodejs-asr";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";

const AsrClient = tencentcloud.asr.v20190614.Client;

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { data } = req.body as { data: string };

  const secret_id = process.env.VOICE_RECOGNIZE_SECRET_ID;
  const secret_key = process.env.VOICE_RECOGNIZE_SECRET_KEY;
  if (!secret_id || !secret_key) {
    return e(Result.Err("缺少识别凭证"));
  }
  const clientConfig = {
    credential: {
      secretId: secret_id,
      secretKey: secret_key,
    },
    region: "ap-guangzhou",
    profile: {
      httpProfile: {
        endpoint: "asr.tencentcloudapi.com",
      },
    },
  };
  const client = new AsrClient(clientConfig);
  function query_task_status(TaskId: number) {
    const r = client.DescribeTaskStatus({ TaskId }).then(
      (data) => {
        const { Data } = data;
        if (Data.StatusStr === "success") {
          return Result.Ok({ ok: true, text: Data.Result.replace(/^\[[0-9 ,\.:\]]{1,}/, "").replace(/\w/, "") });
        }
        if (Data.StatusStr === "waiting") {
          return Result.Ok({ ok: false, text: "" });
        }
        if (Data.StatusStr === "doing") {
          return Result.Ok({ ok: false, text: "" });
        }
        console.log("status error", Data.StatusStr);
        return Result.Err(Data.ErrorMsg);
      },
      (err) => {
        return Result.Err(err.message);
      }
    ) as Promise<Result<{ ok: boolean; text: string }>>;
    return r;
  }
  const params = {
    Data: data,
    EngineModelType: "16k_zh",
    ChannelNum: 1,
    ResTextFormat: 0,
    SourceType: 1,
    ConvertNumMode: 0,
    FilterDirty: 0,
    FilterPunc: 2,
    FilterModal: 0,
  };
  async function run() {
    try {
      const data = await client.CreateRecTask(params);
      const { Data } = data;
//       console.log(0);
      if (!Data) {
        // console.log(1);
        return Result.Err("未知错误");
      }
      const { TaskId } = Data;
      let need_finish_task = false;
      let start = new Date().valueOf();
//       console.log(2);
      while (need_finish_task === false) {
        const r = await query_task_status(TaskId);
        const end = new Date().valueOf();
        if (r.error) {
          console.log(r.error.message);
        //   console.log(3);
          need_finish_task = true;
          return Result.Err(r.error);
        }
        const { ok, text } = r.data;
        if (ok) {
        //   console.log(4);
          need_finish_task = true;
          return Result.Ok(text);
        }
        if ((end - start) / 1000 >= 5) {
        //   console.log(5);
          need_finish_task = true;
        }
      }
      return Result.Err("任务超时");
    } catch (err) {
//       console.log(6);
      const e = err as Error;
      return Result.Err(e.message);
    }
  }
  const r2 = await run();
  if (r2.error) {
    return e(r2);
  }
//   console.log(r2.data);
  res.status(200).json({ code: 0, msg: "", data: r2.data });
}
