function Skeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="px-8">
        {/* Logo placeholder */}
        <div className="pt-[88px]">
          <div className="h-16 w-16 bg-gray-200 rounded-lg mb-12 ml-[48px]" />
        </div>

        {/* Content placeholders - with max width matching EditorJS content */}
        <div className="space-y-4 ml-[48px] max-w-[832px]">
          {/* Title */}
          <div className="h-12 bg-gray-200 rounded-lg w-3/4" />

          {/* Content blocks */}
          <div className="h-8 bg-gray-200 rounded-lg w-1/3" />
          <div className="h-32 bg-gray-200 rounded-lg w-full" />
          <div className="h-8 bg-gray-200 rounded-lg w-1/4" />
          <div className="h-32 bg-gray-200 rounded-lg w-full" />
          <div className="h-8 bg-gray-200 rounded-lg w-1/4" />
          <div className="h-32 bg-gray-200 rounded-lg w-full" />
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
