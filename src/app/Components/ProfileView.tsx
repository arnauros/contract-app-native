"use client";

interface ProfileViewProps {
  email: string;
  displayName: string;
  profileImageUrl?: string;
  profileBannerUrl?: string;
}

export default function ProfileView({
  email,
  displayName,
  profileImageUrl = "/placeholders/profile.png",
  profileBannerUrl = "/placeholders/banner.png",
}: ProfileViewProps) {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        {/* Profile Banner */}
        <div
          className="h-40 w-full bg-gradient-to-r from-blue-100 to-indigo-100"
          style={{
            backgroundImage: `url(${profileBannerUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        ></div>

        {/* Profile Content with Image */}
        <div className="px-4 py-5 sm:p-6 relative">
          {/* Profile Image (overlapping banner) */}
          <div className="absolute -top-16 left-6">
            <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-white shadow-md">
              <img
                src={profileImageUrl}
                alt={`${displayName}'s profile`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Profile Information */}
          <div className="pt-16 pb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {displayName || "User"}
            </h1>
            <p className="text-gray-600">{email}</p>
          </div>

          <div className="mt-6 space-y-6">
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
