import { useCallback, useMemo, useRef, useState } from "react";
import { debounce } from "lodash/fp";
import { useRouter } from "next/router";
import {
  ArrowBigLeft,
  ArrowBigRight,
  ArrowLeft,
  Gauge,
  Glasses,
  List,
  Loader,
  MoreHorizontal,
  Pause,
  Play,
  RotateCw,
} from "lucide-react";

import { VideoPlayerWithoutSSR } from "@/components/VideoPlayer/nossr";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Player } from "@/domains/player";

const TestPage = () => {
  const router = useRouter();
  const [show_menus, set_show_menus] = useState(true);
  const player_ref = useRef(
    new Player({
      url: "",
      on_change(next_values) {
        set_values(next_values);
        values_ref.current = next_values;
      },
    })
  );
  const values_ref = useRef(player_ref.current.values);
  const [values, set_values] = useState(player_ref.current.values);
  const hide_menus = useMemo(() => {
    return debounce(2000, () => {
      if (values_ref.current.playing) {
        set_show_menus(false);
      }
    });
  }, []);
  const toggle_menu_visible = useCallback(() => {
    set_show_menus((prev) => {
      const target_visible = !prev;
      if (values_ref.current.playing) {
        hide_menus();
      }
      return target_visible;
    });
  }, []);

  return (
    <div className="overflow-hidden relative w-screen h-screen bg-black">
      <div className="absolute inset-0 z-10">
        <div
          className={cn(show_menus ? "hidden" : "block", "absolute inset-0")}
          onClick={toggle_menu_visible}
        />
        <div
          className={cn(show_menus ? "block" : "hidden", "absolute inset-0")}
          onClick={toggle_menu_visible}
        >
          <div
            className="p-4"
            onClick={() => {
              router.back();
            }}
          >
            <ArrowLeft className="w-8 h-8 text-gray-800 dark:text-gray-100" />
          </div>
          <div className="absolute bottom-8 w-full">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center">
                <ArrowBigLeft className="w-8 h-8 text-gray-800 dark:text-gray-100" />
                <p className="mt-2 text-sm text-gray-800 dark:text-gray-100">
                  上一集
                </p>
              </div>
              <div className="flex flex-col items-center">
                <RotateCw className="w-8 h-8 text-gray-800 dark:text-gray-100" />
                <p className="mt-2 text-sm text-gray-800 dark:text-gray-100">
                  刷新
                </p>
              </div>
              <div className="flex flex-col items-center">
                <ArrowBigRight className="w-8 h-8 text-gray-800 dark:text-gray-100" />
                <p className="mt-2 text-sm text-gray-800 dark:text-gray-100">
                  下一集
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-12 w-full px-2">
              <Sheet>
                <SheetTrigger>
                  <div className="flex flex-col items-center">
                    <List className="w-6 h-6 text-gray-800 dark:text-gray-100" />
                    <p className="mt-2 text-sm text-gray-800 dark:text-gray-100">
                      播放列表
                    </p>
                  </div>
                </SheetTrigger>
                <SheetContent position="bottom" size="xl">
                  <div>
                    {[
                      {
                        id: "123",
                        file_name: "test01",
                        episode: "E01",
                      },
                    ].map((episode) => {
                      const { id, file_name, episode: e } = episode;
                      return (
                        <div
                          key={id}
                          className="p2 cursor-pointer"
                          onClick={() => {
                            // ...
                          }}
                        >
                          <p>{e}</p>
                          <p>{file_name}</p>
                        </div>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
              <div className="flex flex-col items-center">
                <Gauge className="w-6 h-6 text-gray-800 dark:text-gray-100" />
                <p className="mt-2 text-sm text-gray-800 dark:text-gray-100">
                  倍速
                </p>
              </div>
              <Sheet>
                <SheetTrigger>
                  <div className="flex flex-col items-center">
                    <Glasses className="w-6 h-6 text-gray-800 dark:text-gray-100" />
                    <p className="mt-2 text-sm text-gray-800 dark:text-gray-100">
                      分辨率
                    </p>
                  </div>
                </SheetTrigger>
                <SheetContent position="bottom">
                  <div>超高清</div>
                  <div>高清</div>
                  <div>普清</div>
                  <div>标清</div>
                </SheetContent>
              </Sheet>
              <Sheet>
                <SheetTrigger>
                  <div className="flex flex-col items-center focus:outline-none focus:ring-0">
                    <MoreHorizontal className="w-6 h-6 text-gray-800 dark:text-gray-100" />
                    <p className="mt-2 text-sm text-gray-800 dark:text-gray-100">
                      更多
                    </p>
                  </div>
                </SheetTrigger>
                <SheetContent position="bottom">
                  <p className="text-gray-100">Hello</p>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute z-20 w-full min-h-[240px] top-[24%]">
        <VideoPlayerWithoutSSR
          className=""
          url="https://cdn.weipaitang.com/static/public/202303089a46807b-7727-807b7727-69bb-5ae2c15fc8e9.mp4"
          core={player_ref.current}
          // width={1920}
          // height={1080}
        />
        <div className={cn("absolute inset-0")}>
          <div
            className={cn(show_menus ? "hidden" : "block", "absolute inset-0")}
            onClick={toggle_menu_visible}
          />
          <div
            className={cn(
              show_menus ? "block" : "hidden",
              "absolute left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]"
            )}
            onClick={toggle_menu_visible}
          >
            {values.playing ? (
              <div className="p4">
                <Pause
                  className="w-16 h-16 text-gray-800 dark:text-gray-100"
                  onClick={async () => {
                    await player_ref.current.pause();
                    set_values(player_ref.current.values);
                    toggle_menu_visible();
                  }}
                />
              </div>
            ) : (
              <div className="p-4">
                <div className="absolute p-2 z-10 inset-0 rounded-full bg-black opacity-50" />
                <Play
                  className="relative z-20 left-1 w-16 h-16 text-gray-800 dark:text-gray-100"
                  onClick={async () => {
                    await player_ref.current.play();
                    set_values(player_ref.current.values);
                    set_show_menus(false);
                    // toggle_menu_visible();
                  }}
                />
              </div>
            )}
          </div>
          {/* <Loader className="w-16 h-16 text-gray-800 dark:text-gray-100" /> */}
        </div>
      </div>
    </div>
  );
};

export default TestPage;
