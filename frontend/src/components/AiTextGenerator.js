import React, { useState } from "react";
import { aiService } from "@/services/api";
import toast from "react-hot-toast";

const AITextGenerator = ({
  onTextGenerated,
  platform = null,
  className = "",
}) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPromptBox, setShowPromptBox] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await aiService.generateText(prompt, platform);
      onTextGenerated(response.generatedText);
      setPrompt("");
      setShowPromptBox(false);
      toast.success("Text generated successfully!");
    } catch (error) {
      console.error("Error generating text:", error);
      toast.error("Failed to generate text: " + (error.error || error));
    } finally {
      setIsGenerating(false);
    }
  };

  // Get platform-specific suggestions
  const getPlaceholderByPlatform = () => {
    switch (platform) {
      case "twitter":
        return "E.g., 'Write a tweet about our product launch' or 'Create a short announcement about our summer sale'";
      case "discord":
        return "E.g., 'Write an announcement for our Discord community' or 'Create a welcome message for new members'";
      case "telegram":
        return "E.g., 'Write a message to announce our new feature' or 'Create a poll introduction about user preferences'";
      default:
        return "E.g., 'Write a post about our new product launch' or 'Create an engaging announcement'";
    }
  };

  return (
    <div className={`ai-text-generator ${className}`}>
      {!showPromptBox ? (
        <button
          type="button"
          onClick={() => setShowPromptBox(true)}
          className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16v-4H9l4-8v4h2l-4 8z" />
          </svg>
          Generate with AI
        </button>
      ) : (
        <div className="border rounded-lg bg-white shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16v-4H9l4-8v4h2l-4 8z" />
            </svg>
            <h3 className="text-lg font-bold">AI Text Generator</h3>
          </div>

          <div className="p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Describe what you want to generate
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder={getPlaceholderByPlatform()}
                rows="3"
                disabled={isGenerating}
              ></textarea>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowPromptBox(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded hover:from-blue-700 hover:to-indigo-700 flex items-center"
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  "Generate"
                )}
              </button>
            </div>

            <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 inline mr-1 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {platform === "twitter" ? (
                <span>
                  Tip: Be specific about tone and purpose. Remember tweets have
                  a 280 character limit.
                </span>
              ) : (
                <span>
                  Tip: Be specific about tone, length, and purpose to get better
                  results.
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AITextGenerator;
