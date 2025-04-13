"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  twitterService,
  discordService,
  telegramService,
  authService,
} from "@/services/api";
import toast from "react-hot-toast";

export default function Profile() {
  const [accounts, setAccounts] = useState({
    twitter: [],
    discord: [],
    telegram: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpgradingPlan, setIsUpgradingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");

  const accountTypes = {
    basic: {
      title: "Basic",
      description: "For influencers and content creators",
      features: [
        "Connect up to 3 social accounts",
        "Basic scheduling",
        "Analytics dashboard",
      ],
      limit: 3,
    },
    business: {
      title: "Business",
      description: "For small business owners",
      features: [
        "Connect up to 10 social accounts",
        "Advanced scheduling",
        "Detailed analytics",
        "Content suggestions",
      ],
      limit: 10,
    },
    premium: {
      title: "Premium",
      description: "For social media managers",
      features: [
        "Unlimited social accounts",
        "Team collaboration",
        "Advanced analytics",
        "API access",
        "Priority support",
      ],
      limit: "Unlimited",
    },
  };

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
        setFormData({
          username: currentUser.username,
          email: currentUser.email,
        });
        // Set the initial selected plan to the user's current plan
        setSelectedPlan(currentUser.accountType || "basic");

        const [twitterAccounts, discordAccounts, telegramAccounts] =
          await Promise.all([
            twitterService.getAccounts(),
            discordService.getAccounts(),
            telegramService.getAccounts(),
          ]);

        setAccounts({
          twitter: twitterAccounts,
          discord: discordAccounts,
          telegram: telegramAccounts,
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load user data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const disconnectAccount = async (service, accountId) => {
    try {
      let success = false;

      switch (service) {
        case "twitter":
          await twitterService.deleteAccount(accountId);
          success = true;
          break;
        case "discord":
          await discordService.deleteAccount(accountId);
          success = true;
          break;
        case "telegram":
          await telegramService.deleteAccount(accountId);
          success = true;
          break;
      }

      if (success) {
        setAccounts((prev) => ({
          ...prev,
          [service]: [],
        }));
        toast.success(
          `${
            service.charAt(0).toUpperCase() + service.slice(1)
          } account disconnected`
        );
      }
    } catch (error) {
      toast.error("Failed to disconnect account");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveProfileChanges = async () => {
    try {
      const response = await authService.updateProfile(formData);
      setUser(response.user);
      localStorage.setItem("user", JSON.stringify(response.user));
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.error || "Failed to update profile");
    }
  };

  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    try {
      await authService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsChangingPassword(false);
      toast.success("Password changed successfully");
    } catch (error) {
      toast.error(error.error || "Failed to change password");
    }
  };

  const upgradePlan = async () => {
    try {
      const response = await authService.updateAccountType(selectedPlan);
      setUser(response.user);
      localStorage.setItem("user", JSON.stringify(response.user));
      setIsUpgradingPlan(false);
      toast.success(
        `Successfully upgraded to ${accountTypes[selectedPlan].title} plan`
      );
    } catch (error) {
      toast.error(error.error || "Failed to upgrade plan");
    }
  };

  const getTotalAccountsCount = () => {
    return (
      accounts.twitter.length +
      accounts.discord.length +
      accounts.telegram.length
    );
  };

  const getAccountLimit = () => {
    const currentType = user?.accountType || "basic";
    return accountTypes[currentType].limit;
  };

  return (
    <div>
      <div className="pb-5 border-b border-gray-200 mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Subscription Plan */}
          <div className="bg-white overflow-hidden shadow-xl rounded-xl transition-all duration-300">
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
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
                Subscription Plan
              </h2>

              {isUpgradingPlan ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 mb-4">
                    Choose a plan that fits your needs. You can upgrade anytime.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(accountTypes).map(([key, plan]) => (
                      <div
                        key={key}
                        className={`relative rounded-lg border ${
                          selectedPlan === key
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-300 bg-white hover:bg-gray-50"
                        } p-4 cursor-pointer transition-all duration-200`}
                        onClick={() => setSelectedPlan(key)}
                      >
                        <div className="flex flex-col h-full">
                          <div className="flex items-center mb-2">
                            <input
                              id={`plan-${key}`}
                              name="plan"
                              type="radio"
                              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              checked={selectedPlan === key}
                              onChange={() => setSelectedPlan(key)}
                            />
                            <label
                              htmlFor={`plan-${key}`}
                              className="ml-2 block text-lg font-medium text-gray-900"
                            >
                              {plan.title}
                            </label>
                          </div>
                          <p className="text-sm text-gray-500 mb-4">
                            {plan.description}
                          </p>
                          <div className="mt-auto">
                            <div className="text-sm font-medium text-gray-900 mb-2">
                              Features:
                            </div>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-start">
                                  <svg
                                    className="h-4 w-4 text-green-500 mr-2 mt-0.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="mt-4 text-center">
                            <span className="text-sm font-medium text-gray-500">
                              {key === "basic"
                                ? "Free"
                                : key === "business"
                                ? "$9.99/month"
                                : "$19.99/month"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setIsUpgradingPlan(false)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={upgradePlan}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300"
                      disabled={selectedPlan === user?.accountType}
                    >
                      {selectedPlan === user?.accountType
                        ? "Current Plan"
                        : "Upgrade Plan"}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2 md:mb-0">
                          {accountTypes[user?.accountType || "basic"].title}
                        </span>
                        <h3 className="text-lg font-medium text-gray-900">
                          {
                            accountTypes[user?.accountType || "basic"]
                              .description
                          }
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {getTotalAccountsCount()} of {getAccountLimit()}{" "}
                          accounts connected
                        </p>
                      </div>
                      <button
                        onClick={() => setIsUpgradingPlan(true)}
                        className="mt-3 md:mt-0 inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300 shadow-sm"
                      >
                        {user?.accountType === "premium"
                          ? "Manage Subscription"
                          : "Upgrade Plan"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      Your Plan Features:
                    </h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {accountTypes[user?.accountType || "basic"].features.map(
                        (feature, index) => (
                          <li key={index} className="flex items-start">
                            <svg
                              className="h-4 w-4 text-green-500 mr-2 mt-0.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            {feature}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Profile Details */}
          <div className="bg-white overflow-hidden shadow-xl rounded-xl transition-all duration-300">
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Profile Details
              </h2>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="username"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      id="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveProfileChanges}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">
                        Username
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {user?.username}
                      </dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">
                        Email
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {user?.email}
                      </dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">
                        Account Type
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {accountTypes[user?.accountType || "basic"].title}
                      </dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">
                        Connected Accounts
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {getTotalAccountsCount()} of {getAccountLimit()}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-6">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300 shadow-sm"
                    >
                      Edit Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-xl rounded-xl transition-all duration-300">
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
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Change Password
              </h2>

              {isChangingPassword ? (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="currentPassword"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Current Password
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="newPassword"
                      className="block text-sm font-medium text-gray-700"
                    >
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      id="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      id="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setIsChangingPassword(false)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={changePassword}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300"
                    >
                      Change Password
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-4">
                    You can change your password here. We recommend using a
                    strong, unique password.
                  </p>
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300 shadow-sm"
                  >
                    Change Password
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Connected Platforms */}
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
                <div
                  className={`rounded-xl overflow-hidden transition-all duration-300 border ${
                    accounts.twitter.length > 0
                      ? "bg-gray-900 border-gray-700"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center overflow-hidden">
                        {accounts.twitter.length > 0 ? (
                          <div className="w-full h-full bg-white flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-black"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M13.3174 10.7749L19.1457 4H17.7646L12.7852 9.88256L8.80309 4H4L10.0614 12.8571L4 20H5.38119L10.5937 13.7474L14.7663 20H19.5693L13.3171 10.7749H13.3174ZM11.2224 12.9328L10.5212 11.9269L5.96764 5.29053H8.0305L11.6814 10.6491L12.3823 11.655L17.1381 18.7094H15.0752L11.2224 12.933V12.9328Z" />
                            </svg>
                          </div>
                        ) : (
                          <svg
                            className="w-6 h-6 text-black"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M13.3174 10.7749L19.1457 4H17.7646L12.7852 9.88256L8.80309 4H4L10.0614 12.8571L4 20H5.38119L10.5937 13.7474L14.7663 20H19.5693L13.3171 10.7749H13.3174ZM11.2224 12.9328L10.5212 11.9269L5.96764 5.29053H8.0305L11.6814 10.6491L12.3823 11.655L17.1381 18.7094H15.0752L11.2224 12.933V12.9328Z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3
                          className={`font-bold text-lg ${
                            accounts.twitter.length > 0
                              ? "text-white"
                              : "text-gray-900"
                          }`}
                        >
                          X
                        </h3>
                        {accounts.twitter.length > 0 ? (
                          <span className="text-sm text-gray-300">
                            @{accounts.twitter[0].username}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">
                            Not connected
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {accounts.twitter.length > 0 ? (
                        <div className="flex space-x-3">
                          <Link
                            href="/dashboard/twitter"
                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-gray-700 hover:bg-gray-600 transition-all duration-300 transform hover:-translate-y-1 shadow-md"
                          >
                            Manage
                          </Link>
                          <button
                            onClick={() =>
                              disconnectAccount(
                                "twitter",
                                accounts.twitter[0].id
                              )
                            }
                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-all duration-300 transform hover:-translate-y-1 shadow-md"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <Link
                          href="/dashboard/twitter/connect"
                          className="inline-flex items-center px-5 py-2 text-sm font-medium rounded-lg text-white bg-black hover:bg-gray-800 transition-all duration-300 transform hover:-translate-y-1 shadow-md"
                        >
                          Connect
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Discord Card */}
                <div
                  className={`rounded-xl overflow-hidden transition-all duration-300 border ${
                    accounts.discord.length > 0
                      ? "bg-[#5865F2]/10 border-[#5865F2]/30"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#5865F2] flex items-center justify-center">
                        <svg
                          className="w-7 h-7 text-white"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.39-.444.96-.608 1.387a18.27 18.27 0 0 0-5.487 0C9.095 3.995 8.857 3.43 8.648 3.04a.077.077 0 0 0-.079-.037c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 6.033 3.049.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.21 13.21 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.245.198.372.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.97 19.97 0 0 0 6.034-3.048.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.278c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">
                          Discord
                        </h3>
                        {accounts.discord.length > 0 ? (
                          <span className="text-sm text-[#5865F2] font-medium">
                            {accounts.discord[0].username}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">
                            Not connected
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {accounts.discord.length > 0 ? (
                        <div className="flex space-x-3">
                          <Link
                            href="/dashboard/discord"
                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-[#5865F2] hover:bg-[#4752c4] transition-all duration-300 transform hover:-translate-y-1 shadow-md"
                          >
                            Manage
                          </Link>
                          <button
                            onClick={() =>
                              disconnectAccount(
                                "discord",
                                accounts.discord[0].id
                              )
                            }
                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-all duration-300 transform hover:-translate-y-1 shadow-md"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <Link
                          href="/dashboard/discord/connect"
                          className="inline-flex items-center px-5 py-2 text-sm font-medium rounded-lg text-white bg-[#5865F2] hover:bg-[#4752c4] transition-all duration-300 transform hover:-translate-y-1 shadow-md"
                        >
                          Connect
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Telegram Card */}
                <div
                  className={`rounded-xl overflow-hidden transition-all duration-300 border ${
                    accounts.telegram.length > 0
                      ? "bg-[#229ED9]/10 border-[#229ED9]/30"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#229ED9] flex items-center justify-center">
                        <svg
                          className="w-7 h-7 text-white"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">
                          Telegram
                        </h3>
                        {accounts.telegram.length > 0 ? (
                          <span className="text-sm text-[#229ED9] font-medium">
                            @{accounts.telegram[0].username}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">
                            Not connected
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {accounts.telegram.length > 0 ? (
                        <div className="flex space-x-3">
                          <Link
                            href="/dashboard/telegram"
                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-[#229ED9] hover:bg-[#1c8bbd] transition-all duration-300 transform hover:-translate-y-1 shadow-md"
                          >
                            Manage
                          </Link>
                          <button
                            onClick={() =>
                              disconnectAccount(
                                "telegram",
                                accounts.telegram[0].id
                              )
                            }
                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-all duration-300 transform hover:-translate-y-1 shadow-md"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <Link
                          href="/dashboard/telegram/connect"
                          className="inline-flex items-center px-5 py-2 text-sm font-medium rounded-lg text-white bg-[#229ED9] hover:bg-[#1c8bbd] transition-all duration-300 transform hover:-translate-y-1 shadow-md"
                        >
                          Connect
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
