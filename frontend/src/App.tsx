/**
 * Main App Component
 * 
 * Orchestrates the entire Smart CGPA Calculator application.
 * Supports local-first usage with optional cloud sync via Google OAuth.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SubjectCard } from './components/SubjectCard';
import { Charts } from './components/Charts';
import { Planner } from './components/Planner';
import {
  calculateSGPA,
  exportToJSON,
  Subject,
  DEFAULT_GRADING_CONFIG
} from './lib/SGPAEngine';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { LogIn, LogOut } from 'lucide-react';

// Local storage key
const LOCAL_STORAGE_KEY = 'smart-cgpa-subjects';

// Load subjects from localStorage
const loadLocalSubjects = (): Subject[] => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Failed to load subjects from localStorage:', error);
    return [];
  }
};

// Save subjects to localStorage
const saveLocalSubjects = (subjects: Subject[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(subjects));
  } catch (error) {
    console.error('Failed to save subjects to localStorage:', error);
  }
};

function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; picture?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // App state - load from localStorage first
  const [subjects, setSubjects] = useState<Subject[]>(loadLocalSubjects());
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string | undefined>(undefined);
  const [showPlanner, setShowPlanner] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'subjects' | 'analytics'>('subjects');
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [newSubjectForm, setNewSubjectForm] = useState({
    code: '',
    name: '',
    cie: 40,
    see: 50,
    credits: 3
  });

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Save subjects to localStorage whenever they change
  useEffect(() => {
    saveLocalSubjects(subjects);
    // If authenticated, also sync to backend
    if (isAuthenticated) {
      syncToBackend();
    }
  }, [subjects, isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/auth/status`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.isAuthenticated) {
          setIsAuthenticated(true);
          setUser(data.user);
          // Load subjects from backend
          await loadFromBackend();
        }
      }
    } catch (error) {
      console.log('Not authenticated, using local storage');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.location.href = `${apiUrl}/auth/google`;
  };

  const handleLogout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/auth/logout`, {
        credentials: 'include'
      });
      setIsAuthenticated(false);
      setUser(null);
      // Keep local subjects after logout
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const loadFromBackend = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/subjects`, {
        credentials: 'include'
      });
      if (response.ok) {
        const backendSubjects = await response.json();
        if (backendSubjects.length > 0) {
          // Merge with local subjects (backend takes precedence)
          setSubjects(backendSubjects);
          saveLocalSubjects(backendSubjects);
        } else if (subjects.length > 0) {
          // If backend is empty but we have local subjects, sync them up
          await syncToBackend();
        }
      }
    } catch (error) {
      console.error('Failed to load from backend:', error);
    }
  };

  const syncToBackend = async () => {
    if (!isAuthenticated || subjects.length === 0) return;
    
    try {
      // Simple bulk sync - you can enhance this with proper conflict resolution
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/subjects/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subjects })
      });
    } catch (error) {
      console.error('Failed to sync to backend:', error);
    }
  };
  
  // Calculate current SGPA
  const result = calculateSGPA(subjects, DEFAULT_GRADING_CONFIG);
  const [showOverview, setShowOverview] = useState(false);

  // Dynamic accent for SGPA box based on value
  const sgpaAccent = result.sgpa >= 9
    ? 'from-green-600/40 to-green-700/40 border-green-500/60'
    : result.sgpa >= 8
      ? 'from-blue-600/40 to-blue-700/40 border-blue-500/60'
      : result.sgpa >= 7
        ? 'from-purple-600/40 to-purple-700/40 border-purple-500/60'
        : result.sgpa >= 6
          ? 'from-amber-600/40 to-amber-700/40 border-amber-500/60'
          : 'from-red-600/40 to-red-700/40 border-red-500/60';

  // Flowing background gradient colors (subtle, based on SGPA tier)
  const bgSet = result.sgpa >= 9
    ? ['#0f2f2b', '#0d4a42', '#0f2f2b']
    : result.sgpa >= 8
      ? ['#0b1f33', '#133c5e', '#0b1f33']
      : result.sgpa >= 7
        ? ['#1e1530', '#35265a', '#1e1530']
        : result.sgpa >= 6
          ? ['#2d1d0b', '#4a3312', '#2d1d0b']
          : ['#2a0f12', '#4a1d22', '#2a0f12'];
  const dynamicGradient = `linear-gradient(120deg, ${bgSet[0]}, ${bgSet[1]}, ${bgSet[2]})`;
  
  // Handle SEE change for a subject
  const handleSeeChange = (code: string, newSee: number) => {
    setSubjects(prev =>
      prev.map((s: Subject) => (s.code === code ? { ...s, see: newSee } : s))
    );
  };
  
  // Add new subject
  const resetSubjectForm = () => {
    setEditingSubject(null);
    setNewSubjectForm({ code: '', name: '', cie: 40, see: 50, credits: 3 });
  };

  const openAddSubjectModal = () => {
    resetSubjectForm();
    setShowAddSubjectModal(true);
  };

  const handleSubmitSubject = () => {
    if (!newSubjectForm.code.trim() || !newSubjectForm.name.trim()) {
      alert('Please enter subject code and name');
      return;
    }
    if (newSubjectForm.cie < 0 || newSubjectForm.cie > 50) {
      alert('CIE must be between 0 and 50');
      return;
    }
    if (newSubjectForm.see < 0 || newSubjectForm.see > 100) {
      alert('SEE must be between 0 and 100');
      return;
    }
    if (newSubjectForm.credits <= 0) {
      alert('Credits must be positive');
      return;
    }

    if (editingSubject) {
      // Update existing
      setSubjects(prev => prev.map(s => s.code === editingSubject.code ? {
        ...s,
        code: newSubjectForm.code.toUpperCase(),
        name: newSubjectForm.name,
        cie: newSubjectForm.cie,
        see: newSubjectForm.see,
        credits: newSubjectForm.credits
      } : s));
    } else {
      // Add new
      const newSubject: Subject = {
        code: newSubjectForm.code.toUpperCase(),
        name: newSubjectForm.name,
        cie: newSubjectForm.cie,
        see: newSubjectForm.see,
        credits: newSubjectForm.credits
      };
      setSubjects([...subjects, newSubject]);
      if (!selectedSubjectCode) {
        setSelectedSubjectCode(newSubject.code);
      }
    }
    setShowAddSubjectModal(false);
    resetSubjectForm();
  };
  
  // Remove subject (allow removing final subject; show empty state)
  const handleRemoveSubject = (code: string) => {
    setSubjects((prev: Subject[]) => prev.filter((s: Subject) => s.code !== code));
    if (selectedSubjectCode === code) {
      // select another or clear selection
      const remaining = subjects.filter(s => s.code !== code);
      setSelectedSubjectCode(remaining[0]?.code);
    }
  };
  
  // Export to JSON
  const handleExportJSON = () => {
    const json = exportToJSON(subjects, result, DEFAULT_GRADING_CONFIG);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sgpa-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Export to PDF
  const handleExportPDF = async () => {
    const element = document.getElementById('dashboard');
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`sgpa-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF export failed. Please try again.');
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-950 to-slate-900 relative overflow-hidden">
      {/* Animated subtle flowing gradient layer */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-40"
        style={{ background: dynamicGradient, backgroundSize: '200% 200%', animation: 'subtleFlow 22s ease-in-out infinite' }}
      />
      {/* Inject keyframes once */}
      <style>{`@keyframes subtleFlow {0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>
      
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative pb-10 pt-6"
      >
        <div className="container mx-auto px-4">
          {/* Auth Button - Top Right */}
          <div className="absolute top-6 right-6 z-50">
            {isLoading ? (
              <div className="w-10 h-10 rounded-full bg-gray-800/50 animate-pulse"></div>
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-3 bg-gray-800/50 backdrop-blur-sm rounded-lg p-2 border border-gray-700/50">
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm text-gray-300 hidden sm:block max-w-[150px] truncate">
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-gray-700/50 transition-colors flex items-center gap-2"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl"
                title="Sign in with Google to sync your data"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>

          {/* Title */}
          <div className="flex flex-col items-center mb-6">
            <motion.h1
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-5xl font-light tracking-tight text-white text-center"
            >
              Smart CGPA Calculator
            </motion.h1>
            <p className="text-gray-400 text-base font-light mt-2">
              Interactive SGPA prediction with intelligent planning
            </p>
            {!isAuthenticated && (
              <p className="text-xs text-gray-500 mt-1">
                Working offline • Sign in to sync across devices
              </p>
            )}
          </div>

          {/* Navigation Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-8"
          >
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-1 flex gap-1 border border-gray-700/50">
              <button
                onClick={() => setActiveTab('subjects')}
                className={`px-8 py-3 rounded-md font-medium transition-all duration-200 ${
                  activeTab === 'subjects'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                Subjects & SGPA
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-8 py-3 rounded-md font-medium transition-all duration-200 ${
                  activeTab === 'analytics'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                Analytics & Planner
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div id="dashboard" className="container mx-auto px-4 pb-12 -mt-12">
        {/* Action Buttons moved above SGPA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap justify-center gap-4 mb-10 relative z-30"
        >
          <button
            onClick={openAddSubjectModal}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-blue-500/20"
          >
            + Add Subject
          </button>
          <button
            onClick={() => setShowPlanner(!showPlanner)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-purple-500/20"
          >
            {showPlanner ? 'Hide Planner' : 'Show Planner'}
          </button>
          <button
            onClick={handleExportJSON}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Export JSON
          </button>
          <button
            onClick={handleExportPDF}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Export PDF
          </button>
        </motion.div>

        {/* Compact SGPA bar with expandable detailed overview */}
        <div className="mb-8 flex justify-center sticky top-2 z-20">
          <div className={`bg-gradient-to-r ${sgpaAccent} rounded-2xl px-8 py-6 backdrop-blur-sm flex flex-col items-center w-full max-w-xl transition-colors duration-300`}>            
            <div className="text-xs tracking-wide text-gray-400 uppercase mb-1">Live SGPA</div>
            <div className="text-5xl font-bold text-white mb-4">{result.sgpa}</div>
            <button
              onClick={() => setShowOverview(o => !o)}
              className="px-5 py-2 text-sm font-medium rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
            >
              {showOverview ? 'Hide Details' : 'Show More'}
            </button>
          </div>
          {showOverview && (
            <div className="mt-6 flex flex-wrap justify-center gap-6 w-full">
              <div className="bg-gradient-to-br from-gray-800/60 via-gray-800/40 to-gray-700/40 backdrop-blur-sm rounded-xl px-6 py-4 w-56 text-center transition-colors">
                <div className="text-xs text-gray-400 mb-1">Total Credits</div>
                <div className="text-2xl font-bold text-white">{result.totalCredits}</div>
              </div>
              <div className="bg-gradient-to-br from-gray-800/60 via-gray-800/40 to-gray-700/40 backdrop-blur-sm rounded-xl px-6 py-4 w-56 text-center transition-colors">
                <div className="text-xs text-gray-400 mb-1">Max Possible SGPA</div>
                <div className="text-2xl font-bold text-white">{result.maxSgpaIfAll100}</div>
              </div>
              <div className="bg-gradient-to-br from-gray-800/60 via-gray-800/40 to-gray-700/40 backdrop-blur-sm rounded-xl px-6 py-4 w-56 text-center transition-colors">
                <div className="text-xs text-gray-400 mb-1">Subjects Count</div>
                <div className="text-2xl font-bold text-white">{subjects.length}</div>
              </div>
            </div>
          )}
        </div>

        {/* (Old position of action buttons removed) */}

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'subjects' ? (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Empty State */}
              {subjects.length === 0 && (
                <div className="flex flex-col items-center justify-center bg-gray-800/40 backdrop-blur-sm border border-gray-700/40 rounded-2xl p-12 mx-auto max-w-xl mb-10">
                  <h3 className="text-2xl font-semibold text-white mb-3">Start by adding a subject</h3>
                  <p className="text-gray-400 mb-6 text-center">No subjects yet. Click below to add your first one and begin tracking SGPA.</p>
                  <button
                    onClick={openAddSubjectModal}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20"
                  >
                    + Add Subject
                  </button>
                </div>
              )}
              {/* Subjects Grid */}
              <h2 className="text-2xl font-bold text-white mb-6">
                Your Subjects ({subjects.length})
              </h2>
              {(() => {
                const sorted = subjects.slice().sort((a,b) => b.credits - a.credits);
                const groups: Record<number, Subject[]> = {};
                sorted.forEach(s => { (groups[s.credits] ||= []).push(s); });
                const creditOrder = Object.keys(groups).map(Number).sort((a,b) => b - a);
                return (
                  <div className="flex flex-wrap justify-center gap-16">
                    {creditOrder.map(credits => (
                      <div key={credits} className="flex flex-col items-center w-80 bg-gray-800/40 rounded-2xl px-6 py-7 border border-gray-700/40">
                        <h3 className="text-sm font-semibold tracking-wide text-gray-300 uppercase mb-5 text-center">
                          {credits} Credit{credits !== 1 ? 's' : ''}
                        </h3>
                        <div className="flex flex-col gap-7 w-full">
                          {groups[credits].map(subject => (
                            <motion.div
                              key={subject.code}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              whileHover={{ scale: 1.02 }}
                              className="relative"
                            >
                              <div
                                onClick={() => setSelectedSubjectCode(subject.code)}
                                className={`cursor-pointer transition-all ${
                                  selectedSubjectCode === subject.code
                                    ? 'ring-2 ring-blue-500'
                                    : ''
                                }`}
                              >
                                <SubjectCard
                                  subject={subject}
                                  onSeeChange={(newSee) => handleSeeChange(subject.code, newSee)}
                                  onRemove={() => handleRemoveSubject(subject.code)}
                                  onEdit={() => {
                                    setEditingSubject(subject);
                                    setNewSubjectForm({
                                      code: subject.code,
                                      name: subject.name,
                                      cie: subject.cie,
                                      see: subject.see,
                                      credits: subject.credits
                                    });
                                    setShowAddSubjectModal(true);
                                  }}
                                  allSubjects={subjects}
                                  config={DEFAULT_GRADING_CONFIG}
                                  currentSgpa={result.sgpa}
                                />
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </motion.div>
          ) : (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Charts
                subjects={subjects}
                selectedSubjectCode={selectedSubjectCode}
                config={DEFAULT_GRADING_CONFIG}
              />
              
              {showPlanner && (
                <Planner
                  subjects={subjects}
                  currentSgpa={result.sgpa}
                  config={DEFAULT_GRADING_CONFIG}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Subject Modal */}
      <AnimatePresence>
        {showAddSubjectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddSubjectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-white">{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h3>
                  <button
                    onClick={() => setShowAddSubjectModal(false)}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-gray-300 font-medium mb-2">
                    Subject Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 22ISE443"
                    value={newSubjectForm.code}
                    onChange={(e) => setNewSubjectForm({...newSubjectForm, code: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-2">
                    Subject Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Computer Graphics"
                    value={newSubjectForm.name}
                    onChange={(e) => setNewSubjectForm({...newSubjectForm, name: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">
                      CIE Marks
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={newSubjectForm.cie}
                      onChange={(e) => setNewSubjectForm({...newSubjectForm, cie: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">
                      SEE Marks
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newSubjectForm.see}
                      onChange={(e) => setNewSubjectForm({...newSubjectForm, see: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">
                      Credits
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newSubjectForm.credits}
                      onChange={(e) => setNewSubjectForm({...newSubjectForm, credits: parseInt(e.target.value) || 1})}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-700 flex gap-3">
                <button
                  onClick={handleSubmitSubject}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-all"
                >
                  {editingSubject ? 'Save Changes' : 'Add Subject'}
                </button>
                <button
                  onClick={() => setShowAddSubjectModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 text-white p-6 mt-12">
        <div className="container mx-auto text-center">
          <p className="text-sm text-gray-400">
            Smart CGPA Calculator v2.0
          </p>
          <p className="text-sm text-gray-300 mt-4">
            Made by <a 
              href="https://github.com/workwithaaditya" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
            >
              Aaditya
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
