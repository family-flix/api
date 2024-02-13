import * as tencentcloud from "tencentcloud-sdk-nodejs-asr";
import { Client } from "tencentcloud-sdk-nodejs-asr/tencentcloud/services/asr/v20190614/asr_client";

import { Result } from "@/types";

const AsrClient = tencentcloud.asr.v20190614.Client;
type SpeechToTextProps = {
  secret_id: string;
  secret_key: string;
};
export class SpeechToText {
  $client: Client;

  constructor(props: SpeechToTextProps) {
    const { secret_id, secret_key } = props;
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
    this.$client = client;
  }
  query_task_status(TaskId: number) {
    const r = this.$client.DescribeTaskStatus({ TaskId }).then(
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
  async run(data: string) {
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
    try {
      const data = await this.$client.CreateRecTask(params);
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
        const r = await this.query_task_status(TaskId);
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
}
