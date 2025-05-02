import React from "react";
import Image from "next/image";

// Set this to false to hide users
const SHOW_USERS = false;

interface User {
  id: string;
  avatar: string;
  name?: string;
}

interface UsersDisplayProps {
  users: User[];
  maxDisplay?: number;
}

export default function UsersDisplay({
  users,
  maxDisplay = 8,
}: UsersDisplayProps) {
  // Hide users if flag is set to false
  if (!SHOW_USERS) {
    return (
      <div className="flex items-center">
        <span className="text-sm text-gray-500">
          {users.length} {users.length === 1 ? "user" : "users"} editing
        </span>
      </div>
    );
  }

  // Limit the number of displayed users
  const displayUsers = users.slice(0, maxDisplay);
  const additionalUsers =
    users.length - maxDisplay > 0 ? users.length - maxDisplay : 0;

  return (
    <div className="flex items-center space-x-1">
      <div className="flex -space-x-2 overflow-hidden">
        {displayUsers.map((user) => (
          <div
            key={user.id}
            className="relative inline-block rounded-full ring-2 ring-white"
            title={user.name || "Active user"}
          >
            <Image
              src={user.avatar}
              alt={user.name || "User avatar"}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
            />
          </div>
        ))}
      </div>

      {additionalUsers > 0 && (
        <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 text-xs font-medium text-gray-500">
          +{additionalUsers}
        </span>
      )}

      <span className="ml-1 text-sm text-gray-500">
        {users.length} {users.length === 1 ? "user" : "users"} editing
      </span>
    </div>
  );
}
