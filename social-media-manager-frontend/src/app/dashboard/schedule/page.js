"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

  // Get tomorrow's date at current time
  function getTomorrowDateTime() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateTimeForInput(tomorrow);
  }

  // Format date for datetime-local input
  function formatDateTimeForInput(date) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16); // Format: "YYYY-MM-DDTHH:MM"
  }

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
      console.error(error);
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
      console.error("Failed to load accounts", error);
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
      console.error("Failed to load Discord servers", error);
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
      console.error("Failed to load Discord channels", error);
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
      console.error(error);
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
      console.error(error);
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
      console.error(error);
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

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch (error) {
      return dateString;
    }
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
        return "fab fa-discord text-indigo-500";
      case "telegram":
        return "fab fa-telegram text-blue-500";
      default:
        return "fas fa-globe";
    }
  };

  // Get color class for status
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
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Scheduled Posts</h1>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => setShowCreateModal(true)}
        >
          Schedule New Post
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            className={`py-4 px-1 ${
              activeTab === "scheduled"
                ? "border-b-2 border-blue-500 font-medium text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("scheduled")}
          >
            Scheduled
          </button>
          <button
            className={`py-4 px-1 ${
              activeTab === "completed"
                ? "border-b-2 border-blue-500 font-medium text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("completed")}
          >
            Completed
          </button>
          <button
            className={`py-4 px-1 ${
              activeTab === "failed"
                ? "border-b-2 border-blue-500 font-medium text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("failed")}
          >
            Failed
          </button>
        </nav>
      </div>

      {/* Post list */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : scheduledPosts.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <p className="text-lg">No {activeTab} posts found</p>
          {activeTab === "scheduled" && (
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => setShowCreateModal(true)}
            >
              Schedule your first post
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {scheduledPosts.map((post) => (
            <div key={post.id} className="bg-white p-4 rounded shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <i
                    className={`${getPlatformIcon(post.platform)} text-xl mr-3`}
                  ></i>
                  <div>
                    <div className="font-medium">
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
                  className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                    post.status
                  )}`}
                >
                  {post.status}
                </span>
              </div>

              <div className="mt-3 text-gray-700 whitespace-pre-wrap">
                {post.content}
              </div>

              <div className="mt-3 text-sm text-gray-500">
                <div>Scheduled for: {formatDate(post.scheduledTime)}</div>
                {post.postedTime && (
                  <div>Posted at: {formatDate(post.postedTime)}</div>
                )}
                {post.errorMessage && (
                  <div className="text-red-500 mt-1">
                    Error: {post.errorMessage}
                  </div>
                )}
              </div>

              {post.status === "scheduled" && (
                <div className="mt-3 flex justify-end space-x-2">
                  <button
                    className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                    onClick={() => openEditModal(post)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                    onClick={() => handleDeletePost(post.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-medium">Schedule New Post</h3>
            </div>

            <form onSubmit={handleCreatePost}>
              <div className="p-4 space-y-4">
                {/* Platform Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Platform
                  </label>
                  <select
                    name="platform"
                    value={newPost.platform}
                    onChange={(e) => handlePlatformChange(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="twitter">Twitter</option>
                    <option value="discord">Discord</option>
                    <option value="telegram">Telegram</option>
                  </select>
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
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="What do you want to post?"
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
                      {newPost.content.length}/280
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
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="px-4 py-3 bg-gray-50 flex justify-end">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-md text-gray-700 bg-white mr-2"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
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
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-medium">Edit Scheduled Post</h3>
            </div>

            <form onSubmit={handleUpdatePost}>
              <div className="p-4 space-y-4">
                {/* Platform & Account Info (non-editable) */}
                <div className="flex items-center">
                  <i
                    className={`${getPlatformIcon(
                      postToEdit.platform
                    )} text-xl mr-3`}
                  ></i>
                  <div>
                    <div className="font-medium">
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
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    maxLength={postToEdit.platform === "twitter" ? 280 : 2000}
                  ></textarea>
                  <div className="mt-1">
                    <AITextGenerator
                      onTextGenerated={(text) =>
                        setNewPost((prev) => ({ ...prev, content: text }))
                      }
                      platform={newPost.platform}
                    />
                  </div>
                  {postToEdit.platform === "twitter" && (
                    <div className="text-xs text-right mt-1 text-gray-500">
                      {postToEdit.content.length}/280
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
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="px-4 py-3 bg-gray-50 flex justify-end">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-md text-gray-700 bg-white mr-2"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
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
