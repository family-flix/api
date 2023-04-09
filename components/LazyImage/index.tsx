import { useEffect, useRef, useState } from "react";

interface IProps {
  className?: string;
  src?: string;
  alt?: string;
}
const LazyImage: React.FC<IProps> = (props) => {
  const { className, src, alt } = props;

  const ref = useRef<HTMLImageElement>(null);
  const has_visible_ref = useRef(false);
  const [visible, set_visible] = useState(false);

  useEffect(() => {
    const $img = ref.current;
    if ($img === null) {
      return;
    }
    if (!src) {
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            $img.src = src;
            $img.classList.add("visible");
            if (has_visible_ref.current === false) {
              set_visible(true);
            }
            has_visible_ref.current = true;
            io.unobserve($img);
          }
        });
      },
      { threshold: 0.01 }
    );
    io.observe($img);
  }, []);

  // console.log("[COMPONENT]LazyImage - render", visible);

  return (
    <div ref={ref} className={className}>
      {(() => {
        if (visible) {
          return (
            <img
              src={src}
              alt={alt}
              onError={() => {
                set_visible(false);
              }}
            />
          );
        }
        return <div className="w-full h-full bg-gray-200 dark:bg-gray-800"></div>;
      })()}
    </div>
  );
};

export default LazyImage;
