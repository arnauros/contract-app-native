import { useState, useEffect } from "react";

// Set this to false to hide users
const SHOW_USERS = false;

// Mock list of users for demo purposes - would normally come from a backend
const AVATAR_PATHS = [
  "/images/users/Avatar 120x120.png",
  "/images/users/Avatar 120x120 (1).png",
  "/images/users/Avatar 120x120 (2).png",
  "/images/users/Avatar 120x120 (3).png",
  "/images/users/Avatar 120x120 (4).png",
  "/images/users/avatar-8.png",
  "/images/users/avatar-9.png",
];

export interface ActiveUser {
  id: string;
  avatar: string;
  name?: string;
  joinedAt: Date;
}

export default function useActiveUsers(contractId?: string) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  // Return empty array if users should be hidden
  if (!SHOW_USERS) {
    return { activeUsers: [] };
  }

  // Simulate fetching active users
  useEffect(() => {
    if (!contractId) return;

    console.log("Fetching active users for contract:", contractId);

    // Generate between 1-8 random users
    const userCount = Math.floor(Math.random() * 7) + 1;

    // For demo purposes, simulate a list of active users
    const mockUsers = Array.from({ length: userCount }).map((_, index) => {
      const id = `user-${Math.random().toString(36).substring(2, 9)}`;
      const avatarPath = AVATAR_PATHS[index % AVATAR_PATHS.length];

      return {
        id,
        avatar: avatarPath,
        name: `User ${index + 1}`,
        joinedAt: new Date(Date.now() - Math.random() * 3600000), // Random join time in the last hour
      };
    });

    setActiveUsers(mockUsers);

    // In a real app, you'd set up a listener here to track users joining/leaving
    const interval = setInterval(() => {
      // Simulate user activity changes occasionally
      if (Math.random() > 0.7) {
        const shouldAdd = Math.random() > 0.5 && activeUsers.length < 10;

        if (shouldAdd) {
          // Add a new user
          const newUser = {
            id: `user-${Math.random().toString(36).substring(2, 9)}`,
            avatar:
              AVATAR_PATHS[Math.floor(Math.random() * AVATAR_PATHS.length)],
            name: `User ${activeUsers.length + 1}`,
            joinedAt: new Date(),
          };

          setActiveUsers((prev) => [...prev, newUser]);
          console.log("New user joined:", newUser.name);
        } else if (activeUsers.length > 1) {
          // Remove a random user
          const indexToRemove = Math.floor(Math.random() * activeUsers.length);
          setActiveUsers((prev) => prev.filter((_, i) => i !== indexToRemove));
          console.log("User left the session");
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [contractId]);

  return { activeUsers };
}
