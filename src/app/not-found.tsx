import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="max-w-md">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-medium text-gray-700 mb-6">
          Page not found
        </h2>
        <p className="text-gray-500 mb-8">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-5 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
