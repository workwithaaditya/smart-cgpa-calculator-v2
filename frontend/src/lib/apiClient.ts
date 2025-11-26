/**
 * API Client for Backend Communication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper for fetch with credentials
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      credentials: 'include', // Important for cookies/sessions
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication
  async checkAuthStatus(): Promise<{ authenticated: boolean; user: any | null }> {
    return this.request('/auth/status');
  }

  async getCurrentUser(): Promise<{ user: any }> {
    return this.request('/auth/user');
  }

  async logout(): Promise<{ message: string }> {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // Subjects
  async getSubjects(): Promise<{ subjects: any[] }> {
    return this.request('/api/subjects');
  }

  async getActiveSubjects(): Promise<{ subjects: any[]; semester: any }> {
    return this.request('/api/subjects/active');
  }

  async createSubject(subject: {
    code: string;
    name: string;
    cie: number;
    see?: number;
    credits: number;
  }): Promise<{ subject: any }> {
    return this.request('/api/subjects', {
      method: 'POST',
      body: JSON.stringify(subject),
    });
  }

  async updateSubject(id: string, data: Partial<{
    code: string;
    name: string;
    cie: number;
    see: number;
    credits: number;
  }>): Promise<{ subject: any }> {
    return this.request(`/api/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateSubjectSEE(id: string, see: number): Promise<{ subject: any }> {
    return this.request(`/api/subjects/${id}/see`, {
      method: 'PATCH',
      body: JSON.stringify({ see }),
    });
  }

  async deleteSubject(id: string): Promise<{ message: string }> {
    return this.request(`/api/subjects/${id}`, { method: 'DELETE' });
  }

  async bulkCreateSubjects(subjects: any[]): Promise<{ subjects: any[] }> {
    return this.request('/api/subjects/bulk', {
      method: 'POST',
      body: JSON.stringify({ subjects }),
    });
  }

  // Semesters
  async getSemesters(): Promise<{ semesters: any[] }> {
    return this.request('/api/semesters');
  }

  async getActiveSemester(): Promise<{ semester: any }> {
    return this.request('/api/semesters/active');
  }

  async createSemester(name: string, isActive?: boolean): Promise<{ semester: any }> {
    return this.request('/api/semesters', {
      method: 'POST',
      body: JSON.stringify({ name, isActive }),
    });
  }

  async activateSemester(id: string): Promise<{ semester: any }> {
    return this.request(`/api/semesters/${id}/activate`, { method: 'PUT' });
  }

  async deleteSemester(id: string): Promise<{ message: string }> {
    return this.request(`/api/semesters/${id}`, { method: 'DELETE' });
  }

  // Calculations
  async calculateSGPA(subjects?: any[]): Promise<{
    subjects: any[];
    sgpa: number;
    totalCredits: number;
    totalWeighted: number;
    maxSgpaIfAll100: number;
  }> {
    return this.request('/api/calculate/sgpa', {
      method: 'POST',
      body: JSON.stringify(subjects ? { subjects } : {}),
    });
  }

  // Auth URLs
  getGoogleLoginURL(): string {
    return `${this.baseURL}/auth/google`;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
