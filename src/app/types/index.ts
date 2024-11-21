export interface Comment {
  id: string;
  text: string;
  position: {
    x: number;
    y: number;
  };
  createdAt: string;
  reactions: Array<{
    emoji: string;
    users: string[];
  }>;
  replies: Array<{
    id: string;
    text: string;
    createdAt: string;
  }>;
  resolved: boolean;
}

export interface Page {
  id: string;
  title: string;
  content: string;
  comments: Comment[];
  // ... other existing fields
}
