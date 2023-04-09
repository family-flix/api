/**
 * @file 转存任务详情页面
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { SharedFilesAnalysis } from "@/domains/shared_files";
import { TaskResultOfSharedTV } from "@/domains/shared_files/services";
import useHelper from "@/domains/list-helper-hook";
import { fetch_aliyun_drives } from "@/domains/drive/services";
import TVProfileWithFolder from "@/components/TVProfileWithFolder";
import { Button } from "@/components/ui/button";

const s = new SharedFilesAnalysis();

const TaskProfilePage = () => {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const [task_result, set_task_result] = useState<null | TaskResultOfSharedTV>(
    null
  );
  const [response, helper] = useHelper<{ id: string; user_name: string }>(
    fetch_aliyun_drives
  );

  useEffect(() => {
    if (!id) {
      return;
    }
    helper.init();
    s.on_success = (data) => {
      set_task_result(data);
    };
    s.profile(id);
  }, [id]);

  const { dataSource } = response;
  if (task_result === null) {
    return null;
  }

  return (
    <div className="min-h-screen pt-8 bg-gray-100">
      <div className="m-auto w-[960px] space-y-4">
        <h2 className="h2 mt-4">索引结果</h2>
        <TVProfileWithFolder
          data_source={task_result.list}
          extra={(task) => {
            return (
              <div className="space-x-4">
                {dataSource.map((drive) => {
                  const { id: drive_id, user_name } = drive;
                  return (
                    <Button
                      key={drive_id}
                      onClick={() => {
                        s.save(task, drive_id);
                      }}
                    >
                      保存至 {user_name} 盘中
                    </Button>
                  );
                })}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
};

export default TaskProfilePage;
