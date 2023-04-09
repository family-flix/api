import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Result } from "@/types";

const Modal = (props: {
  title: string;
  visible?: boolean;
  trigger: React.ReactNode;
  children: React.ReactNode;
  on_ok?: () => Promise<Result<null>>;
  on_cancel?: () => Promise<Result<null>>;
}) => {
  const { title, trigger, children, on_ok, on_cancel } = props;

  const [visible, set_visible] = useState(false);

  return (
    <Dialog
      open={visible}
      onOpenChange={(next_visible) => {
        set_visible(next_visible);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] xl:max-w-[728px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
        <DialogFooter>
          <div className="space-x-2">
            <Button
              variant="subtle"
              onClick={() => {
                set_visible(false);
                if (on_cancel) {
                  on_cancel();
                }
              }}
            >
              取消
            </Button>
            <Button
              onClick={async () => {
                if (on_ok) {
                  const r = await on_ok();
                  if (r.error) {
                    return;
                  }
                }
                set_visible(false);
              }}
            >
              确认
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
