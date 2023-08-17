import { BaseDomain } from "@/domains/base";
import { DatabaseStore } from "@/domains/store";

enum Events {}
type TheTypesOfEvents = {};
type NotifyProps = {
  store: DatabaseStore;
};

export class Notify extends BaseDomain<TheTypesOfEvents> {
  store: NotifyProps["store"];

  constructor(props: { _name?: string } & NotifyProps) {
    super(props);

    const { store } = props;
    this.store = store;
  }
}
