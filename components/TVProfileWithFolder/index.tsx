/**
 * @file 遍历文件夹并索引后的结果
 */
import { TaskResultOfSharedTV } from "@/domains/shared_files/services";
import LazyImage from "@/components/LazyImage";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function SimpleTooltip(props: {
  content: React.ReactNode;
  children: React.ReactNode;
}) {
  const { content, children } = props;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface IProps {
  data_source: TaskResultOfSharedTV["list"] | null;
  extra?: (d: TaskResultOfSharedTV["list"][0]) => React.ReactNode;
}
const TVProfileWithFolder: React.FC<IProps> = (props) => {
  const { data_source, extra } = props;
  if (data_source === null) {
    return null;
  }
  return (
    <div className="space-y-8">
      {data_source.map((t) => {
        const {
          id,
          name,
          original_name,
          overview,
          poster_path,
          size_count,
          seasons,
        } = t;
        return (
          <div key={id} className="card flex">
            <LazyImage
              className="w-[240px] object-fit self-start mr-4"
              src={poster_path}
              alt={name || original_name}
            />
            <div>
              <div className="text-4xl">{name || original_name}</div>
              <div>{overview}</div>
              <div>{size_count}</div>
              <div className="space-y-4">
                {seasons.map((s, index) => {
                  const { season, folders } = s;
                  return (
                    <div key={index} className="mt-8">
                      <div className="text-2xl">{season}</div>
                      <div className="space-y-4">
                        {folders.map((f, i) => {
                          const { folder, resolution, episodes } = f;
                          return (
                            <div key={folder}>
                              {folders.length !== 0 ? (
                                <div className="">
                                  <SimpleTooltip
                                    content={<div className="">{folder}</div>}
                                  >
                                    <div>{resolution}</div>
                                  </SimpleTooltip>
                                </div>
                              ) : null}
                              <div key={i} className="grid grid-cols-12 gap-2">
                                {episodes.map((e) => {
                                  const { id: episode_id, episode } = e;
                                  return <div key={episode_id}>{episode}</div>;
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {extra && <div className="mt-4">{extra(t)}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TVProfileWithFolder;
