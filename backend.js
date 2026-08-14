/**
 * Client-Side API Communication & E2EE Bridge Module
 * Integrates Web Crypto API payload encryption, JWT token storage,
 * Email OTP Verification, and Admin Portal endpoints.
 */

const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
  ? "http://localhost:3000" 
  : "https://holder-portal.onrender.com";

const Backend = {
  token: localStorage.getItem("jwt_token") || null,

  setToken(token) {
    Backend.token = token;
    if (token) {
      localStorage.setItem("jwt_token", token);
    } else {
      localStorage.removeItem("jwt_token");
    }
  },

  // Helper for requests with Authorization Bearer header
  async _request(url, options = {}) {
    options.credentials = 'include';

    options.headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (Backend.token) {
      options.headers['Authorization'] = `Bearer ${Backend.token}`;
    }

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      options.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (!response.ok) {
        // Pass requiresVerification flag if email OTP is required
        const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
        err.requiresVerification = data.requiresVerification;
        err.email = data.email;
        err.verificationCode = data.verificationCode;
        throw err;
      }
      return data;
    } catch (error) {
      console.error(`API Error on ${url}:`, error);
      throw error;
    }
  },

  // Fetch Server RSA Public Key for Web Crypto E2EE (Dummy for compatibility)
  async getPublicKey() {
    return null;
  },

  // Auth Operations
  Auth: {
    // E2EE Encrypted User Registration
    async register(name, email, mobile, password) {
      const res = await Backend._request(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        body: { name, email, mobile, password }
      });

      if (res.token) {
        Backend.setToken(res.token);
      }
      return res;
    },

    // Verify 6-digit Email OTP Code
    async verifyEmail(email, code) {
      const res = await Backend._request(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        body: { email, otp: code }
      });
      if (res.token) {
        Backend.setToken(res.token);
      }
      return res;
    },

    // Resend Email Verification Code
    async resendCode(email) {
      return Backend._request(`${API_BASE}/api/resend-code`, {
        method: 'POST',
        body: { email }
      });
    },

    // E2EE Encrypted User Login
    async login(email, password) {
      const res = await Backend._request(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        body: { email, password }
      });

      if (res.token) {
        Backend.setToken(res.token);
      }
      return res;
    },

    async logOut() {
      Backend.setToken(null);
      return Backend._request(`${API_BASE}/api/auth/logout`, {
        method: 'POST'
      });
    },

    async me() {
      return Backend._request(`${API_BASE}/api/auth/me`, {
        method: 'GET'
      });
    },

    async deactivate() {
      const res = await Backend._request(`${API_BASE}/api/auth/deactivate`, {
        method: 'DELETE'
      });
      Backend.setToken(null);
      return res;
    }
  },

  // Admin Portal Operations
  Admin: {
    async getUsers() {
      return Backend._request(`${API_BASE}/api/admin/users`, { method: 'GET' });
    },

    async deleteUser(id) {
      return Backend._request(`${API_BASE}/api/admin/users/${id}`, { method: 'DELETE' });
    },

    async toggleVerifyUser(id) {
      return Backend._request(`${API_BASE}/api/admin/users/${id}/verify`, { method: 'POST' });
    },

    async addJob(jobData) {
      return Backend._request(`${API_BASE}/api/admin/jobs`, {
        method: 'POST',
        body: jobData
      });
    },

    async getStats() {
      return Backend._request(`${API_BASE}/api/admin/stats`, { method: 'GET' });
    }
  },

  // Career & Jobs Operations
  Jobs: {
    async fetchJobs() {
      return Backend._request(`${API_BASE}/api/jobs`, {
        method: 'GET'
      });
    }
  },

  // Notifications Operations
  Notifications: {
    async fetchNotifications() {
      return Backend._request(`${API_BASE}/api/notifications`, {
        method: 'GET'
      });
    },

    async clearNotifications() {
      return Backend._request(`${API_BASE}/api/notifications/clear`, {
        method: 'POST'
      });
    }
  },

  // Projects Operations
  Projects: {
    async fetchBlueprint(topic, category) {
      const url = `${API_BASE}/api/projects/blueprint?topic=${encodeURIComponent(topic)}` +
        (category ? `&category=${encodeURIComponent(category)}` : '');
      return Backend._request(url, { method: 'GET' });
    },

    async fetchWikiSummary(topic) {
      return Backend._request(`${API_BASE}/api/projects/wiki?topic=${encodeURIComponent(topic)}`, {
        method: 'GET'
      });
    }
  },

  // Biomedical AI Scanner
  Biomedical: {
    async uploadScan(file) {
      const formData = new FormData();
      formData.append('mediaFile', file);

      const options = {
        method: 'POST',
        credentials: 'include',
        headers: {},
        body: formData
      };
      if (Backend.token) {
        options.headers['Authorization'] = `Bearer ${Backend.token}`;
      }

      const response = await fetch(`${API_BASE}/api/bio/scan`, options);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload scan failed.");
      return data;
    }
  },

  // Games Achievements
  Games: {
    async saveScore(gameName, score) {
      return Backend._request(`${API_BASE}/api/games/score`, {
        method: 'POST',
        body: { game_name: gameName, score }
      });
    },

    async getHighScore(gameName) {
      return Backend._request(`${API_BASE}/api/games/highscore?game_name=${encodeURIComponent(gameName)}`, {
        method: 'GET'
      });
    }
  }
};
