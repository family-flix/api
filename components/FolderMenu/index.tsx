"use client";

import {
  Cloud,
  CreditCard,
  Github,
  Keyboard,
  LifeBuoy,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  PlusCircle,
  Settings,
  User,
  UserPlus,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export type MenuOpt = {
  label: string;
  children?: {
    label: string;
    on_click?: (value?: unknown) => void;
  }[];
  on_click?: (value?: unknown) => void;
};
const FolderMenu = (props: {
  options: MenuOpt[];
  children: React.ReactNode;
}) => {
  const { options, children } = props;
  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {options.map((opt) => {
          const { label, on_click, children } = opt;
          if (!children) {
            return (
              <ContextMenuItem
                key={label}
                className="cursor-pointer"
                onClick={(event) => {
                  event.stopPropagation();
                  if (on_click) {
                    on_click();
                  }
                }}
              >
                {label}
              </ContextMenuItem>
            );
          }
          return (
            <ContextMenuSub key={label}>
              <ContextMenuSubTrigger inset>{label}</ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                {children.map((c) => {
                  return (
                    <ContextMenuItem
                      key={c.label}
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (c.on_click) {
                          c.on_click();
                        }
                      }}
                    >
                      {c.label}
                    </ContextMenuItem>
                  );
                })}
              </ContextMenuSubContent>
            </ContextMenuSub>
          );
        })}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default FolderMenu;
