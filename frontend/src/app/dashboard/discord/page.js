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

  // Load Discord accounts and servers when the page loads
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

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );

  // If still loading accounts, show a loading spinner
  if (isLoadingAccounts) {
    return <LoadingSpinner />;
  }

  // Only render the main dashboard if we have accounts
  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Discord Dashboard</h1>
      </div>

      <div className="flex flex-col h-[calc(100vh-180px)] bg-white shadow rounded-lg overflow-hidden">
        {/* Top navigation - Dropdowns */}
        <div className="flex items-center space-x-4 p-4 border-b border-gray-200">
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
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoadingMessages ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-indigo-700"></div>
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

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {isLoadingMessages ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : messages.length > 0 ? (
            <ul className="space-y-4">
              {messages.map((message) => (
                <li key={message.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-start">
                    {message.author?.avatarUrl ? (
                      <img
                        src={message.author.avatarUrl}
                        alt={message.author.username}
                        className="h-10 w-10 rounded-full mr-3 flex-shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-indigo-300 flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-sm font-medium text-white">
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
                className="h-12 w-12 mb-2 text-gray-400"
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
              <p>No messages found in this channel</p>
            </div>
          ) : servers.length > 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mb-2 text-gray-400"
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
              <p>Select a channel to view messages</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mb-2 text-gray-400"
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
              <p>No servers found</p>
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
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
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
