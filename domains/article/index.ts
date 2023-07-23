/**
 * @file 一篇文章的抽象节点
 * 为了消息提示
 * @todo https://github.com/ueberdosis/tiptap 参考这个的数据结构重构
 */
import type { Handler } from "mitt";

import { BaseDomain } from "@/domains/base";
import dayjs from "dayjs";

enum Events {
  Write,
}
type TheTypesOfEvents = {
  [Events.Write]: ArticleLineNode | ArticleSectionNode;
};
type ArticleProps = {
  on_write?: (v: ArticleLineNode | ArticleSectionNode) => void;
};
export class Article extends BaseDomain<TheTypesOfEvents> {
  static async New() {}

  lines: (ArticleLineNode | ArticleSectionNode)[] = [];
  constructor(options: Partial<{}> & ArticleProps) {
    super();

    const { on_write } = options;
    if (on_write) {
      this.on_write(on_write);
    }
  }

  write(text: ArticleLineNode | ArticleSectionNode) {
    this.lines.push(text);
    this.emit(Events.Write, text);
    return text;
  }
  clear() {
    this.lines = [];
  }
  to_json() {
    const obj = this.lines.map((line) => line.to_json());
    return obj;
  }

  on_write(handler: Handler<TheTypesOfEvents[Events.Write]>) {
    this.on(Events.Write, handler);
  }
}

type ArticleSectionNodeProps = {
  children: ArticleLineNode[];
};
export class ArticleSectionNode extends BaseDomain<TheTypesOfEvents> {
  values: ArticleSectionNodeProps;
  constructor(values: ArticleSectionNodeProps) {
    super();

    const { children } = values;
    this.values = values;
  }

  to_json() {
    const { children } = this.values;
    return {
      type: ArticleNodeType.Section,
      children: children.map((t): object => {
        return t.to_json();
      }),
    };
  }
}

type ArticleLineNodeProps = {
  color?: string;
  value?: unknown;
  children: (ArticleTextNode | ArticleLinkNode | ArticleListNode | ArticleCardNode)[];
};
export class ArticleLineNode extends BaseDomain<TheTypesOfEvents> {
  values: ArticleLineNodeProps;
  constructor(values: ArticleLineNodeProps) {
    super();

    const { children, color, value } = values;
    this.values = values;
  }

  to_json() {
    const { children, color, value } = this.values;
    return {
      type: ArticleNodeType.Line,
      color,
      value,
      children: children.map((t): object => {
        return t.to_json();
      }),
    };
  }
}

type ArticleHeadNodeProps = {
  text: string;
  level: number;
  color?: string;
};
export class ArticleHeadNode extends BaseDomain<TheTypesOfEvents> {
  values: ArticleHeadNodeProps;
  constructor(values: ArticleHeadNodeProps) {
    super();

    const { color } = values;
    this.values = values;
  }

  to_json() {
    const { level, color, text } = this.values;
    return {
      type: ArticleNodeType.Head,
      color,
      level,
      text,
    };
  }
}

type ArticleTextNodeProps = {
  text: string;
  color?: string;
};
export class ArticleTextNode extends BaseDomain<TheTypesOfEvents> {
  values: ArticleTextNodeProps;
  constructor(values: ArticleTextNodeProps) {
    super();

    const { color } = values;
    this.values = values;
  }

  to_json() {
    const { color, text } = this.values;
    return {
      type: ArticleNodeType.Text,
      color,
      text,
    };
  }
}

type ArticleLinkNodeProps = {
  text: string;
  href: string;
};
export class ArticleLinkNode extends BaseDomain<TheTypesOfEvents> {
  values: ArticleLinkNodeProps;
  constructor(values: ArticleLinkNodeProps) {
    super();

    this.values = values;
  }

  to_json() {
    const { href, text } = this.values;
    return {
      type: ArticleNodeType.Link,
      href,
      text,
    };
  }
}

type ArticleListNodeProps = {
  children: ArticleListItemNode[];
};
export class ArticleListNode extends BaseDomain<TheTypesOfEvents> {
  values: ArticleListNodeProps;
  constructor(values: ArticleListNodeProps) {
    super();

    this.values = values;
  }

  to_json() {
    const { children } = this.values;
    return {
      type: ArticleNodeType.List,
      children: children.map((c) => c.to_json()),
    };
  }
}

type ArticleListItemNodeProps = {
  children: (ArticleTextNode | ArticleLinkNode)[];
};
export class ArticleListItemNode extends BaseDomain<TheTypesOfEvents> {
  values: ArticleListItemNodeProps;

  constructor(values: ArticleListItemNodeProps) {
    super();

    this.values = values;
  }

  to_json() {
    const { children } = this.values;
    return {
      type: ArticleNodeType.ListItem,
      children: children.map((c) => c.to_json()),
    };
  }
}

type ArticleCardNodeProps = {
  value: unknown;
};
export class ArticleCardNode extends BaseDomain<TheTypesOfEvents> {
  values: ArticleCardNodeProps;
  constructor(values: ArticleCardNodeProps) {
    super();

    this.values = values;
  }

  to_json() {
    const { value } = this.values;
    return {
      type: ArticleNodeType.Card,
      value,
    };
  }
}

export class TimeNode extends BaseDomain<TheTypesOfEvents> {
  values: {
    text: string;
  } = {
    text: dayjs().format("YYYY/MM/DD HH:mm:ss"),
  };
  type = ArticleNodeType.Time;

  constructor() {
    super();
  }

  to_json() {
    const { text } = this.values;
    return {
      type: ArticleNodeType.Time,
      text,
    };
  }
}

enum ArticleNodeType {
  Line,
  Section,
  Head,
  Text,
  Link,
  List,
  ListItem,
  Card,
  Time,
}
