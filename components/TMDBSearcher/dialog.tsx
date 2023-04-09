"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MatchedTVOfTMDB } from "@/services";
import { Result } from "@/types";

import TMDBSearcher from ".";

export function TMDBSearcherDialog(props: {
  title?: string;
  default_value?: string;
  visible: boolean;
  on_submit: (tv: MatchedTVOfTMDB) => Promise<Result<boolean>>;
  on_visible_change: (nextVisible: boolean) => void;
}) {
  const {
    title = "影视剧搜索",
    default_value,
    visible,
    on_visible_change,
    on_submit,
  } = props;
  return (
    <Dialog open={visible} onOpenChange={on_visible_change}>
      {/* <DialogTrigger asChild>
        <Button variant="outline">Edit Profile</Button>
      </DialogTrigger> */}
      <DialogContent className="sm:max-w-[425px] xl:max-w-[728px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <TMDBSearcher
          default_keyword={default_value}
          on_submit={async (t) => {
            const r = await on_submit(t);
            if (r.data) {
              on_visible_change(false);
              return;
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
