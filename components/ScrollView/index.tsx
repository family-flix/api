/**
 * @file 加载更多容器
 */
import { useEffect, useRef } from "react";
import cx from "classnames";
import debounce from "lodash/debounce";
import { Response } from "@list-helper/core/typing";

interface IProps extends Omit<Response<unknown>, "page" | "pageSize"> {
  className?: string;
  children?: React.ReactNode;
  onLoadMore?: () => void;
}
const ScrollView: React.FC<IProps> = (props) => {
  const {
    className,
    dataSource,
    noMore = false,
    loading,
    error,
    children,
    onLoadMore,
  } = props;

  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const handler = debounce(async () => {
      if (
        document.documentElement.scrollTop +
          document.documentElement.clientHeight +
          600 >=
        document.body.clientHeight
      ) {
        if (onLoadMoreRef.current) {
          onLoadMoreRef.current();
        }
      }
    }, 400);
    handler();
    document.addEventListener("scroll", handler);
    return () => {
      document.removeEventListener("scroll", handler);
    };
  }, []);

  return (
    <div className={cx(className)}>
      {children}
      <div className="overflow-hidden">
        {(() => {
          if (error) {
            return (
              <div className="my-6 text-gray-300 text-center">
                {error.message}
              </div>
            );
          }
          if (dataSource && dataSource.length === 0 && noMore && !loading) {
            return (
              <div className="my-6 text-gray-300 text-center">结果为空</div>
            );
          }
          if (loading) {
            return (
              <div className="my-6 text-gray-300 text-center">加载中...</div>
            );
          }
          return (
            <div className="my-6 text-gray-300 text-center">没有更多了~</div>
          );
        })()}
      </div>
    </div>
  );
};

export default ScrollView;
