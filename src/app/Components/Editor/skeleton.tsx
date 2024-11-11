import { PhotoIcon } from "@heroicons/react/24/outline";

function Skeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="px-8">
        {/* Logo placeholder */}
        <div className="pt-[88px]">
          <div className="h-[8rem] w-[8rem] ml-[90] bg-gray-200 rounded-lg mb-12 animate-pulse relative"></div>
        </div>

        {/* Content placeholders - with max width matching EditorJS content */}
        <div className="space-y-4 ml-[93px] max-w-[832px]">
          {/* Title */}
          <div className="h-12 bg-gray-200 rounded-lg w-3/4 animate-pulse" />

          {/* Content blocks */}
          <div className="h-8 bg-gray-200 rounded-lg w-1/3 animate-pulse" />
          <div className="h-32 bg-gray-200 rounded-lg w-full animate-pulse" />
          <div className="h-8 bg-gray-200 rounded-lg w-1/4 animate-pulse" />
          <div className="h-32 bg-gray-200 rounded-lg w-full animate-pulse" />
          <div className="h-8 bg-gray-200 rounded-lg w-1/4 animate-pulse" />
          <div className="h-32 bg-gray-200 rounded-lg w-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
