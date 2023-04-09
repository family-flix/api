import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { Result } from "@/types";

const SingleModal = (props: {
  title: string;
  visible?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  on_ok?: () => Promise<Result<null>>;
  on_cancel?: () => Promise<Result<null>>;
}) => {
  const {
    title,
    visible: prop_visible,
    children,
    footer,
    on_ok,
    on_cancel,
  } = props;

  const [visible, set_visible] = useState(false);
  const visible_ref = useRef(visible);
  useEffect(() => {
    visible_ref.current = visible;
  }, [visible]);
  useEffect(() => {
    console.log("props visible", prop_visible, visible_ref.current);
    if (prop_visible !== undefined && prop_visible !== visible_ref.current) {
      set_visible(prop_visible);
    }
  }, [prop_visible]);

  return (
    <Dialog
      open={visible}
      onOpenChange={(next_visible) => {
        if (next_visible === false) {
          if (on_cancel) {
            on_cancel();
          }
        }
        set_visible(next_visible);
      }}
    >
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
        <DialogFooter>
          {(() => {
            if (footer !== undefined) {
              return footer;
            }
            return (
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
            );
          })()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SingleModal;
