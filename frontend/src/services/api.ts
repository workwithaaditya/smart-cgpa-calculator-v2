/**
 * API Service Layer
 * 
 * Centralized backend communication with auth-aware requests.
 * Handles all CRUD operations for subjects, semesters, and calculations.
 */

import { Subject } from '../lib/SGPAEngine';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ============================================================================
// AUTHENTICATION
// ============================================================================

export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

export const authAPI = {
  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/user`, {
        credentials: 'include'
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  async checkAuthStatus(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/status`, {
        credentials: 'include'
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.authenticated;
    } catch (error) {
      console.error('Failed to check auth status:', error);
      return false;
    }
  },

  /**
   * Initiate Google OAuth login
   */
  loginWithGoogle() {
    window.location.href = `${API_BASE_URL}/auth/google`;
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }
};

// ============================================================================
// SUBJECTS
// ============================================================================

export interface BackendSubject {
  id: string;
  userId: string;
  semesterId?: string;
  code: string;
  name: string;
  cie: number;
  see: number;
  credits: number;
  total?: number;
  gp?: number;
  weighted?: number;
  createdAt: string;
  updatedAt: string;
}

export const subjectsAPI = {
  /**
   * Get all subjects for current user
   */
  async getAll(): Promise<BackendSubject[]> {
    const res = await fetch(`${API_BASE_URL}/api/subjects`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to fetch subjects');
    const data = await res.json();
    return data.subjects;
  },

  /**
   * Get subjects for active semester only
   */
  async getActiveSemester(): Promise<{ subjects: BackendSubject[]; semester?: any }> {
    const res = await fetch(`${API_BASE_URL}/api/subjects/active`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to fetch active subjects');
    return await res.json();
  },

  /**
   * Get single subject by ID
   */
  async getById(id: string): Promise<BackendSubject> {
    const res = await fetch(`${API_BASE_URL}/api/subjects/${id}`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to fetch subject');
    const data = await res.json();
    return data.subject;
  },

  /**
   * Create new subject
   */
  async create(subject: Omit<Subject, 'code'> & { code?: string }): Promise<BackendSubject> {
    const res = await fetch(`${API_BASE_URL}/api/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        code: subject.code || `SUB${Date.now()}`,
        name: subject.name,
        cie: subject.cie,
        see: subject.see,
        credits: subject.credits
      })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create subject');
    }
    const data = await res.json();
    return data.subject;
  },

  /**
   * Update existing subject
   */
  async update(id: string, updates: Partial<Subject>): Promise<BackendSubject> {
    const res = await fetch(`${API_BASE_URL}/api/subjects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update subject');
    }
    const data = await res.json();
    return data.subject;
  },

  /**
   * Update only SEE marks (optimized endpoint)
   */
  async updateSEE(id: string, see: number): Promise<BackendSubject> {
    const res = await fetch(`${API_BASE_URL}/api/subjects/${id}/see`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ see })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update SEE');
    }
    const data = await res.json();
    return data.subject;
  },

  /**
   * Delete subject
   */
  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/subjects/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete subject');
    }
  },

  /**
   * Bulk create subjects
   */
  async bulkCreate(subjects: Array<Omit<Subject, 'code'> & { code?: string }>): Promise<BackendSubject[]> {
    const res = await fetch(`${API_BASE_URL}/api/subjects/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ subjects })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to bulk create subjects');
    }
    const data = await res.json();
    return data.subjects;
  },

  /**
   * Recalculate cached metrics for all subjects
   */
  async recalculate(): Promise<number> {
    const res = await fetch(`${API_BASE_URL}/api/subjects/recalculate`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to recalculate');
    }
    const data = await res.json();
    return data.updatedCount;
  }
};

// ============================================================================
// SEMESTERS
// ============================================================================

export interface Semester {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  subjects?: BackendSubject[];
}

export const semestersAPI = {
  /**
   * Get all semesters for current user
   */
  async getAll(): Promise<Semester[]> {
    const res = await fetch(`${API_BASE_URL}/api/semesters`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to fetch semesters');
    const data = await res.json();
    return data.semesters;
  },

  /**
   * Get active semester
   */
  async getActive(): Promise<Semester> {
    const res = await fetch(`${API_BASE_URL}/api/semesters/active`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to fetch active semester');
    const data = await res.json();
    return data.semester;
  },

  /**
   * Create new semester
   */
  async create(name: string, isActive = true): Promise<Semester> {
    const res = await fetch(`${API_BASE_URL}/api/semesters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, isActive })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create semester');
    }
    const data = await res.json();
    return data.semester;
  },

  /**
   * Set active semester
   */
  async activate(id: string): Promise<Semester> {
    const res = await fetch(`${API_BASE_URL}/api/semesters/${id}/activate`, {
      method: 'PUT',
      credentials: 'include'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to activate semester');
    }
    const data = await res.json();
    return data.semester;
  },

  /**
   * Delete semester
   */
  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/semesters/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete semester');
    }
  }
};

// ============================================================================
// CALCULATIONS
// ============================================================================

export interface SGPAResponse {
  sgpa: number;
  totalCredits: number;
  totalWeighted: number;
  maxSgpaIfAll100: number;
}

export interface CGPAResponse {
  cgpa: number;
  totalCredits: number;
  semesterBreakdown: Array<{
    semesterId: string;
    name: string;
    sgpa: number;
    credits: number;
  }>;
}

export const calculationsAPI = {
  /**
   * Calculate SGPA (can pass subjects or use active semester)
   */
  async calculateSGPA(subjects?: Subject[]): Promise<SGPAResponse> {
    const res = await fetch(`${API_BASE_URL}/api/calculate/sgpa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ subjects })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to calculate SGPA');
    }
    return await res.json();
  },

  /**
   * Calculate CGPA across all semesters
   */
  async calculateCGPA(): Promise<CGPAResponse> {
    const res = await fetch(`${API_BASE_URL}/api/calculate/cgpa`, {
      credentials: 'include'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to calculate CGPA');
    }
    return await res.json();
  }
};

// ============================================================================
// EXPORT
// ============================================================================

export const exportAPI = {
  /**
   * Export full data as JSON
   */
  async exportJSON(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/export/json`, {
      credentials: 'include'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to export JSON');
    }
    return await res.json();
  },

  /**
   * Download PDF report
   */
  async downloadPDF(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/export/pdf`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to generate PDF');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cgpa-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PDF download failed:', error);
      throw error;
    }
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert backend subject to frontend Subject format
 */
export function toFrontendSubject(backendSubject: BackendSubject): Subject {
  return {
    code: backendSubject.code,
    name: backendSubject.name,
    cie: backendSubject.cie,
    see: backendSubject.see,
    credits: backendSubject.credits
  };
}

/**
 * Convert frontend Subject to backend format
 */
export function toBackendSubject(subject: Subject): Omit<BackendSubject, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
  return {
    code: subject.code,
    name: subject.name,
    cie: subject.cie,
    see: subject.see,
    credits: subject.credits
  };
}

export default {
  auth: authAPI,
  subjects: subjectsAPI,
  semesters: semestersAPI,
  calculations: calculationsAPI,
  export: exportAPI
};
