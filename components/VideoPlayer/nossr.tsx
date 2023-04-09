"use client";

import dynamic from "next/dynamic";

export const VideoPlayerWithoutSSR = dynamic(
  () => import("./index").then((mod) => mod.VideoPlayer),
  {
    ssr: false,
  }
);
