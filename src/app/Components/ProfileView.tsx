"use client";

interface ProfileViewProps {
  email: string;
  displayName: string;
}

export default function ProfileView({ email, displayName }: ProfileViewProps) {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

          <div className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1 p-2 bg-gray-50 rounded-md">{email}</div>
            </div>

            {/* Display Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Display Name
              </label>
              <div className="mt-1 p-2 bg-gray-50 rounded-md">
                {displayName || "No display name set"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
