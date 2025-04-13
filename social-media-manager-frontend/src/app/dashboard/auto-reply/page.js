"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/api";
import toast from "react-hot-toast";

export default function AutoReplyPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoReplies, setAutoReplies] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    platform: "twitter",
    triggerType: "keyword",
    trigger: "",
    response: "",
    isActive: true,
  });

  // Sample auto-reply rules for demonstration
  const sampleAutoReplies = [
    {
      id: 1,
      platform: "twitter",
      triggerType: "keyword",
      trigger: "#support",
      response:
        "Thanks for reaching out! Our support team will contact you shortly. For immediate assistance, please DM us.",
      isActive: true,
    },
    {
      id: 2,
      platform: "discord",
      triggerType: "keyword",
      trigger: "help",
      response:
        "Hi there! Check out our help documentation at our website or type !commands for a list of available commands.",
      isActive: true,
    },
    {
      id: 3,
      platform: "telegram",
      triggerType: "direct_message",
      trigger: "*",
      response:
        "Thank you for your message! We'll get back to you within 24 hours.",
      isActive: false,
    },
  ];

  useEffect(() => {
    const currentUser = authService.getCurrentUser();

    // Check if user has access to auto-reply feature
    if (!currentUser || currentUser.accountType === "basic") {
      // Redirect basic users to dashboard
      toast.error(
        "Auto Reply is only available for Business and Premium accounts"
      );
      router.push("/dashboard");
      return;
    }

    setUser(currentUser);

    // In a real app, you would fetch auto-replies from your API
    // For now, we'll use sample data
    setAutoReplies(sampleAutoReplies);
    setIsLoading(false);
  }, [router]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // In a real app, you would call an API to save the auto-reply
    const newAutoReply = {
      ...formData,
      id: autoReplies.length + 1,
    };

    setAutoReplies([...autoReplies, newAutoReply]);
    setIsFormOpen(false);
    setFormData({
      platform: "twitter",
      triggerType: "keyword",
      trigger: "",
      response: "",
      isActive: true,
    });

    toast.success("Auto-reply rule created successfully");
  };

  const toggleAutoReplyStatus = (id) => {
    setAutoReplies(
      autoReplies.map((reply) =>
        reply.id === id ? { ...reply, isActive: !reply.isActive } : reply
      )
    );
    toast.success("Status updated");
  };

  const deleteAutoReply = (id) => {
    setAutoReplies(autoReplies.filter((reply) => reply.id !== id));
    toast.success("Auto-reply rule deleted");
  };

  const getPlatformBadgeClass = (platform) => {
    switch (platform) {
      case "twitter":
        return "bg-blue-100 text-blue-800";
      case "discord":
        return "bg-indigo-100 text-indigo-800";
      case "telegram":
        return "bg-sky-100 text-sky-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Don't render if user is basic (should redirect)
  if (!user || user.accountType === "basic") {
    return null;
  }

  return (
    <div>
      <div className="pb-5 border-b border-gray-200 mb-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auto Reply Rules</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.accountType === "premium"
              ? "Premium plan: Unlimited auto-reply rules"
              : "Business plan: Up to 10 auto-reply rules"}
          </p>
        </div>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          onClick={() => setIsFormOpen(true)}
          disabled={
            user?.accountType === "business" && autoReplies.length >= 10
          }
        >
          Create New Rule
        </button>
      </div>

      {/* Form for adding new auto-reply rule */}
      {isFormOpen && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Create Auto-Reply Rule
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label
                    htmlFor="platform"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Platform
                  </label>
                  <select
                    id="platform"
                    name="platform"
                    value={formData.platform}
                    onChange={handleInputChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="twitter">Twitter</option>
                    <option value="discord">Discord</option>
                    <option value="telegram">Telegram</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label
                    htmlFor="triggerType"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Trigger Type
                  </label>
                  <select
                    id="triggerType"
                    name="triggerType"
                    value={formData.triggerType}
                    onChange={handleInputChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="keyword">Keyword</option>
                    <option value="direct_message">Direct Message</option>
                    <option value="mention">Mention</option>
                  </select>
                </div>

                <div className="sm:col-span-6">
                  <label
                    htmlFor="trigger"
                    className="block text-sm font-medium text-gray-700"
                  >
                    {formData.triggerType === "keyword"
                      ? "Keyword or Hashtag"
                      : formData.triggerType === "direct_message"
                      ? "Any Direct Message (use * for all messages)"
                      : "Mention Pattern"}
                  </label>
                  <input
                    type="text"
                    name="trigger"
                    id="trigger"
                    value={formData.trigger}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder={
                      formData.triggerType === "keyword"
                        ? "#help or support"
                        : formData.triggerType === "direct_message"
                        ? "* for all messages"
                        : "@yourusername"
                    }
                  />
                </div>

                <div className="sm:col-span-6">
                  <label
                    htmlFor="response"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Auto-Response
                  </label>
                  <textarea
                    id="response"
                    name="response"
                    rows={4}
                    value={formData.response}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your automatic response message..."
                  />
                </div>

                <div className="sm:col-span-6">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="isActive"
                        name="isActive"
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label
                        htmlFor="isActive"
                        className="font-medium text-gray-700"
                      >
                        Activate this rule immediately
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6">
          {autoReplies.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No auto-reply rules
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new auto-reply rule.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="-ml-1 mr-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  New Auto-Reply Rule
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Platform
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Trigger
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Response
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {autoReplies.map((rule) => (
                    <tr key={rule.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPlatformBadgeClass(
                            rule.platform
                          )}`}
                        >
                          {rule.platform.charAt(0).toUpperCase() +
                            rule.platform.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">
                            {rule.triggerType.replace("_", " ")}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {rule.trigger}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-md truncate">
                          {rule.response}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            rule.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {rule.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className={`mr-4 ${
                            rule.isActive
                              ? "text-yellow-600 hover:text-yellow-900"
                              : "text-green-600 hover:text-green-900"
                          }`}
                          onClick={() => toggleAutoReplyStatus(rule.id)}
                        >
                          {rule.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => deleteAutoReply(rule.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {user?.accountType === "business" && (
        <div className="mt-4 text-sm text-gray-500 flex items-center">
          <svg
            className="h-5 w-5 text-gray-400 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          Business accounts can create up to 10 auto-reply rules. Upgrade to
          Premium for unlimited rules.
        </div>
      )}

      {/* Analytics Section - Premium Only */}
      {user?.accountType === "premium" && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Auto Reply Analytics
          </h2>
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Total Auto Replies
                  </h3>
                  <p className="text-3xl font-bold text-blue-600">247</p>
                  <p className="text-sm text-gray-500 mt-1">
                    +12% from last week
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Most Active Platform
                  </h3>
                  <p className="text-3xl font-bold text-blue-600">Twitter</p>
                  <p className="text-sm text-gray-500 mt-1">
                    64% of all replies
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Average Response Time
                  </h3>
                  <p className="text-3xl font-bold text-blue-600">1.2s</p>
                  <p className="text-sm text-gray-500 mt-1">
                    -0.3s from last week
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Top Performing Auto Replies
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Platform
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Trigger
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Responses
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Engagement
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            Twitter
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500">
                              keyword
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              #support
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">128</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-green-600 font-medium">
                            42% click-through
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                            Discord
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500">
                              keyword
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              help
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">96</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-green-600 font-medium">
                            38% click-through
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-sky-100 text-sky-800">
                            Telegram
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500">
                              direct message
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              *
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">23</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-green-600 font-medium">
                            31% click-through
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
