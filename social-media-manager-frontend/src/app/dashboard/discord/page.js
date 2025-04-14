"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { discordService } from "@/services/api";
import toast from "react-hot-toast";

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

        // Load servers directly using the bot
        await loadServers();

        setIsLoadingAccounts(false);
      } catch (error) {
        console.error("Error loading Discord data:", error);
        toast.error("Failed to load Discord data");
        setIsLoadingAccounts(false);
      }
    }

    loadInitialData();
  }, []);

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
      console.error("Error loading Discord servers:", error);
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

  const needsToConnect = accounts.length === 0;

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Discord Dashboard</h1>
      </div>

      {needsToConnect ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-12 w-12 text-indigo-500"
              fill="currentColor"
              viewBox="0 0 71 55"
            >
              <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No Discord accounts connected
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Connect your Discord account to manage servers and messages.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard/discord/connect"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Connect Discord Account
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main content area: Servers, Channels, Messages */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-200">
              {/* Servers column */}
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Servers
                </h3>
                {isLoadingServers ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : servers.length > 0 ? (
                  <div className="space-y-2">
                    <label htmlFor="server-select" className="sr-only">
                      Select Server
                    </label>
                    <select
                      id="server-select"
                      value={selectedServer?.id || ""}
                      onChange={handleServerChange}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      {servers.map((server) => (
                        <option key={server.id} value={server.id}>
                          {server.name}
                        </option>
                      ))}
                    </select>
                    <div className="bg-gray-50 rounded-md p-3 mt-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        {selectedServer?.name}
                      </h4>
                      {selectedServer?.iconUrl && (
                        <img
                          src={selectedServer.iconUrl}
                          alt={selectedServer.name}
                          className="mt-2 h-16 w-16 rounded-full"
                        />
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        {selectedServer?.memberCount || 0} members
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No servers found that your bot has access to
                  </p>
                )}
              </div>

              {/* Channels column */}
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Channels
                </h3>
                {isLoadingChannels ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : channels.length > 0 ? (
                  <div className="space-y-2">
                    <label htmlFor="channel-select" className="sr-only">
                      Select Channel
                    </label>
                    <select
                      id="channel-select"
                      value={selectedChannel?.id || ""}
                      onChange={handleChannelChange}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      {channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          #{channel.name}
                        </option>
                      ))}
                    </select>
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        Channel List
                      </h4>
                      <ul className="mt-2 divide-y divide-gray-200 max-h-64 overflow-y-auto">
                        {channels.map((channel) => (
                          <li
                            key={channel.id}
                            className={`py-2 px-2 text-sm cursor-pointer hover:bg-gray-50 ${
                              selectedChannel?.id === channel.id
                                ? "bg-indigo-50"
                                : ""
                            }`}
                            onClick={() => {
                              setSelectedChannel(channel);
                              loadMessages(channel.id);
                            }}
                          >
                            <span className="font-medium text-gray-900">
                              #{channel.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : selectedServer ? (
                  <p className="text-gray-500 text-sm">
                    No text channels found in this server
                  </p>
                ) : (
                  <p className="text-gray-500 text-sm">
                    Select a server to view channels
                  </p>
                )}
              </div>

              {/* Messages column */}
              <div className="p-4 flex flex-col h-96">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Messages
                </h3>
                {isLoadingMessages ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto mb-4">
                      {messages.length > 0 ? (
                        <ul className="space-y-4">
                          {messages.map((message) => (
                            <li
                              key={message.id}
                              className="bg-gray-50 rounded-md p-3"
                            >
                              <div className="flex items-start">
                                {message.author?.avatarUrl ? (
                                  <img
                                    src={message.author.avatarUrl}
                                    alt={message.author.username}
                                    className="h-8 w-8 rounded-full mr-2"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-indigo-300 flex items-center justify-center mr-2">
                                    <span className="text-xs font-medium text-white">
                                      {message.author?.username
                                        ?.charAt(0)
                                        .toUpperCase() || "?"}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center">
                                    <span className="font-medium text-gray-900">
                                      {message.author?.username || "Unknown"}
                                    </span>
                                    <span className="ml-2 text-xs text-gray-500">
                                      {formatMessageDate(message.createdAt)}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm text-gray-700">
                                    {message.content}
                                  </p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : selectedChannel ? (
                        <p className="text-gray-500 text-sm">
                          No messages found in this channel
                        </p>
                      ) : (
                        <p className="text-gray-500 text-sm">
                          Select a channel to view messages
                        </p>
                      )}
                    </div>

                    {/* Send message form */}
                    {selectedChannel && (
                      <form onSubmit={handleSendMessage} className="mt-auto">
                        <div className="flex">
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={`Message #${selectedChannel.name}`}
                            className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            disabled={isSendingMessage}
                          />
                          <button
                            type="submit"
                            disabled={isSendingMessage || !newMessage.trim()}
                            className="ml-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            {isSendingMessage ? "Sending..." : "Send"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
