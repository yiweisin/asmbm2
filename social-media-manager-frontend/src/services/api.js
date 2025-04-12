import axios from "axios";

// Create axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5193/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to include auth token in requests
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication services
export const authService = {
  // Register a new user
  register: async (username, email, password) => {
    try {
      const response = await api.post("/auth/register", {
        username,
        email,
        password,
      });
      return response.data;
    } catch (error) {
      // Improved error handling
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        throw error.response.data;
      } else if (error.request) {
        // The request was made but no response was received
        throw {
          error:
            "No response from server. Please check your internet connection.",
        };
      } else {
        // Something happened in setting up the request that triggered an Error
        throw { error: error.message };
      }
    }
  },

  // Login user
  login: async (username, password) => {
    try {
      const response = await api.post("/auth/login", {
        username,
        password,
      });

      // Store token in localStorage
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      return response.data;
    } catch (error) {
      if (error.response) {
        throw error.response.data;
      } else if (error.request) {
        throw {
          error:
            "No response from server. Please check your internet connection.",
        };
      } else {
        throw { error: error.message };
      }
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  // Get current user data
  getCurrentUser: () => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        return JSON.parse(userStr);
      }
    }
    return null;
  },

  // Check if user is logged in
  isLoggedIn: () => {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("token");
    }
    return false;
  },
};

// Twitter services
export const twitterService = {
  // Get all Twitter accounts
  getAccounts: async () => {
    try {
      const response = await api.get("/twitter/accounts");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Connect Twitter account
  connect: async (code, redirectUri, codeVerifier) => {
    try {
      const response = await api.post("/twitter/connect", {
        code,
        redirectUri,
        codeVerifier,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete Twitter account
  deleteAccount: async (id) => {
    try {
      const response = await api.delete(`/twitter/accounts/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Post a tweet
  postTweet: async (accountId, text) => {
    try {
      const response = await api.post(`/twitter/accounts/${accountId}/tweets`, {
        text,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get timeline (recent tweets)
  getTimeline: async (accountId, count = 10) => {
    try {
      const response = await api.get(
        `/twitter/accounts/${accountId}/timeline?count=${count}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getAnalytics: async (accountId, timeRange = "30d") => {
    try {
      const response = await api.get(
        `/twitter/accounts/${accountId}/analytics?timeRange=${timeRange}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Discord services
export const discordService = {
  // Get all Discord accounts
  getAccounts: async () => {
    try {
      const response = await api.get("/discord/accounts");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Connect Discord account
  connect: async (code, redirectUri) => {
    try {
      const response = await api.post("/discord/connect", {
        code,
        redirectUri,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete Discord account
  deleteAccount: async (id) => {
    try {
      const response = await api.delete(`/discord/accounts/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get Discord servers for an account
  getServers: async (accountId) => {
    try {
      const response = await api.get(`/discord/accounts/${accountId}/servers`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get channels for a server
  getChannels: async (accountId, serverId) => {
    try {
      const response = await api.get(
        `/discord/accounts/${accountId}/servers/${serverId}/channels`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get messages from a channel
  getMessages: async (accountId, channelId) => {
    try {
      const response = await api.get(
        `/discord/accounts/${accountId}/channels/${channelId}/messages`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Send a message to a channel
  sendMessage: async (accountId, channelId, message) => {
    try {
      const response = await api.post(
        `/discord/accounts/${accountId}/channels/${channelId}/messages`,
        {
          content: message,
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Telegram services
export const telegramService = {
  // Get all Telegram accounts
  getAccounts: async () => {
    try {
      const response = await api.get("/telegram/accounts");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Connect Telegram account
  connect: async (botToken) => {
    try {
      const response = await api.post("/telegram/connect", {
        botToken,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete Telegram account
  deleteAccount: async (id) => {
    try {
      const response = await api.delete(`/telegram/accounts/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Send a message
  sendMessage: async (accountId, chatId, message) => {
    try {
      const response = await api.post(`/telegram/accounts/${accountId}/send`, {
        chatId,
        message,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default api;
