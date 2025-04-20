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

  // Create a new submission (for subaccounts)
  createSubmission: async (submissionData) => {
    try {
      const response = await api.post("/submission", submissionData);
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
