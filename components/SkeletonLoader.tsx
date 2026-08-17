export default function SkeletonLoader() {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
      <div className="h-3 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="flex gap-2 mb-3">
        <div className="h-3 bg-gray-200 rounded w-16"></div>
        <div className="h-3 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="flex gap-2">
        <div className="h-6 bg-gray-200 rounded w-20"></div>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  )
}
