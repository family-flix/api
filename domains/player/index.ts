import { seconds_to_hour } from "@/utils";

export class Player {
  /**
   * 视频播放地址
   */
  url: string;
  /**
   * 视图层用于播放视频的组件
   */
  $video?: Pick<
    HTMLVideoElement,
    | "play"
    | "pause"
    | "volume"
    | "currentTime"
    | "oncanplay"
    | "ontimeupdate"
    | "onplay"
    | "onplaying"
    | "onpause"
    | "onended"
  >;
  _timer: null | NodeJS.Timer = null;
  _playing = false;
  _ended = false;
  _duration = 0;
  _current_time = 0;
  _target_current_time = 0;
  _progress = 0;

  on_change: (next_values: Player["values"]) => void;

  constructor(data: {
    url: string;
    width?: number;
    height?: number;
    $video?: Player["$video"];
    on_change: Player["on_change"];
  }) {
    const { url, $video, on_change } = data;
    if ($video) {
      this.bind_$video($video);
    }
    this.url = url;
    this.on_change = on_change;

    const ev = [
      "play",
      "playing",
      "pause",
      "ended",
      "error",
      "seeking",
      "seeked",
      "progress",
      "timeupdate",
      "waiting",
      "canplay",
      "canplaythrough",
      "durationchange",
      "volumechange",
      "ratechange",
      "loadedmetadata",
      "loadeddata",
      "loadstart",
    ];
  }
  bind_$video($video: Player["$video"]) {
    if (!$video) {
      throw new Error("请传入视频节点");
    }
    $video.oncanplay = (event) => {
      const { duration } = event.currentTarget as HTMLVideoElement;
      console.log("[]()oncanplay", duration);
      this._duration = duration;
    };
    $video.onplay = () => {
      // console.log("[](Player)onplay");
      this._playing = true;
      if (this.on_change) {
        this.on_change(this.values);
      }
    };
    $video.ontimeupdate = (event) => {
      const { currentTime, duration } = event.currentTarget as HTMLVideoElement;
      this._current_time = currentTime;

      // console.log("[]()timeupdate", currentTime, duration);
      if (typeof duration === "number" && !Number.isNaN(duration)) {
        this._duration = duration;
      }
      const progress = Math.floor((currentTime / this._duration) * 100);
      this._progress = progress;
      if (this.on_change) {
        this.on_change(this.values);
      }
    };
    $video.onpause = () => {
      console.log("[](Player)onpause");
      this._playing = false;
      if (this.on_change) {
        this.on_change(this.values);
      }
    };
    $video.onended = () => {
      console.log("[](Player)onended");
      this._playing = false;
      this._ended = true;
      if (this.on_change) {
        this.on_change(this.values);
      }
    };
    this.$video = $video;
  }
  /**
   * 开始播放
   */
  async play() {
    if (!this.$video) {
      return;
    }
    await this.$video.play();
    return true;
    // if (this._timer !== null) {
    //   return;
    // }
    // this._timer = setInterval(() => {
    //   this.do_something();
    // }, 3000);
  }
  /**
   * 暂停播放
   */
  async pause() {
    if (!this.$video) {
      return;
    }
    await this.$video.pause();
    return true;
  }
  /**
   * 调整音量
   * @param v
   */
  adjust_volume(v: number) {
    if (!this.$video) {
      return;
    }
    this.$video.volume = v;
  }
  /** 设置目标进度 */
  set_target_progress(progress: number) {
    this._target_current_time = Math.floor((progress / 100) * this._duration);
  }
  commit_target_progress() {
    if (!this.$video) {
      return;
    }
    this.$video.currentTime = this._target_current_time;
  }
  do_something() {}
  /**
   *
   */
  get values() {
    const v = {
      playing: this._playing,
      duration: seconds_to_hour(this._duration),
      current_time: seconds_to_hour(this._current_time),
      target_time: seconds_to_hour(this._target_current_time),
      progress: this._progress,
    };
    // console.log("values ", v);
    return v;
  }
  /**
   * 播放是否已完成
   */
  get is_ended() {
    return true;
  }
}
