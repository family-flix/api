"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MatchedTVOfTMDB } from "@/services";
import { Result } from "@/types";

import TVForm from ".";

export function TVFormDialog(props: {
  title?: string;
  visible?: boolean;
  trigger?: React.ReactNode;
  on_submit?: (tv: MatchedTVOfTMDB) => Promise<Result<boolean>>;
  on_visible_change?: (nextVisible: boolean) => void;
}) {
  const {
    title = "更新影视剧信息",
    visible,
    trigger,
    on_visible_change,
    on_submit,
  } = props;
  return (
    <Dialog open={visible} onOpenChange={on_visible_change}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px] xl:max-w-[728px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <TVForm
          on_submit={async (t) => {
            if (on_submit) {
              const r = await on_submit(t);
              if (r.data && on_visible_change) {
                on_visible_change(false);
                return;
              }
              return;
            }
            if (on_visible_change) {
              on_visible_change(false);
            }
          }}
        />
        <DialogFooter>
          <Button variant="subtle">取消</Button>
          <Button>确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
