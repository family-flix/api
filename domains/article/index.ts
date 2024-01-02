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
  static build_line(texts: unknown[]) {
    return new ArticleLineNode({
      children: texts
        .filter((text) => {
          return text !== undefined && text !== "" && text !== null;
        })
        .map(
          (text) =>
            new ArticleTextNode({
              text: String(text),
            })
        ),
    });
  }

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
  write_line(texts: unknown[]) {
    this.write(Article.build_line(texts));
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
  children: (ArticleLineNode | ArticleListNode)[];
};
export class ArticleSectionNode extends BaseDomain<TheTypesOfEvents> {
  values: ArticleSectionNodeProps & {
    created: number;
  };
  constructor(values: ArticleSectionNodeProps) {
    super();

    const { children } = values;
    this.values = {
      ...values,
      created: new Date().valueOf(),
    };
  }

  to_json() {
    const { children, created } = this.values;
    return {
      type: ArticleNodeType.Section,
      children: children.map((t): object => {
        return t.to_json();
      }),
      created,
    };
  }
}

type ArticleLineNodeProps = {
  color?: string;
  value?: unknown;
  children: (ArticleTextNode | ArticleLinkNode | ArticleListNode | ArticleCardNode)[];
};
export class ArticleLineNode extends BaseDomain<TheTypesOfEvents> {
  values: ArticleLineNodeProps & { created: number };

  constructor(values: ArticleLineNodeProps) {
    super();

    const { children, color, value } = values;
    this.values = {
      ...values,
      created: new Date().valueOf(),
    };
  }

  to_json() {
    const { children, color, value, created } = this.values;
    return {
      type: ArticleNodeType.Line,
      color,
      value,
      children: children.map((t): object => {
        return t.to_json();
      }),
      created,
    };
  }
}

type ArticleHeadNodeProps = {
  text: string;
  level: number;
  color?: string;
};
export class ArticleHeadNode extends BaseDomain<TheTypesOfEvents> {
  values: ArticleHeadNodeProps & {
    created: number;
  };
  constructor(values: ArticleHeadNodeProps) {
    super();

    const { color } = values;
    this.values = {
      ...values,
      created: new Date().valueOf(),
    };
  }

  to_json() {
    const { level, color, text, created } = this.values;
    return {
      type: ArticleNodeType.Head,
      color,
      level,
      text,
      created,
    };
  }
}

type ArticleTextNodeProps = {
  text: string;
  color?: string;
};
export class ArticleTextNode extends BaseDomain<TheTypesOfEvents> {
  values: ArticleTextNodeProps & {
    created: number;
  };
  constructor(values: ArticleTextNodeProps) {
    super();

    const { color } = values;
    this.values = {
      ...values,
      created: new Date().valueOf(),
    };
  }

  to_json() {
    const { color, text, created } = this.values;
    return {
      type: ArticleNodeType.Text,
      color,
      text,
      created,
    };
  }
}

type ArticleLinkNodeProps = {
  text: string;
  href: string;
};
export class ArticleLinkNode extends BaseDomain<TheTypesOfEvents> {
  values: ArticleLinkNodeProps & {
    created: number;
  };
  constructor(values: ArticleLinkNodeProps) {
    super();

    this.values = {
      ...values,
      created: new Date().valueOf(),
    };
  }

  to_json() {
    const { href, text, created } = this.values;
    return {
      type: ArticleNodeType.Link,
      href,
      text,
      created,
    };
  }
}

type ArticleListNodeProps = {
  children: ArticleListItemNode[];
};
export class ArticleListNode extends BaseDomain<TheTypesOfEvents> {
  values: ArticleListNodeProps & {
    created: number;
  };
  constructor(values: ArticleListNodeProps) {
    super();

    this.values = {
      ...values,
      created: new Date().valueOf(),
    };
  }

  to_json() {
    const { children, created } = this.values;
    return {
      type: ArticleNodeType.List,
      children: children.map((c) => c.to_json()),
      created,
    };
  }
}

type ArticleListItemNodeProps = {
  children: (ArticleTextNode | ArticleLinkNode)[];
};
export class ArticleListItemNode extends BaseDomain<TheTypesOfEvents> {
  values: ArticleListItemNodeProps & {
    created: number;
  };

  constructor(values: ArticleListItemNodeProps) {
    super();

    this.values = {
      ...values,
      created: new Date().valueOf(),
    };
  }

  to_json() {
    const { children, created } = this.values;
    return {
      type: ArticleNodeType.ListItem,
      children: children.map((c) => c.to_json()),
      created,
    };
  }
}

type ArticleCardNodeProps = {
  value: unknown;
};
export class ArticleCardNode extends BaseDomain<TheTypesOfEvents> {
  values: ArticleCardNodeProps & {
    created: number;
  };
  constructor(values: ArticleCardNodeProps) {
    super();

    this.values = {
      ...values,
      created: new Date().valueOf(),
    };
  }

  to_json() {
    const { value, created } = this.values;
    return {
      type: ArticleNodeType.Card,
      value,
      created,
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
