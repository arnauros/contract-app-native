import React from "react";

interface CommentMarkerProps {
  userName?: string;
  userAvatar?: string;
  count?: number;
  onClick?: () => void;
}

export function CommentMarker({
  userName,
  userAvatar,
  count = 0,
  onClick,
}: CommentMarkerProps) {
  return (
    <div
      className="relative cursor-pointer"
      onClick={onClick}
      data-comment-marker="true"
    >
      <div
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center transform transition-transform hover:scale-105"
        style={{
          background: "linear-gradient(135deg, #22c55e 0%, #15803d 100%)",
        }}
      >
        <div className="w-10 h-10 rounded-full overflow-hidden shadow-inner">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName || "User"}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background:
                  "radial-gradient(circle, #f9fafb 0%, #e5e7eb 35%, #d1d5db 100%)",
              }}
            >
              <div className="relative overflow-hidden w-full h-full">
                {/* Animated gradient overlay */}
                <div
                  className="absolute inset-0 opacity-70"
                  style={{
                    background:
                      "linear-gradient(45deg, #4f46e5, #9333ea, #db2777, #4f46e5)",
                    backgroundSize: "300% 300%",
                    animation: "gradient-animation 8s ease infinite",
                  }}
                />

                {/* Create keyframes for gradient animation */}
                <style jsx>{`
                  @keyframes gradient-animation {
                    0% {
                      background-position: 0% 50%;
                    }
                    50% {
                      background-position: 100% 50%;
                    }
                    100% {
                      background-position: 0% 50%;
                    }
                  }
                `}</style>

                {/* Simplified speech bubble icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white z-10"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22Z"
                      fill="white"
                    />
                    <path
                      d="M8 12H8.01"
                      stroke="#4338ca"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M12 12H12.01"
                      stroke="#4338ca"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M16 12H16.01"
                      stroke="#4338ca"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comment count badge */}
      {count > 1 && (
        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {count}
        </div>
      )}
    </div>
  );
}
