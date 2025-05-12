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

  // Simulate fetching active users
  useEffect(() => {
    // Return early if users should be hidden or no contractId
    if (!SHOW_USERS || !contractId) return;

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
        // Use a safer state update approach that doesn't depend on the current state
        setActiveUsers((prev) => {
          const shouldAdd = Math.random() > 0.5 && prev.length < 10;

          if (shouldAdd) {
            // Add a new user
            const newUser = {
              id: `user-${Math.random().toString(36).substring(2, 9)}`,
              avatar:
                AVATAR_PATHS[Math.floor(Math.random() * AVATAR_PATHS.length)],
              name: `User ${prev.length + 1}`,
              joinedAt: new Date(),
            };

            console.log("New user joined:", newUser.name);
            return [...prev, newUser];
          } else if (prev.length > 1) {
            // Remove a random user
            const indexToRemove = Math.floor(Math.random() * prev.length);
            console.log("User left the session");
            return prev.filter((_, i) => i !== indexToRemove);
          }

          return prev;
        });
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [contractId]); // Only re-run when contractId changes

  // Return the active users or empty array if users should be hidden
  return { activeUsers: SHOW_USERS ? activeUsers : [] };
}
