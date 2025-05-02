import React from "react";
import {
  ChatBubbleLeftEllipsisIcon,
  UserCircleIcon,
} from "@heroicons/react/20/solid";
import { formatDate } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

export interface CommentActivity {
  id: string;
  type: "comment";
  contractId: string;
  contractTitle?: string;
  person: {
    name: string;
    avatar?: string;
  };
  comment: string;
  date: Date;
}

export interface CommentFeedProps {
  activities: CommentActivity[];
  title?: string;
  loading?: boolean;
  maxItems?: number;
}

export default function CommentFeed({
  activities,
  title = "Recent Comments",
  loading = false,
  maxItems = 5,
}: CommentFeedProps) {
  // Limit activities to maxItems
  const displayActivities = activities.slice(0, maxItems);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">{title}</h2>
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex space-x-4">
              <div className="rounded-full bg-gray-200 h-10 w-10"></div>
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-1">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (displayActivities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">{title}</h2>
        <div className="text-center py-6">
          <ChatBubbleLeftEllipsisIcon className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No comments yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">{title}</h2>
      <div className="flow-root">
        <ul role="list" className="-mb-8">
          {displayActivities.map((activity, activityIdx) => (
            <li key={activity.id}>
              <div className="relative pb-8">
                {activityIdx !== displayActivities.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                  />
                ) : null}

                <div className="relative flex items-start space-x-3">
                  {/* Comment avatar */}
                  <div className="relative">
                    {activity.person.avatar ? (
                      <Image
                        src={activity.person.avatar}
                        alt={activity.person.name}
                        width={40}
                        height={40}
                        className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-400 ring-8 ring-white"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-400 ring-8 ring-white">
                        <UserCircleIcon className="h-8 w-8 text-white" />
                      </div>
                    )}

                    <span className="absolute -bottom-0.5 -right-1 rounded-tl bg-white px-0.5 py-px">
                      <ChatBubbleLeftEllipsisIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </span>
                  </div>

                  {/* Comment content */}
                  <div className="min-w-0 flex-1">
                    <div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">
                          {activity.person.name}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-gray-500">
                        Commented on{" "}
                        <Link
                          href={`/Contracts/${activity.contractId}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {activity.contractTitle ||
                            `Contract #${activity.contractId}`}
                        </Link>{" "}
                        • {formatDate(activity.date)}
                      </p>
                    </div>
                    <div className="mt-2 text-sm text-gray-700">
                      <p>
                        {activity.comment.length > 150
                          ? `${activity.comment.slice(0, 150)}...`
                          : activity.comment}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {activities.length > maxItems && (
          <div className="mt-4 text-center">
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              View all comments
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
