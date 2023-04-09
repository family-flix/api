import { useEffect } from "react";
import Head from "next/head";
import type { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";

import Helper from "@list-helper/core/core";
import { Toaster } from "@/components/ui/toaster";

import "@/styles/globals.css";

// if (typeof window === "undefined") {
//   (async () => {
//     const CronJob = await import("cron");
//     const { store } = await import("@/store/sqlite");
//     const { check_in } = await import("@/scripts/check_in");
//     new CronJob.CronJob(
//       "0 * * * * *",
//       () => {
//         check_in(store);
//       },
//       null,
//       true,
//       "Asia/Shanghai"
//     );
//   })();
// }

Helper.onError = (error: Error) => {
  alert(error.message);
};
Helper.defaultProcessor = (originalResponse) => {
  if (originalResponse.error) {
    return {
      dataSource: [],
      page: 1,
      pageSize: 20,
      total: 0,
      noMore: false,
      error: new Error(
        `process response fail, because ${originalResponse.error.message}`
      ),
    };
  }
  try {
    const data = originalResponse.data || originalResponse;
    const { list, page, page_size, total, no_more } = data;
    const result = {
      dataSource: list,
      page,
      pageSize: page_size,
      total,
      noMore: false,
    };
    if (total <= page_size * page) {
      result.noMore = true;
    }
    if (no_more !== undefined) {
      result.noMore = no_more;
    }
    return result;
  } catch (error) {
    return {
      dataSource: [],
      page: 1,
      pageSize: 20,
      total: 0,
      noMore: false,
      error: new Error(
        `process response fail, because ${(error as Error).message}`
      ),
    };
  }
};

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // if (e.key === "j" && e.metaKey) {
      //   setOpen((open) => !open);
      // }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);
  return (
    <>
      <ThemeProvider>
        <Component {...pageProps} />
      </ThemeProvider>
      <Toaster />
    </>
  );
}

export default MyApp;
