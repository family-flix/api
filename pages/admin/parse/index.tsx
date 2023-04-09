/**
 * @file 视频文件名解析页面
 */
import React, { useCallback, useState } from "react";

import {
  ParsedVideoInfo,
  parse_filename_for_video,
  VideoKeys,
  VIDEO_ALL_KEYS,
  VIDEO_KEY_NAME_MAP,
} from "@/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Head from "next/head";

const VideoParsingPage = () => {
  const [info, setInfo] = useState<ParsedVideoInfo | null>(null);
  const [value, setValue] = useState("");

  const parse = useCallback(async (filename: string) => {
    if (!filename) {
      alert("please input filename");
      return;
    }
    const data = parse_filename_for_video(filename, VIDEO_ALL_KEYS);
    setInfo(data);
  }, []);

  return (
    <>
      <Head>
        <title>文件名称解析</title>
      </Head>
      <div>
        <div>
          <div className="m-auto w-[960px]">
            <div className="mt-12">
              <Textarea
                className="h-32"
                placeholder="please input filename"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                }}
              />
              <div className="grid mt-4">
                <Button
                  className="btn btn--primary btn--block"
                  onClick={() => {
                    parse(value);
                  }}
                >
                  解析
                </Button>
              </div>
            </div>
            {(() => {
              if (info === null) {
                return null;
              }
              const keys = Object.keys(info) as VideoKeys[];
              return (
                <div className="mt-4">
                  {keys.map((k) => {
                    const v = info[k];
                    return (
                      <div key={k} className="flex align-middle">
                        <div className="align-left min-w-[114px]">
                          {VIDEO_KEY_NAME_MAP[k]}
                        </div>
                        <span>：</span>
                        <div className="align-left w-full break-all whitespace-pre-wrap">
                          {v}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </>
  );
};

export default VideoParsingPage;
