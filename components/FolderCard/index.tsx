import LazyImage from "@/components/LazyImage";

const FolderCard = (
  props: {
    type: string;
    name: string;
    thumbnail?: string;
  } & React.HTMLProps<HTMLDivElement>
) => {
  const { type, name, thumbnail, ...rest } = props;
  return (
    <div className="flex flex-col items-center" {...rest}>
      <div className="flex items-center w-[100px] h-[100px]">
        <LazyImage
          className="max-w-full max-h-full object-contain"
          src={(() => {
            if (type === "folder") {
              return "https://img.alicdn.com/imgextra/i1/O1CN01rGJZac1Zn37NL70IT_!!6000000003238-2-tps-230-180.png";
            }
            if (thumbnail) {
              return thumbnail;
            }
            return "https://img.alicdn.com/imgextra/i2/O1CN01ROG7du1aV18hZukHC_!!6000000003334-2-tps-140-140.png";
          })()}
        />
      </div>
      <div
        title={name}
        className="mt-2 text-center break-all whitespace-pre-wrap truncate line-clamp-2"
      >
        {name}
      </div>
    </div>
  );
};

export default FolderCard;
