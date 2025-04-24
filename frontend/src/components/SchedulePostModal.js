import React from "react";
import { format } from "date-fns";
import Link from "next/link";

const ScheduledPostModal = ({ post, onClose }) => {
  if (!post) return null;

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch (error) {
      return dateString;
    }
  };

  // Get platform icon
  const getPlatformIcon = (platform) => {
    switch (platform) {
      case "twitter":
        return "fab fa-twitter text-blue-400";
      case "discord":
        return "fab fa-discord text-indigo-500";
      case "telegram":
        return "fab fa-telegram text-blue-500";
      default:
        return "fas fa-globe text-gray-500";
    }
  };

  // Get status color class
  const getStatusColor = (status) => {
    switch (status) {
      case "scheduled":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-lg w-full mx-4 overflow-hidden shadow-xl transform transition-all">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <i className={`${getPlatformIcon(post.platform)} text-xl mr-2`}></i>
            {post.platform.charAt(0).toUpperCase() +
              post.platform.slice(1)}{" "}
            Post
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <span
              className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                post.status
              )}`}
            >
              {post.status}
            </span>
            <div className="text-sm text-gray-500">ID: {post.id}</div>
          </div>

          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-1">
              Content:
            </div>
            <div className="p-3 bg-gray-50 rounded-md text-gray-800 whitespace-pre-wrap">
              {post.content}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm font-medium text-gray-700">
                Scheduled for:
              </div>
              <div className="text-sm text-gray-900">
                {formatDate(post.scheduledTime)}
              </div>
            </div>

            {post.postedTime && (
              <div>
                <div className="text-sm font-medium text-gray-700">
                  Posted at:
                </div>
                <div className="text-sm text-gray-900">
                  {formatDate(post.postedTime)}
                </div>
              </div>
            )}
          </div>

          {post.targetId && (
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700">Target:</div>
              <div className="text-sm text-gray-900">
                {post.platform === "discord" ? "Channel ID: " : "Chat ID: "}
                {post.targetId}
              </div>
            </div>
          )}

          {post.errorMessage && (
            <div className="mb-4">
              <div className="text-sm font-medium text-red-600">Error:</div>
              <div className="text-sm text-red-600 p-2 bg-red-50 rounded-md">
                {post.errorMessage}
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Close
            </button>
            <Link
              href={`/dashboard/schedule?edit=${post.id}`}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              View Full Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduledPostModal;
