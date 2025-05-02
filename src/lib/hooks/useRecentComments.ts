import { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { CommentActivity } from "@/app/Components/CommentFeed";
import { getAuth } from "firebase/auth";

// Set this to false to hide users
const SHOW_USERS = false;

// Avatar paths to randomly assign to comments
const AVATAR_PATHS = [
  "/images/users/Avatar 120x120.png",
  "/images/users/Avatar 120x120 (1).png",
  "/images/users/Avatar 120x120 (2).png",
  "/images/users/Avatar 120x120 (3).png",
  "/images/users/Avatar 120x120 (4).png",
  "/images/users/avatar-8.png",
  "/images/users/avatar-9.png",
];

interface Contract {
  id: string;
  title?: string;
  [key: string]: any;
}

export default function useRecentComments(maxComments = 10) {
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<CommentActivity[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Return empty data if users should be hidden
  useEffect(() => {
    if (!SHOW_USERS) {
      setLoading(false);
      setComments([]);
      return;
    }

    const fetchRecentComments = async () => {
      try {
        setLoading(true);
        setError(null);

        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
          setError("User must be authenticated to view recent comments");
          setLoading(false);
          return;
        }

        const db = getFirestore();
        const userId = currentUser.uid;

        // For now, in development, let's simulate data while the real implementation is built
        if (process.env.NODE_ENV === "development") {
          // Mock data for development
          console.log("Using mock comment data in development");

          // Mock contract titles
          const contractTitles = [
            "Website Redesign Contract",
            "Mobile App Development",
            "Logo Design Project",
            "Marketing Campaign",
            "Content Strategy",
          ];

          // Generate random comments
          const mockComments: CommentActivity[] = Array.from({ length: 8 }).map(
            (_, i) => {
              const contractId = Math.random().toString(36).substring(2, 10);
              return {
                id: `comment-${i}-${Math.random()
                  .toString(36)
                  .substring(2, 10)}`,
                type: "comment",
                contractId,
                contractTitle:
                  contractTitles[
                    Math.floor(Math.random() * contractTitles.length)
                  ],
                person: {
                  name: `Client ${i + 1}`,
                  avatar: AVATAR_PATHS[i % AVATAR_PATHS.length],
                },
                comment: [
                  "I really like the design, but could we change the color scheme to match our brand better?",
                  "This looks great! When do you think you can deliver the final version?",
                  "Can we discuss the timeline for this project? I think we need to speed things up.",
                  "The copy needs some work, I've attached my suggestions in the email.",
                  "Overall I'm happy with the direction, just a few minor tweaks needed.",
                ][Math.floor(Math.random() * 5)],
                date: new Date(
                  Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
                ), // Random date in the last week
              };
            }
          );

          // Sort by date (newest first)
          mockComments.sort((a, b) => b.date.getTime() - a.date.getTime());

          setComments(mockComments);
          setLoading(false);
          return;
        }

        // Real implementation for production
        // First get all contracts for this user
        const contractsRef = collection(db, "contracts");
        const contractsQuery = query(
          contractsRef,
          // where('userId', '==', userId), // Uncomment when ready to filter by user
          orderBy("createdAt", "desc")
        );

        const contractsSnapshot = await getDocs(contractsQuery);
        const contracts: Contract[] = contractsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // For each contract, get recent comments
        const allComments: CommentActivity[] = [];

        await Promise.all(
          contracts.map(async (contract) => {
            const commentsRef = collection(
              db,
              "contracts",
              contract.id,
              "comments"
            );
            const commentsQuery = query(
              commentsRef,
              orderBy("timestamp", "desc"),
              limit(5)
            );

            try {
              const commentsSnapshot = await getDocs(commentsQuery);

              commentsSnapshot.forEach((commentDoc) => {
                const commentData = commentDoc.data();

                // Only add if we have the necessary data
                if (commentData.comment && commentData.timestamp) {
                  allComments.push({
                    id: commentDoc.id,
                    type: "comment",
                    contractId: contract.id,
                    contractTitle: contract.title,
                    person: {
                      name: commentData.userName || "Anonymous",
                      avatar: commentData.userAvatar,
                    },
                    comment: commentData.comment,
                    date: commentData.timestamp.toDate(),
                  });
                }
              });
            } catch (err) {
              console.error(
                `Error fetching comments for contract ${contract.id}:`,
                err
              );
              // Continue with other contracts
            }
          })
        );

        // Sort all comments by date (newest first) and limit
        allComments.sort((a, b) => b.date.getTime() - a.date.getTime());
        setComments(allComments.slice(0, maxComments));
      } catch (err) {
        console.error("Error fetching recent comments:", err);
        setError("Failed to load recent comments");
      } finally {
        setLoading(false);
      }
    };

    fetchRecentComments();
  }, [maxComments]);

  return { comments, loading, error };
}
