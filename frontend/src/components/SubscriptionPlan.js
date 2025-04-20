import React, { useState } from "react";

const SubscriptionPlan = ({
  user,
  accountTypes,
  onUpgrade,
  totalAccountsCount,
  accountLimit,
}) => {
  const [isUpgradingPlan, setIsUpgradingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(
    user?.accountType || "basic"
  );

  const handleUpgrade = async () => {
    const success = await onUpgrade(selectedPlan);
    if (success) {
      setIsUpgradingPlan(false);
    }
  };

  return (
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
                onClick={handleUpgrade}
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
                    {accountTypes[user?.accountType || "basic"].description}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {totalAccountsCount} of {accountLimit} accounts connected
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
  );
};

export default SubscriptionPlan;
