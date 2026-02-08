/**
 * API Client for Django Backend
 * Handles authentication and API requests
 */
import axios, { AxiosInstance } from 'axios';

// Build API URL - default to localhost:8000 if not set
const buildApiUrl = (): string => {
  const envUrl = process.env.REACT_APP_API_URL;
  if (!envUrl) {
    return 'http://localhost:8000/api';
  }
  return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
};

const API_BASE_URL = buildApiUrl();

// Log API URL in development for debugging
if (process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', API_BASE_URL);
}

// Check if API URL is localhost in production (common misconfiguration)
if (process.env.NODE_ENV === 'production' && API_BASE_URL.includes('localhost')) {
  console.warn('WARNING: API URL is set to localhost in production. Set REACT_APP_API_URL environment variable to your backend URL.');
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
                refresh: refreshToken,
              });

              const { access } = response.data;
              localStorage.setItem('access_token', access);

              originalRequest.headers.Authorization = `Bearer ${access}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(username: string, password: string) {
    const response = await this.client.post('/auth/login/', { username, password });
    const { access, refresh } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    return response.data;
  }

  async googleLogin(googleToken: string) {
    const response = await this.client.post('/auth/google/', { token: googleToken });
    const { access, refresh, user } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    return { ...response.data, user };
  }

  async register(username: string, email: string, password: string, password2: string) {
    const response = await this.client.post('/auth/register/', { 
      username, 
      email, 
      password, 
      password2 
    });
    const { access, refresh } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    return response.data;
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // Case endpoints
  async getCases() {
    return this.client.get('/cases/');
  }

  async getCase(id: number) {
    return this.client.get(`/cases/${id}/`);
  }

  async createCase(data: any) {
    return this.client.post('/cases/', data);
  }

  async updateCase(id: number, data: any) {
    return this.client.patch(`/cases/${id}/`, data);
  }

  async closeCase(id: number) {
    return this.client.post(`/cases/${id}/close/`);
  }

  async getCaseSummary(id: number) {
    return this.client.get(`/cases/${id}/summary/`);
  }

  // Evidence endpoints
  async uploadEvidence(caseId: number, file: File) {
    const formData = new FormData();
    formData.append('case', caseId.toString());
    formData.append('file', file);
    formData.append('filename', file.name);

    return this.client.post('/evidence/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async getEvidenceFiles(caseId?: number) {
    const params = caseId ? { case: caseId } : {};
    return this.client.get('/evidence/', { params });
  }

  async getEvidenceHash(id: number) {
    return this.client.get(`/evidence/${id}/hash/`);
  }

  // Parsed events endpoints
  async getParsedEvents(params?: { case?: number; evidence_file?: number; search?: string; limit?: number }) {
    return this.client.get('/parsed-events/', { params });
  }

  async getParsedEvent(id: number) {
    return this.client.get(`/parsed-events/${id}/`);
  }

  // Scoring endpoints
  async runScoring(caseId: number) {
    return this.client.post('/scoring/run/', { case_id: caseId });
  }

  async recalculateScoring(caseId: number) {
    return this.client.post('/scoring/recalculate/', { case_id: caseId });
  }

  // Filter endpoints
  async applyThreshold(caseId: number, threshold: number) {
    return this.client.post('/filter/apply/', { case_id: caseId, threshold });
  }

  async getFilterState(caseId: number) {
    return this.client.get('/filter/state/', { params: { case_id: caseId } });
  }

  async resetFilters(caseId: number) {
    return this.client.post('/filter/reset/', { case_id: caseId });
  }

  // Scored events endpoints
  async getScoredEvents(params?: any) {
    return this.client.get('/scored-events/', { params });
  }

  async exportEventsCSV(caseId: number) {
    return this.client.get(`/scored-events/export_csv/?case_id=${caseId}`, {
      responseType: 'blob'
    });
  }

  async archiveEvent(id: number) {
    return this.client.post(`/scored-events/${id}/archive/`);
  }

  async markFalsePositive(id: number) {
    return this.client.post(`/scored-events/${id}/mark_false_positive/`);
  }

  async generateExplanation(id: number) {
    return this.client.post(`/scored-events/${id}/generate_explanation/`);
  }

  // Story endpoints
  async generateStory(caseId: number) {
    return this.client.post('/story/generate/', { case_id: caseId });
  }

  async getStories(caseId?: number) {
    const params = caseId ? { case: caseId } : {};
    return this.client.get('/story/', { params });
  }

  async regenerateStory(id: number) {
    return this.client.post(`/story/${id}/regenerate/`);
  }

  // Report endpoints
  async generateReport(caseId: number, format: string = 'PDF') {
    return this.client.post('/report/generate/', { case_id: caseId, format });
  }

  async getReports(caseId?: number) {
    const params = caseId ? { case: caseId } : {};
    return this.client.get('/report/', { params });
  }

  async downloadReport(id: number) {
    // Get file directly with proper response type
    return this.client.get(`/report/${id}/download/`, {
      responseType: 'blob',
    });
  }
  
  async generateCombinedReport(caseId: number) {
    // Generate both PDF and CSV in a ZIP file
    return this.client.post(`/report/generate_combined/`, 
      { case_id: caseId },
      { responseType: 'blob' }
    );
  }
  
  async previewLatex(caseId: number) {
    // Generate LaTeX source code for preview/editing
    return this.client.post('/report/preview_latex/', { case_id: caseId });
  }
  
  async compileCustomLatex(latexSource: string, filename: string = 'custom_report.pdf', fallbackToTex: boolean = false) {
    // Compile custom LaTeX to PDF (or .tex if PDF not available and fallback enabled)
    return this.client.post('/report/compile_custom_latex/', 
      { latex_source: latexSource, filename, fallback_to_tex: fallbackToTex },
      { responseType: 'blob' }
    );
  }
  
  async getReportCapabilities() {
    // Check what report capabilities are available on the server
    return this.client.get('/report/capabilities/');
  }
  
  async getAIAnalysis(caseId: number) {
    // Get AI-powered analysis summary using Gemini
    return this.client.post('/report/ai_analysis/', { case_id: caseId });
  }
  
  async analyzeLogsWithAI(events: any[], analysisType: string = 'security') {
    // Analyze parsed log events with Gemini AI
    return this.client.post('/report/analyze_logs/', { 
      events, 
      analysis_type: analysisType 
    });
  }
  
  getReportDownloadUrl(id: number): string {
    // Helper to construct direct download URL
    const token = localStorage.getItem('access_token');
    return `${API_BASE_URL}/report/${id}/download/?token=${token}`;
  }

  // Dashboard endpoints
  async getDashboardSummary() {
    return this.client.get('/dashboard/summary/');
  }

  async getTimeline(caseId: number) {
    return this.client.get('/dashboard/timeline/', { params: { case_id: caseId } });
  }

  async getConfidenceDistribution(caseId: number) {
    return this.client.get('/dashboard/confidence-distribution/', {
      params: { case_id: caseId },
    });
  }

  // Notes endpoints
  async createNote(data: any) {
    return this.client.post('/notes/', data);
  }

  async getNotes(caseId?: number, eventId?: number) {
    const params: any = {};
    if (caseId) params.case = caseId;
    if (eventId) params.scored_event = eventId;
    return this.client.get('/notes/', { params });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
