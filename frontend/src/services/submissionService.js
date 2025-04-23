import api from "./api";

export const submissionService = {
  // Get all submissions with optional status filter
  getSubmissions: async (status = null) => {
    try {
      let url = "/submission";
      if (status) {
        url += `?status=${status}`;
      }
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get a specific submission by ID
  getSubmission: async (id) => {
    try {
      const response = await api.get(`/submission/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Create a new submission (for subaccounts) - simplified to only require platform and content
  createSubmission: async (submissionData) => {
    try {
      // Make sure we always have at least the required fields
      const minimalData = {
        platform: submissionData.platform,
        content: submissionData.content,
        // Other fields are optional
        ...(submissionData.targetId && { targetId: submissionData.targetId }),
        ...(submissionData.scheduledTime && {
          scheduledTime: submissionData.scheduledTime,
        }),
      };

      const response = await api.post("/submission", minimalData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Review a submission (for admins)
  reviewSubmission: async (id, reviewData) => {
    try {
      const response = await api.post(`/submission/${id}/review`, reviewData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default submissionService;
