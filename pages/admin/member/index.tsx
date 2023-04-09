import { useEffect, useState } from "react";
import Head from "next/head";

import Modal from "@/components/Modal";
import ScrollView from "@/components/ScrollView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useHelper from "@/domains/list-helper-hook";
import {
  add_member,
  add_recommended_tv,
  create_member_auth_link,
  fetch_members,
  MemberItem,
} from "@/services";
import { Result } from "@/types";
import CopyAndCheckIcon from "@/components/CopyIcon";
import { copy } from "@/utils/front_end";
import { cn } from "@/lib/utils";
import TVSelect from "@/components/TVSelect";
import { PartialSearchedTV } from "@/domains/tmdb/services";
import LazyImage from "@/components/LazyImage";

const MemberManagePage = () => {
  const [response, helper] = useHelper<MemberItem>(fetch_members);
  const [remark, set_remark] = useState("");
  const [selected_tv, set_selected_tv] = useState<PartialSearchedTV | null>(
    null
  );
  const [cur_member, set_cur_member] = useState<MemberItem | null>(null);

  useEffect(() => {
    helper.init();
  }, []);

  const { dataSource, loading, noMore, error } = response;

  return (
    <>
      <Head>
        <title>成员管理</title>
      </Head>
      <div className="min-h-screen pt-8">
        <div className="m-auto w-[960px] space-y-4">
          <h2 className="h2 mt-4">成员列表</h2>
          <Modal
            title="新增成员"
            trigger={<Button>新增成员</Button>}
            on_ok={async () => {
              const resp = await add_member({
                remark,
              });
              if (resp.error) {
                alert(resp.error.message);
                return Result.Err(resp.error);
              }
              helper.refresh();
              return Result.Ok(null);
            }}
          >
            <div>
              <Input
                placeholder="请输入备注"
                value={remark}
                onChange={(event) => {
                  set_remark(event.target.value);
                }}
              />
            </div>
          </Modal>
          <ScrollView {...response}>
            <div className="space-y-4">
              {dataSource.map((member) => {
                const { id, remark, disabled, links, recommended_tvs } = member;
                return (
                  <div key={id} className="card">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-2xl">{remark}</p>
                        {disabled ? "disabled" : "enabled"}
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button
                        variant="subtle"
                        onClick={async () => {
                          const r = await create_member_auth_link({
                            id,
                          });
                          if (r.error) {
                            alert(r.error);
                            return;
                          }
                          helper.refresh();
                        }}
                      >
                        生成授权链接
                      </Button>
                      {(() => {
                        if (links.length === 0) {
                          return null;
                        }
                        return (
                          <div className="space-y-4">
                            {links.map((link) => {
                              const { id, link: url, used } = link;
                              return (
                                <div key={id} className="flex items-center">
                                  {used ? null : (
                                    <div className="mr-4">
                                      <CopyAndCheckIcon
                                        on_click={() => {
                                          copy(url);
                                        }}
                                      />
                                    </div>
                                  )}
                                  <div
                                    className={cn(
                                      "w-full text-sm break-all whitespace-pre-wrap",
                                      used ? "line-through" : ""
                                    )}
                                  >
                                    {url}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="mt-4">
                      <Modal
                        title="选择推荐影片"
                        trigger={
                          <Button
                            variant="subtle"
                            onClick={() => {
                              set_cur_member(member);
                            }}
                          >
                            设置推荐影片
                          </Button>
                        }
                        on_ok={async () => {
                          if (selected_tv === null) {
                            return Result.Err("未选择影片");
                          }
                          if (cur_member === null) {
                            return Result.Err("未选择成员");
                          }
                          const r = await add_recommended_tv({
                            tv_id: selected_tv.id,
                            member_id: cur_member.id,
                          });
                          if (r.error) {
                            return r;
                          }
                          helper.refresh();
                          return Result.Ok(null);
                        }}
                      >
                        <TVSelect on_change={set_selected_tv} />
                      </Modal>
                      {(() => {
                        if (links.length === 0) {
                          return null;
                        }
                        return (
                          <div className="mt-4 space-x-4">
                            {recommended_tvs.map((tv) => {
                              const { id, name, original_name, poster_path } =
                                tv;
                              return (
                                <div key={id}>
                                  <div className="flex">
                                    <LazyImage
                                      className="w-[60px] mr-2"
                                      src={poster_path}
                                      alt={name || original_name}
                                    />
                                    <div className="flex-1 text text-xl">
                                      {name}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollView>
        </div>
      </div>
    </>
  );
};

export default MemberManagePage;
