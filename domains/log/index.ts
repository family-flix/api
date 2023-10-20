import { throttle } from "lodash";
import dayjs from "dayjs";

import { BaseDomain } from "@/domains/base";
import { Article } from "@/domains/article";

enum Events {}
type TheTypesOfEvents = {};
type JobNewProps = {};
type LogProps = {
  output: Article;
};

export class Log extends BaseDomain<TheTypesOfEvents> {
  output: Article;
  prev_write_time: number;
  // start: number;

  constructor(props: LogProps) {
    super();

    const { output } = props;
    this.output = output;
    this.prev_write_time = dayjs().valueOf();
    // setInterval(() => {
    //   if (dayjs(this.prev_write_time).isBefore(dayjs().add(3, "minute"))) {
    //     console.log("bingo");
    //   }
    // }, 1000 * 60 * 2);
    this.output.on_write(this.update_content);
  }
  pending_lines = [];
  update_content = throttle(async () => {
    this.prev_write_time = dayjs().valueOf();
    const content = this.output.to_json();
    this.output.clear();
    if (content.length === 0) {
      return;
    }
  }, 5000);
}
