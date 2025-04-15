import React from "react";
import Link from "next/link";

const ConnectedPlatforms = ({ accounts, onDisconnect }) => {
  // Configuration for platform cards
  const platformsConfig = {
    twitter: {
      name: "X",
      colors: {
        connected: "bg-gray-900 border-gray-700",
        disconnected: "bg-gray-50 border-gray-200",
        title: "text-white",
        username: "text-gray-300",
      },
      icon: (
        <div className="w-full h-full bg-white flex items-center justify-center">
          <svg
            className="w-6 h-6 text-black"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M13.3174 10.7749L19.1457 4H17.7646L12.7852 9.88256L8.80309 4H4L10.0614 12.8571L4 20H5.38119L10.5937 13.7474L14.7663 20H19.5693L13.3171 10.7749H13.3174ZM11.2224 12.9328L10.5212 11.9269L5.96764 5.29053H8.0305L11.6814 10.6491L12.3823 11.655L17.1381 18.7094H15.0752L11.2224 12.933V12.9328Z" />
          </svg>
        </div>
      ),
      buttons: {
        manage: {
          bg: "bg-gray-700 hover:bg-gray-600",
          text: "text-white",
        },
        connect: {
          bg: "bg-black hover:bg-gray-800",
          text: "text-white",
        },
      },
    },
    discord: {
      name: "Discord",
      colors: {
        connected: "bg-[#5865F2]/10 border-[#5865F2]/30",
        disconnected: "bg-gray-50 border-gray-200",
        title: "text-gray-900",
        username: "text-[#5865F2] font-medium",
      },
      icon: (
        <svg
          className="w-7 h-7 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.39-.444.96-.608 1.387a18.27 18.27 0 0 0-5.487 0C9.095 3.995 8.857 3.43 8.648 3.04a.077.077 0 0 0-.079-.037c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 6.033 3.049.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.21 13.21 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.245.198.372.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.97 19.97 0 0 0 6.034-3.048.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.278c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      ),
      buttons: {
        manage: {
          bg: "bg-[#5865F2] hover:bg-[#4752c4]",
          text: "text-white",
        },
        connect: {
          bg: "bg-[#5865F2] hover:bg-[#4752c4]",
          text: "text-white",
        },
      },
    },
    telegram: {
      name: "Telegram",
      colors: {
        connected: "bg-[#229ED9]/10 border-[#229ED9]/30",
        disconnected: "bg-gray-50 border-gray-200",
        title: "text-gray-900",
        username: "text-[#229ED9] font-medium",
      },
      icon: (
        <svg
          className="w-7 h-7 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
      buttons: {
        manage: {
          bg: "bg-[#229ED9] hover:bg-[#1c8bbd]",
          text: "text-white",
        },
        connect: {
          bg: "bg-[#229ED9] hover:bg-[#1c8bbd]",
          text: "text-white",
        },
      },
    },
  };

  // Platform card component
  const PlatformCard = ({ platform, account, config }) => {
    const isConnected = account && account.length > 0;

    return (
      <div
        className={`rounded-xl overflow-hidden transition-all duration-300 border ${
          isConnected ? config.colors.connected : config.colors.disconnected
        }`}
      >
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center space-x-4">
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-full ${
                platform === "discord"
                  ? "bg-[#5865F2]"
                  : platform === "telegram"
                  ? "bg-[#229ED9]"
                  : ""
              } flex items-center justify-center`}
            >
              {config.icon}
            </div>
            <div>
              <h3
                className={`font-bold text-lg ${
                  isConnected && platform === "twitter"
                    ? config.colors.title
                    : "text-gray-900"
                }`}
              >
                {config.name}
              </h3>
              {isConnected ? (
                <span className={`text-sm ${config.colors.username}`}>
                  {platform === "twitter" ? "@" : ""}
                  {account[0].username}
                </span>
              ) : (
                <span className="text-sm text-gray-500">Not connected</span>
              )}
            </div>
          </div>

          <div>
            {isConnected ? (
              <div className="flex space-x-3">
                <Link
                  href={`/dashboard/${platform}`}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg ${config.buttons.manage.text} ${config.buttons.manage.bg} transition-all duration-300 transform hover:-translate-y-1 shadow-md`}
                >
                  Manage
                </Link>
                <button
                  onClick={() => onDisconnect(platform, account[0].id)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-all duration-300 transform hover:-translate-y-1 shadow-md"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <Link
                href={`/dashboard/${platform}/connect`}
                className={`inline-flex items-center px-5 py-2 text-sm font-medium rounded-lg ${config.buttons.connect.text} ${config.buttons.connect.bg} transition-all duration-300 transform hover:-translate-y-1 shadow-md`}
              >
                Connect
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white overflow-hidden shadow-xl rounded-xl transition-all duration-300 backdrop-blur-sm">
      <div className="px-8 py-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-700"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Connected Platforms
        </h2>

        <div className="space-y-5">
          {/* X (Twitter) Card */}
          <PlatformCard
            platform="twitter"
            account={accounts.twitter}
            config={platformsConfig.twitter}
          />

          {/* Discord Card */}
          <PlatformCard
            platform="discord"
            account={accounts.discord}
            config={platformsConfig.discord}
          />

          {/* Telegram Card */}
          <PlatformCard
            platform="telegram"
            account={accounts.telegram}
            config={platformsConfig.telegram}
          />
        </div>
      </div>
    </div>
  );
};

export default ConnectedPlatforms;
