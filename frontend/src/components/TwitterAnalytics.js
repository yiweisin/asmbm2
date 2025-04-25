"use client";

import { useState, useEffect } from "react";
import { Users, TrendingUp, TrendingDown, Eye, Heart } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const TwitterAnalytics = ({
  accountData,
  analyticsData,
  timeRange = "30d",
  onTimeRangeChange = () => {},
}) => {
  const [engagementTrend, setEngagementTrend] = useState([]);

  // Generate engagement trend data when analytics or timeRange changes
  useEffect(() => {
    generateEngagementTrend(timeRange);
  }, [timeRange]);

  // Generate engagement trend data
  const generateEngagementTrend = (range) => {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const data = [];
    const baseValue = {
      likes: Math.floor(Math.random() * 200) + 50,
      retweets: Math.floor(Math.random() * 100) + 20,
      replies: Math.floor(Math.random() * 80) + 10,
    };

    const today = new Date();

    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayVariation = Math.random() * 0.3 - 0.15; // -15% to +15%

      data.push({
        date: date.toISOString().split("T")[0],
        likes: Math.floor(baseValue.likes * (1 + dayVariation * (i / days))),
        retweets: Math.floor(
          baseValue.retweets * (1 + dayVariation * (i / days))
        ),
        replies: Math.floor(
          baseValue.replies * (1 + dayVariation * (i / days))
        ),
      });
    }

    setEngagementTrend(data);
  };

  // Handle time range change
  const handleTimeRangeChange = (range) => {
    onTimeRangeChange(range);
  };

  return (
    <div className="space-y-6">
      {/* Account Summary */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-blue-500 text-white rounded-full flex items-center justify-center">
              <span className="text-xl font-bold">
                {accountData?.username?.charAt(0).toUpperCase() || "T"}
              </span>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900">
                @{accountData?.username || "username"}
              </h2>
            </div>
          </div>

          <div className="flex space-x-8">
            <div className="flex flex-col items-center">
              <div className="text-xl font-semibold text-gray-900">
                {analyticsData?.summaryStats?.currentFollowers || 0}
              </div>
              <div className="text-sm text-gray-600">Followers</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-xl font-semibold text-gray-900">
                {accountData?.tweetsPosted || 0}
              </div>
              <div className="text-sm text-gray-600">Tweets</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-xl font-semibold text-gray-900">
                {Math.round(
                  (analyticsData?.summaryStats?.currentLikes /
                    Math.max(
                      analyticsData?.summaryStats?.currentViews || 1,
                      1
                    )) *
                    1000
                ) / 10}
                %
              </div>
              <div className="text-sm text-gray-600">Engagement Rate</div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Audience Growth */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Users className="h-6 w-6 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Audience Growth
                  </p>
                  <h3 className="text-xl font-bold text-gray-900">
                    {analyticsData?.summaryStats?.followerGrowthPercent || 0}%
                  </h3>
                </div>
              </div>
              <div
                className={`flex items-center px-2 py-1 rounded-full text-sm ${
                  (analyticsData?.summaryStats?.followerGrowth || 0) >= 0
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {(analyticsData?.summaryStats?.followerGrowth || 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                <span>
                  {(analyticsData?.summaryStats?.followerGrowth || 0) >= 0
                    ? "+"
                    : ""}
                  {analyticsData?.summaryStats?.followerGrowth || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Engagement Rate */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Heart className="h-6 w-6 text-pink-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Engagement Rate
                  </p>
                  <h3 className="text-xl font-bold text-gray-900">
                    {Math.round(
                      (analyticsData?.summaryStats?.currentLikes /
                        Math.max(
                          analyticsData?.summaryStats?.currentViews || 1,
                          1
                        )) *
                        1000
                    ) / 10}
                    %
                  </h3>
                </div>
              </div>
              <div
                className={`flex items-center px-2 py-1 rounded-full text-sm ${
                  (analyticsData?.summaryStats?.likeGrowth || 0) >= 0
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {(analyticsData?.summaryStats?.likeGrowth || 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                <span>
                  {analyticsData?.summaryStats?.likeGrowthPercent || 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Impressions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Eye className="h-6 w-6 text-purple-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Impressions
                  </p>
                  <h3 className="text-xl font-bold text-gray-900">
                    {(
                      analyticsData?.summaryStats?.currentViews || 0
                    ).toLocaleString()}
                  </h3>
                </div>
              </div>
              <div
                className={`flex items-center px-2 py-1 rounded-full text-sm ${
                  (analyticsData?.summaryStats?.viewGrowth || 0) >= 0
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {(analyticsData?.summaryStats?.viewGrowth || 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                <span>
                  {analyticsData?.summaryStats?.viewGrowthPercent || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Performance Trends
          </h2>
          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => handleTimeRangeChange("7d")}
              className={`px-3 py-1 text-sm font-medium rounded-l-md ${
                timeRange === "7d"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => handleTimeRangeChange("30d")}
              className={`px-3 py-1 text-sm font-medium ${
                timeRange === "30d"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => handleTimeRangeChange("90d")}
              className={`px-3 py-1 text-sm font-medium rounded-r-md ${
                timeRange === "90d"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Quarter
            </button>
          </div>
        </div>

        {/* Engagement Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={engagementTrend}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="likes"
                stroke="#ec4899"
                activeDot={{ r: 8 }}
              />
              <Line type="monotone" dataKey="retweets" stroke="#10b981" />
              <Line type="monotone" dataKey="replies" stroke="#f59e0b" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TwitterAnalytics;
