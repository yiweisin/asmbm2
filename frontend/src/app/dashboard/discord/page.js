"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { discordService } from "@/services/api";
import toast from "react-hot-toast";
import AITextGenerator from "@/components/AiTextGenerator";

export default function DiscordDashboard() {
  const [accounts, setAccounts] = useState([]);
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingServers, setIsLoadingServers] = useState(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadInitialData() {
      try {
        // Load accounts
        const accountsData = await discordService.getAccounts();
        setAccounts(accountsData);

        if (accountsData && accountsData.length > 0) {
          await loadServers();
        } else {
          // Redirect to the connect page if no accounts found
          router.push("/dashboard/discord/connect");
        }

        setIsLoadingAccounts(false);
      } catch (error) {
        console.error("Error loading Discord data:", error);
        toast.error("Failed to load Discord data");
        setIsLoadingAccounts(false);
        // Redirect to connect page on error as well
        router.push("/dashboard/discord/connect");
      }
    }

    loadInitialData();
  }, [router]);

  // Load servers using the bot
  const loadServers = async () => {
    setIsLoadingServers(true);
    setServers([]);
    setSelectedServer(null);
    setChannels([]);
    setSelectedChannel(null);
    setMessages([]);

    try {
      const data = await discordService.getServers();
      setServers(data);

      // Select the first server by default if available
      if (data.length > 0) {
        setSelectedServer(data[0]);
        loadChannels(data[0].id);
      }
    } catch (error) {
      console.log("Error loading Discord servers:", error);
      toast.error("Failed to load Discord servers");
    } finally {
      setIsLoadingServers(false);
    }
  };

  // Load channels for the selected server
  const loadChannels = async (serverId) => {
    setIsLoadingChannels(true);
    setChannels([]);
    setSelectedChannel(null);
    setMessages([]);

    try {
      const data = await discordService.getChannels(serverId);
      setChannels(data);

      // Select the first channel by default if available
      if (data.length > 0) {
        setSelectedChannel(data[0]);
        loadMessages(data[0].id);
      }
    } catch (error) {
      console.error("Error loading Discord channels:", error);
      toast.error("Failed to load Discord channels");
    } finally {
      setIsLoadingChannels(false);
    }
  };

  // Load messages for the selected channel
  const loadMessages = async (channelId) => {
    setIsLoadingMessages(true);
    setMessages([]);

    try {
      const data = await discordService.getMessages(channelId);
      setMessages(data);
    } catch (error) {
      console.error("Error loading Discord messages:", error);
      toast.error("Failed to load Discord messages");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Handle server selection change
  const handleServerChange = (event) => {
    const serverId = event.target.value;
    const server = servers.find((s) => s.id === serverId);
    setSelectedServer(server);
    if (server) {
      loadChannels(server.id);
    }
  };

  // Handle channel selection change
  const handleChannelChange = (event) => {
    const channelId = event.target.value;
    const channel = channels.find((c) => c.id === channelId);
    setSelectedChannel(channel);
    if (channel) {
      loadMessages(channel.id);
    }
  };

  // Handle AI-generated text
  const handleAIGenerated = (text) => {
    setNewMessage(text);
  };

  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!selectedChannel || !newMessage.trim()) {
      toast.error("Please select a channel and enter a message");
      return;
    }

    setIsSendingMessage(true);
    try {
      await discordService.sendMessage(selectedChannel.id, newMessage);
      toast.success("Message sent successfully!");
      setNewMessage("");

      // Refresh messages
      loadMessages(selectedChannel.id);
    } catch (error) {
      console.error("Error sending Discord message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Format a message's created date
  const formatMessageDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Loading spinner for initial accounts loading
  if (isLoadingAccounts) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  // Updated UI with more consistent styling
  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Page Header with Gradient Background */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-500 rounded-xl p-6 mb-8 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Discord Dashboard</h1>
            <p className="text-indigo-100 mt-2">
              Manage and interact with your Discord servers and channels
            </p>
          </div>
          <button
            className="px-6 py-3 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all duration-200 shadow-md font-medium flex items-center"
            onClick={() => router.push("/dashboard")}
          >
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Dashboard
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
        {/* Top navigation - Dropdowns */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            {/* Server selection */}
            <div className="w-64">
              <label
                htmlFor="server-select"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Server
              </label>
              {isLoadingServers ? (
                <div className="flex items-center h-10">
                  <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-indigo-500"></div>
                  <span className="text-sm text-gray-500">
                    Loading servers...
                  </span>
                </div>
              ) : (
                <select
                  id="server-select"
                  value={selectedServer?.id || ""}
                  onChange={handleServerChange}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="" disabled>
                    Select a server
                  </option>
                  {servers.map((server) => (
                    <option key={server.id} value={server.id}>
                      {server.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Channel selection */}
            <div className="w-64">
              <label
                htmlFor="channel-select"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Channel
              </label>
              {isLoadingChannels ? (
                <div className="flex items-center h-10">
                  <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-indigo-500"></div>
                  <span className="text-sm text-gray-500">
                    Loading channels...
                  </span>
                </div>
              ) : (
                <select
                  id="channel-select"
                  value={selectedChannel?.id || ""}
                  onChange={handleChannelChange}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  disabled={!selectedServer || channels.length === 0}
                >
                  <option value="" disabled>
                    Select a channel
                  </option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      #{channel.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Refresh button */}
            <div className="flex items-end">
              <button
                onClick={() =>
                  selectedChannel && loadMessages(selectedChannel.id)
                }
                disabled={!selectedChannel || isLoadingMessages}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-sm hover:from-blue-700 hover:to-indigo-700 font-medium transition-all duration-150"
              >
                {isLoadingMessages ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
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
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="h-[calc(100vh-400px)] overflow-y-auto p-6 bg-gray-50">
          {isLoadingMessages ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : messages.length > 0 ? (
            <ul className="space-y-4">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className="bg-white rounded-lg shadow-md p-4 border border-gray-100 hover:shadow-lg transition-all duration-150"
                >
                  <div className="flex items-start">
                    {message.author?.avatarUrl ? (
                      <img
                        src={message.author.avatarUrl}
                        alt={message.author.username}
                        className="h-10 w-10 rounded-full mr-3 flex-shrink-0 border-2 border-indigo-100"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3 flex-shrink-0 text-indigo-600">
                        <span className="text-sm font-medium">
                          {message.author?.username?.charAt(0).toUpperCase() ||
                            "?"}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-1">
                        <span className="font-medium text-gray-900 mr-2">
                          {message.author?.username || "Unknown"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatMessageDate(message.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 break-words">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : selectedChannel ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mb-4 text-indigo-300 opacity-80"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-lg">No messages found in this channel</p>
            </div>
          ) : servers.length > 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mb-4 text-indigo-300 opacity-80"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
              <p className="text-lg">Select a channel to view messages</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mb-4 text-indigo-300 opacity-80"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-lg">No servers found</p>
            </div>
          )}
        </div>

        {/* Message input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <form onSubmit={handleSendMessage} className="space-y-2">
            <div className="flex">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={
                  selectedChannel
                    ? `Message #${selectedChannel.name}`
                    : "Select a channel to send messages"
                }
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                disabled={!selectedChannel || isSendingMessage}
              />
              <button
                type="submit"
                disabled={
                  !selectedChannel || isSendingMessage || !newMessage.trim()
                }
                className="ml-3 inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-sm hover:from-blue-700 hover:to-indigo-700 font-medium transition-all duration-150"
              >
                {isSendingMessage ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  "Send"
                )}
              </button>
            </div>

            {/* AI Text Generator */}
            {selectedChannel && (
              <div className="flex justify-start">
                <AITextGenerator
                  onTextGenerated={handleAIGenerated}
                  platform="discord"
                />
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
