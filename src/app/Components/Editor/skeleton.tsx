function Skeleton() {
  return (
    <div className="max-w-4xl mx-auto px-8">
      {/* Logo placeholder */}
      <div className="pt-[88px]">
        <div className="h-16 w-16 bg-gray-200 rounded-lg mb-12 animate-pulse" />
      </div>

      {/* Title placeholder */}
      <div className="h-12 bg-gray-200 rounded w-2/3 mb-8 animate-pulse" />

      {/* Content placeholders */}
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
        <div className="h-24 bg-gray-200 rounded w-full animate-pulse" />
        <div className="h-8 bg-gray-200 rounded w-1/2 animate-pulse" />
        <div className="h-24 bg-gray-200 rounded w-full animate-pulse" />
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
        <div className="h-24 bg-gray-200 rounded w-full animate-pulse" />
      </div>
    </div>
  );
}

export default Skeleton;
