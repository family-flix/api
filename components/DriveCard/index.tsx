/**
 * @file 云盘卡片，包含对云盘的业务逻辑
 */
import { useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/router";

import { Drive } from "@/domains/drive";
import { AliyunDriveItem } from "@/domains/drive/services";
import { useToast } from "@/hooks/use-toast";
import LazyImage from "@/components/LazyImage";
import { Button } from "@/components/ui/button";
import Modal from "@/components/Modal";
import { Input } from "@/components/ui/input";
import FolderMenu from "@/components/FolderMenu";

const DriveCard = (props: AliyunDriveItem) => {
  const { id, user_name, avatar, total_size, used_size } = props;
  const router = useRouter();
  const { toast } = useToast();

  const drive_ref = useRef(new Drive({ id }));
  const drive = drive_ref.current;

  useEffect(() => {
    drive.on_error_notice = (msg) => {
      toast({
        title: msg,
      });
    };
    drive.on_notice = (msg) => {
      toast({
        title: msg,
      });
    };
    drive.on_success = (data) => {
      toast({
        title: "刮削完成",
        description: `${data.desc} 完成`,
      });
    };
  }, []);

  return (
    <div key={id}>
      <FolderMenu
        options={[
          {
            label: "详情",
            on_click: () => {
              router.push(`/admin/drive/${id}`);
            },
          },
          {
            label: "导出",
            on_click() {
              drive.export();
            },
          },
          {
            label: "刷新",
            on_click() {
              drive.refresh();
            },
          },
          {
            label: "修改 refresh_token",
            on_click() {
              // drive.update_refresh_token(),
            },
          },
          {
            label: "查看重复影片",
            on_click() {
              router.push(`/admin/drive/duplicate/${id}`);
            },
          },
        ]}
      >
        <div className="card">
          <div className="flex">
            <LazyImage
              className="overflow-hidden w-16 h-16 mr-4 rounded"
              src={avatar}
              alt={user_name}
            />
            <div>
              <div className="text-xl">{user_name}</div>
              <div>{user_name}</div>
              <div className="flex items-center space-x-2">
                <p>
                  {used_size}/{total_size}
                </p>
                <div
                  className="cursor-pointer"
                  onClick={async (event) => {
                    event.stopPropagation();
                    await drive.refresh();
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4 opacity-70" />
                </div>
              </div>
              <div className="mt-4 space-x-2">
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={async (event) => {
                    event.stopPropagation();
                    drive.start_scrape();
                    toast({
                      title: "Tip",
                      description: "开始刮削，请等待一段时间后刷新查看",
                    });
                  }}
                >
                  刮削
                </Button>
                <Modal
                  title="设置索引文件夹"
                  trigger={
                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      设置索引文件夹
                    </Button>
                  }
                >
                  <Input
                    onChange={(event) => {
                      drive.set_root_folder_id(event.target.value);
                    }}
                  />
                </Modal>
              </div>
            </div>
          </div>
        </div>
      </FolderMenu>
      {/* <Modal title="修改 refresh_token" visible={}>
                    <Input />
      </Modal> */}
    </div>
  );
};

export default DriveCard;
