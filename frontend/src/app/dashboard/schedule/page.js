"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  scheduleService,
  twitterService,
  discordService,
  telegramService,
  authService,
} from "@/services/api";
import toast from "react-hot-toast";
import { format } from "date-fns";
import AITextGenerator from "@/components/AiTextGenerator";

// Format date for datetime-local input with timezone awareness
function formatDateTimeForInput(date) {
  // The datetime-local input needs a string in format: "YYYY-MM-DDTHH:MM"
  return new Date(date.getTime()).toISOString().slice(0, 16); // Format: "YYYY-MM-DDTHH:MM"
}

// Get tomorrow's date at current time in UTC+8
function getTomorrowDateTime() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateTimeForInput(tomorrow);
}

// Format date for display with UTC+8 time zone
function formatDate(dateString) {
  try {
    const date = new Date(dateString);

    // Format with the browser's locale
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
      timeZone: "Asia/Singapore", // Singapore uses UTC+8
    });
  } catch (error) {
    return dateString;
  }
}

export default function ScheduleComponent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [postToEdit, setPostToEdit] = useState(null);
  const [activeTab, setActiveTab] = useState("scheduled");

  // Platform accounts
  const [twitterAccounts, setTwitterAccounts] = useState([]);
  const [discordAccounts, setDiscordAccounts] = useState([]);
  const [telegramAccounts, setTelegramAccounts] = useState([]);

  // Discord server data
  const [discordServers, setDiscordServers] = useState([]);
  const [discordChannels, setDiscordChannels] = useState([]);
  const [selectedServer, setSelectedServer] = useState("");

  // New post form state
  const [newPost, setNewPost] = useState({
    platform: "twitter",
    platformAccountId: "",
    targetId: "", // For Discord channel ID or Telegram chat ID
    content: "",
    scheduledTime: getTomorrowDateTime(),
  });

  // Check if user is logged in and load scheduled posts
  useEffect(() => {
    if (!authService.isLoggedIn()) {
      router.push("/login");
      return;
    }

    loadScheduledPosts();
    loadAccounts();
  }, [router, activeTab]);

  // Load scheduled posts based on active tab
  const loadScheduledPosts = async () => {
    try {
      setIsLoading(true);
      const data = await scheduleService.getScheduledPosts(activeTab);
      setScheduledPosts(data);
    } catch (error) {
      toast.error("Failed to load scheduled posts");
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load accounts from all platforms
  const loadAccounts = async () => {
    try {
      const [twitter, discord, telegram] = await Promise.all([
        twitterService.getAccounts(),
        discordService.getAccounts(),
        telegramService.getAccounts(),
      ]);

      setTwitterAccounts(twitter);
      setDiscordAccounts(discord);
      setTelegramAccounts(telegram);

      // Set default account if available
      if (twitter.length > 0) {
        setNewPost((prev) => ({ ...prev, platformAccountId: twitter[0].id }));
      } else if (discord.length > 0) {
        setNewPost((prev) => ({
          ...prev,
          platform: "discord",
          platformAccountId: discord[0].id,
        }));

        // Load Discord servers
        loadDiscordServers();
      } else if (telegram.length > 0) {
        setNewPost((prev) => ({
          ...prev,
          platform: "telegram",
          platformAccountId: telegram[0].id,
        }));
      }
    } catch (error) {
      console.log("Failed to load accounts", error);
    }
  };

  // Load Discord servers
  const loadDiscordServers = async () => {
    try {
      const servers = await discordService.getServers();
      setDiscordServers(servers);

      if (servers.length > 0) {
        setSelectedServer(servers[0].id);
        loadDiscordChannels(servers[0].id);
      }
    } catch (error) {
      console.log("Failed to load Discord servers", error);
    }
  };

  // Load Discord channels for selected server
  const loadDiscordChannels = async (serverId) => {
    try {
      const channels = await discordService.getChannels(serverId);
      setDiscordChannels(channels);

      if (channels.length > 0) {
        setNewPost((prev) => ({ ...prev, targetId: channels[0].id }));
      }
    } catch (error) {
      console.log("Failed to load Discord channels", error);
    }
  };

  // Handle server selection change
  const handleServerChange = (serverId) => {
    setSelectedServer(serverId);
    loadDiscordChannels(serverId);
  };

  // Handle platform selection change
  const handlePlatformChange = (platform) => {
    setNewPost((prev) => ({
      ...prev,
      platform: platform,
      platformAccountId: "", // Reset account
      targetId: "", // Reset target
    }));

    // Set default account for the selected platform
    if (platform === "twitter" && twitterAccounts.length > 0) {
      setNewPost((prev) => ({
        ...prev,
        platformAccountId: twitterAccounts[0].id,
      }));
    } else if (platform === "discord" && discordAccounts.length > 0) {
      setNewPost((prev) => ({
        ...prev,
        platformAccountId: discordAccounts[0].id,
      }));
      loadDiscordServers();
    } else if (platform === "telegram" && telegramAccounts.length > 0) {
      setNewPost((prev) => ({
        ...prev,
        platformAccountId: telegramAccounts[0].id,
      }));
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPost((prev) => ({ ...prev, [name]: value }));
  };

  // Create new scheduled post
  const handleCreatePost = async (e) => {
    e.preventDefault();

    try {
      // Validate required fields
      if (!newPost.platformAccountId) {
        toast.error("Please select an account");
        return;
      }

      if (
        (newPost.platform === "discord" || newPost.platform === "telegram") &&
        !newPost.targetId
      ) {
        toast.error(
          newPost.platform === "discord"
            ? "Please select a channel"
            : "Please enter a chat ID"
        );
        return;
      }

      if (!newPost.content) {
        toast.error("Please enter content for your post");
        return;
      }

      const scheduledTime = new Date(newPost.scheduledTime);
      if (isNaN(scheduledTime) || scheduledTime <= new Date()) {
        toast.error("Please select a future date and time");
        return;
      }

      await scheduleService.createScheduledPost(newPost);
      toast.success("Post scheduled successfully!");
      setShowCreateModal(false);
      loadScheduledPosts();

      // Reset form
      setNewPost({
        platform: "twitter",
        platformAccountId:
          twitterAccounts.length > 0 ? twitterAccounts[0].id : "",
        targetId: "",
        content: "",
        scheduledTime: getTomorrowDateTime(),
      });
    } catch (error) {
      toast.error("Failed to schedule post");
      console.log(error);
    }
  };

  // Update a scheduled post
  const handleUpdatePost = async (e) => {
    e.preventDefault();

    try {
      if (!postToEdit) return;

      if (!postToEdit.content) {
        toast.error("Content cannot be empty");
        return;
      }

      const scheduledTime = new Date(postToEdit.scheduledTime);
      if (isNaN(scheduledTime) || scheduledTime <= new Date()) {
        toast.error("Please select a future date and time");
        return;
      }

      await scheduleService.updateScheduledPost(postToEdit.id, {
        content: postToEdit.content,
        scheduledTime: scheduledTime,
      });

      toast.success("Post updated successfully!");
      setShowEditModal(false);
      loadScheduledPosts();
    } catch (error) {
      toast.error("Failed to update post");
      console.log(error);
    }
  };

  // Delete a scheduled post
  const handleDeletePost = async (id) => {
    if (!confirm("Are you sure you want to delete this scheduled post?")) {
      return;
    }

    try {
      await scheduleService.deleteScheduledPost(id);
      toast.success("Post deleted successfully!");
      loadScheduledPosts();
    } catch (error) {
      toast.error("Failed to delete post");
      console.log(error);
    }
  };

  // Open edit modal
  const openEditModal = (post) => {
    setPostToEdit({
      ...post,
      scheduledTime: formatDateTimeForInput(new Date(post.scheduledTime)),
    });
    setShowEditModal(true);
  };

  // Handle edit form input changes
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setPostToEdit((prev) => ({ ...prev, [name]: value }));
  };

  // Get account name by id and platform
  const getAccountName = (platformId, platform) => {
    if (platform === "twitter") {
      const account = twitterAccounts.find((a) => a.id === platformId);
      return account ? `@${account.username}` : "Unknown";
    } else if (platform === "discord") {
      const account = discordAccounts.find((a) => a.id === platformId);
      return account ? account.username : "Unknown";
    } else if (platform === "telegram") {
      const account = telegramAccounts.find((a) => a.id === platformId);
      return account ? `@${account.username}` : "Unknown";
    }
    return "Unknown";
  };

  // Get icon class for platform
  const getPlatformIcon = (platform) => {
    switch (platform) {
      case "twitter":
        return "fab fa-twitter text-blue-400";
      case "discord":
        return "fab fa-discord text-purple-500"; // Changed to match dashboard
      case "telegram":
        return "fab fa-telegram text-blue-500";
      default:
        return "fas fa-globe text-teal-500"; // Changed to match dashboard
    }
  };

  // Get color class for status
  const getStatusColor = (status) => {
    switch (status) {
      case "scheduled":
        return "bg-amber-100 text-amber-800 border border-amber-300"; // Enhanced with border
      case "completed":
        return "bg-emerald-100 text-emerald-800 border border-emerald-300"; // Changed to emerald with border
      case "failed":
        return "bg-rose-100 text-rose-800 border border-rose-300"; // Changed to rose with border
      default:
        return "bg-slate-100 text-slate-800 border border-slate-300"; // Changed to slate with border
    }
  };

  // Get background gradient by tab
  const getTabGradient = (tab) => {
    switch (tab) {
      case "scheduled":
        return "from-blue-600 to-indigo-600";
      case "completed":
        return "from-emerald-500 to-green-600";
      case "failed":
        return "from-rose-500 to-pink-600";
      default:
        return "from-blue-600 to-indigo-600";
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Page Header with Gradient Background */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-xl p-6 mb-8 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Scheduled Posts</h1>
            <p className="text-indigo-100">
              Manage your content across platforms
            </p>
          </div>
          <button
            className="px-6 py-3 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all duration-200 shadow-md font-medium flex items-center"
            onClick={() => setShowCreateModal(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Schedule New Post
          </button>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-0.5">
          <nav className="flex">
            <button
              className={`py-4 px-6 font-medium ${
                activeTab === "scheduled"
                  ? "bg-white text-blue-600"
                  : "text-white hover:bg-white/10"
              } transition-all duration-200`}
              onClick={() => setActiveTab("scheduled")}
            >
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Scheduled
              </div>
            </button>
            <button
              className={`py-4 px-6 font-medium ${
                activeTab === "completed"
                  ? "bg-white text-emerald-600"
                  : "text-white hover:bg-white/10"
              } transition-all duration-200`}
              onClick={() => setActiveTab("completed")}
            >
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Completed
              </div>
            </button>
            <button
              className={`py-4 px-6 font-medium ${
                activeTab === "failed"
                  ? "bg-white text-rose-600"
                  : "text-white hover:bg-white/10"
              } transition-all duration-200`}
              onClick={() => setActiveTab("failed")}
            >
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Failed
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Post list */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
        <div
          className={`bg-gradient-to-r ${getTabGradient(activeTab)} px-6 py-4`}
        >
          <h2 className="text-white text-xl font-bold flex items-center">
            {activeTab === "scheduled" && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            )}
            {activeTab === "completed" && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            {activeTab === "failed" && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Posts
          </h2>
          <p
            className={`${
              activeTab === "scheduled"
                ? "text-blue-100"
                : activeTab === "completed"
                ? "text-green-100"
                : "text-rose-100"
            } text-sm mt-1`}
          >
            {activeTab === "scheduled"
              ? "Posts waiting to be published"
              : activeTab === "completed"
              ? "Successfully published posts"
              : "Posts that failed to publish"}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : scheduledPosts.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <div className="flex flex-col items-center">
              {activeTab === "scheduled" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mb-4 text-blue-300 opacity-80"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              )}
              {activeTab === "completed" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mb-4 text-green-300 opacity-80"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              )}
              {activeTab === "failed" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mb-4 text-rose-300 opacity-80"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              <p className="text-lg">No {activeTab} posts found</p>
              {activeTab === "scheduled" && (
                <button
                  className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 shadow-md font-medium flex items-center"
                  onClick={() => setShowCreateModal(true)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Schedule your first post
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {scheduledPosts.map((post) => (
              <div
                key={post.id}
                className={`p-4 ${
                  post.status === "scheduled"
                    ? "hover:bg-blue-50"
                    : post.status === "completed"
                    ? "hover:bg-green-50"
                    : "hover:bg-rose-50"
                } transition-colors duration-150`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div
                      className={`${
                        post.status === "scheduled"
                          ? "bg-blue-100"
                          : post.status === "completed"
                          ? "bg-emerald-100"
                          : "bg-rose-100"
                      } p-3 rounded-full mr-3`}
                    >
                      <i
                        className={`${getPlatformIcon(post.platform)} text-xl`}
                      ></i>
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">
                        {getAccountName(post.platformAccountId, post.platform)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {post.platform === "discord" && "Channel: "}
                        {post.platform === "telegram" && "Chat ID: "}
                        {post.targetId}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs flex items-center ${getStatusColor(
                      post.status
                    )}`}
                  >
                    {post.status === "scheduled" && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    {post.status === "completed" && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                    {post.status === "failed" && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                  </span>
                </div>

                <div
                  className={`mt-3 text-gray-700 whitespace-pre-wrap p-4 rounded-lg border ${
                    post.status === "scheduled"
                      ? "bg-blue-50 border-blue-100"
                      : post.status === "completed"
                      ? "bg-emerald-50 border-emerald-100"
                      : "bg-rose-50 border-rose-100"
                  }`}
                >
                  {post.content}
                </div>

                <div className="mt-3 text-sm text-gray-500">
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Scheduled for: {formatDate(post.scheduledTime)}
                  </div>
                  {post.postedTime && (
                    <div className="flex items-center mt-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Posted at: {formatDate(post.postedTime)}
                    </div>
                  )}
                  {post.errorMessage && (
                    <div className="flex items-center mt-1 text-rose-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Error: {post.errorMessage}
                    </div>
                  )}
                </div>

                {post.status === "scheduled" && (
                  <div className="mt-3 flex justify-end space-x-2">
                    <button
                      className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium flex items-center transition-all duration-150"
                      onClick={() => openEditModal(post)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edit
                    </button>
                    <button
                      className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-medium flex items-center transition-all duration-150"
                      onClick={() => handleDeletePost(post.id)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 overflow-hidden shadow-xl">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Schedule New Post
              </h3>
              <p className="text-blue-100 text-sm">
                Create and schedule your content
              </p>
            </div>

            <form onSubmit={handleCreatePost}>
              <div className="p-6 space-y-4">
                {/* Platform Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Platform
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      className={`flex-1 py-2 px-4 rounded-lg border flex justify-center items-center ${
                        newPost.platform === "twitter"
                          ? "bg-blue-50 border-blue-300 text-blue-600"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                      onClick={() => handlePlatformChange("twitter")}
                    >
                      <i className="fab fa-twitter mr-2"></i>
                      Twitter
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2 px-4 rounded-lg border flex justify-center items-center ${
                        newPost.platform === "discord"
                          ? "bg-indigo-50 border-indigo-300 text-indigo-600"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                      onClick={() => handlePlatformChange("discord")}
                    >
                      <i className="fab fa-discord mr-2"></i>
                      Discord
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2 px-4 rounded-lg border flex justify-center items-center ${
                        newPost.platform === "telegram"
                          ? "bg-blue-50 border-blue-300 text-blue-600"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                      onClick={() => handlePlatformChange("telegram")}
                    >
                      <i className="fab fa-telegram mr-2"></i>
                      Telegram
                    </button>
                  </div>
                </div>

                {/* Account Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account
                  </label>
                  <select
                    name="platformAccountId"
                    value={newPost.platformAccountId}
                    onChange={handleInputChange}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select an account</option>
                    {newPost.platform === "twitter" &&
                      twitterAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          @{account.username}
                        </option>
                      ))}
                    {newPost.platform === "discord" &&
                      discordAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.username}
                        </option>
                      ))}
                    {newPost.platform === "telegram" &&
                      telegramAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          @{account.username}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Discord-specific fields */}
                {newPost.platform === "discord" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Server
                      </label>
                      <select
                        value={selectedServer}
                        onChange={(e) => handleServerChange(e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a server</option>
                        {discordServers.map((server) => (
                          <option key={server.id} value={server.id}>
                            {server.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Channel
                      </label>
                      <select
                        name="targetId"
                        value={newPost.targetId}
                        onChange={handleInputChange}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a channel</option>
                        {discordChannels.map((channel) => (
                          <option key={channel.id} value={channel.id}>
                            #{channel.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Telegram-specific fields */}
                {newPost.platform === "telegram" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chat ID
                      <span className="text-xs text-gray-400 ml-1">
                        (User or group chat ID)
                      </span>
                    </label>
                    <input
                      type="text"
                      name="targetId"
                      value={newPost.targetId}
                      onChange={handleInputChange}
                      placeholder="e.g. 123456789"
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content
                  </label>
                  <textarea
                    name="content"
                    value={newPost.content}
                    onChange={handleInputChange}
                    rows="4"
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`What do you want to post on ${newPost.platform}?`}
                    maxLength={newPost.platform === "twitter" ? 280 : 2000}
                  ></textarea>
                  <div className="mt-1">
                    <AITextGenerator
                      onTextGenerated={(text) =>
                        setNewPost((prev) => ({ ...prev, content: text }))
                      }
                      platform={newPost.platform}
                    />
                  </div>
                  {newPost.platform === "twitter" && (
                    <div className="text-xs text-right mt-1 text-gray-500">
                      {newPost.content.length}/280 characters
                    </div>
                  )}
                </div>

                {/* Schedule Date/Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    When to post
                  </label>
                  <input
                    type="datetime-local"
                    name="scheduledTime"
                    value={newPost.scheduledTime}
                    onChange={handleInputChange}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white shadow-sm hover:bg-gray-50 font-medium transition-all duration-150"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-sm hover:from-blue-700 hover:to-indigo-700 font-medium transition-all duration-150"
                >
                  Schedule Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditModal && postToEdit && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 overflow-hidden shadow-xl">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit Scheduled Post
              </h3>
              <p className="text-amber-100 text-sm">
                Update your scheduled content
              </p>
            </div>

            <form onSubmit={handleUpdatePost}>
              <div className="p-6 space-y-4">
                {/* Platform & Account Info (non-editable) */}
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <div className="flex items-center">
                    <div className="bg-amber-100 p-2 rounded-full mr-3">
                      <i
                        className={`${getPlatformIcon(
                          postToEdit.platform
                        )} text-xl`}
                      ></i>
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">
                        {getAccountName(
                          postToEdit.platformAccountId,
                          postToEdit.platform
                        )}
                      </div>
                      {postToEdit.targetId && (
                        <div className="text-sm text-gray-500">
                          {postToEdit.platform === "discord" && "Channel: "}
                          {postToEdit.platform === "telegram" && "Chat ID: "}
                          {postToEdit.targetId}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content
                  </label>
                  <textarea
                    name="content"
                    value={postToEdit.content}
                    onChange={handleEditInputChange}
                    rows="4"
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500"
                    maxLength={postToEdit.platform === "twitter" ? 280 : 2000}
                  ></textarea>
                  {postToEdit.platform === "twitter" && (
                    <div className="text-xs text-right mt-1 text-gray-500">
                      {postToEdit.content.length}/280 characters
                    </div>
                  )}
                </div>

                {/* Schedule Date/Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    When to post
                  </label>
                  <input
                    type="datetime-local"
                    name="scheduledTime"
                    value={postToEdit.scheduledTime}
                    onChange={handleEditInputChange}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white shadow-sm hover:bg-gray-50 font-medium transition-all duration-150"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg shadow-sm hover:from-amber-600 hover:to-orange-700 font-medium transition-all duration-150"
                >
                  Update Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
