/**
 * SubjectCard Component
 * 
 * Displays a single subject with CIE, interactive SEE slider,
 * and real-time statistics (Total, GP, Weighted Points).
 */

import React, { useState } from 'react';
import { MoreVertical, Trash2, Edit } from 'lucide-react';
import { SubjectSlider } from './SubjectSlider';
import {
  calculateTotal,
  scaleSEE,
  gpForTotal,
  calculateSGPA,
  DEFAULT_GRADING_CONFIG,
  GradingConfig,
  Subject
} from '../lib/SGPAEngine';

interface SubjectCardProps {
  subject: Subject;
  onSeeChange: (newSee: number) => void;
  onRemove: () => void;
  onEdit: () => void;
  allSubjects: Subject[];
  config?: GradingConfig;
  currentSgpa?: number;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  onSeeChange,
  onRemove,
  onEdit,
  allSubjects,
  config = DEFAULT_GRADING_CONFIG,
  currentSgpa
}) => {
  const { code, name, cie, see, credits } = subject;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Calculate current stats
  const seeScaled = scaleSEE(see, config);
  const total = calculateTotal(cie, see, config);
  const gp = gpForTotal(total, config);
  
  // Calculate max SGPA if this subject gets SEE = 100
  const maxSubjects = allSubjects.map(s => 
    s.code === code ? { ...s, see: config.maxSEE } : s
  );
  const maxResult = calculateSGPA(maxSubjects, config);
  
  const cardAccent = gp >= 9 ? 'from-green-900/40 via-green-800/30 to-green-700/30' :
                     gp >= 8 ? 'from-blue-900/40 via-blue-800/30 to-blue-700/30' :
                     gp >= 7 ? 'from-purple-900/40 via-purple-800/30 to-purple-700/30' :
                     gp >= 6 ? 'from-amber-900/40 via-amber-800/30 to-amber-700/30' :
                               'from-red-900/40 via-red-800/30 to-red-700/30';
  return (
    <div className={`subject-card bg-gradient-to-br ${cardAccent} backdrop-blur-sm rounded-2xl shadow-md p-6 transition-colors duration-300 relative focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 outline-none`}>      
      {/* Unified header without overlap */}
      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[140px]">
          {(() => {
            const words = name.toLowerCase().split(/\s+/).filter(Boolean);
            const isLab = words[words.length - 1] === 'lab';
            const coreWords = isLab ? words.slice(0, -1) : words;
            const acronym = coreWords.map(w => w[0].toUpperCase()).join('');
            const display = isLab ? `${acronym} Lab` : acronym;
            return (
              <>
                <h3 className="text-xl font-semibold text-white tracking-wide leading-tight" title={name}>{display}</h3>
                <p className="text-xs text-gray-300" title={code}>{code}</p>
              </>
            );
          })()}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1 rounded-full text-xs font-semibold bg-black/25 text-white">
            {credits} Cr
          </div>
          {currentSgpa !== undefined && (
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-black/30 text-white">
              SGPA {currentSgpa}
            </div>
          )}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-black/30 transition-colors"
              aria-label="Subject actions"
            >
              <MoreVertical size={18} className="text-gray-200" />
            </button>
            {isMenuOpen && (
              <div
                className="absolute top-full right-0 mt-2 w-40 bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl z-10"
                onMouseLeave={() => setIsMenuOpen(false)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-200 hover:bg-blue-600/40 transition-colors"
                >
                  <Edit size={16} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-red-400 hover:bg-red-600/40 transition-colors"
                >
                  <Trash2 size={16} />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Grade Point above slider */}
      <div className="flex items-center justify-between mb-2">
        <div className="px-3 py-1 rounded-md bg-black/30 text-white text-sm font-semibold tracking-wide">
          GP: {gp}
        </div>
        <div className="text-xs text-gray-400">
          CIE {cie}/{config.maxCIE}
        </div>
      </div>
      {/* SEE Slider */}
      <div className="mb-4">
        <SubjectSlider
          subjectName={name}
          cie={cie}
          see={see}
          onSeeChange={onSeeChange}
          config={config}
        />
        {/* Marks below slider */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-700/30 rounded-md py-2">
            <div className="text-[10px] uppercase tracking-wider text-gray-400">SEE</div>
            <div className="text-sm font-semibold text-white">{see}</div>
          </div>
          <div className="bg-gray-700/30 rounded-md py-2">
            <div className="text-[10px] uppercase tracking-wider text-gray-400">SEE Scaled</div>
            <div className="text-sm font-semibold text-white">{seeScaled.toFixed(1)}</div>
          </div>
            <div className="bg-gray-700/30 rounded-md py-2">
              <div className="text-[10px] uppercase tracking-wider text-gray-400">Total</div>
              <div className="text-sm font-semibold text-white">{total.toFixed(1)}</div>
            </div>
        </div>
      </div>

      {/* Collapse toggle positioned below slider */}
      <button
        onClick={() => setShowDetails(d => !d)}
        className="w-full mb-3 text-left text-sm px-3 py-2 rounded-md bg-gray-700/30 hover:bg-gray-600/40 text-gray-200 font-medium transition-colors"
      >
        {showDetails ? 'Hide Details' : 'Show More'}
      </button>

      {showDetails && (
        <div className="mb-4 p-3 bg-gray-700/30 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-300">Internal (CIE)</span>
            <span className="text-lg font-bold text-white">
              {cie} / {config.maxCIE}
            </span>
          </div>
        </div>
      )}
      
      {showDetails && (
        <>
          {/* Stats Grid (remaining: Weighted & Max SGPA context) */}
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="stat-box bg-gray-700/30 p-3 rounded-lg">
              <div className="text-xs text-gray-400 font-medium">Weighted (GP×Cr)</div>
              <div className="text-xl font-bold text-white">{(gp * credits).toFixed(1)}</div>
            </div>
            <div className="stat-box bg-gray-700/30 p-3 rounded-lg">
              <div className="text-xs text-gray-400 font-medium">Credits</div>
              <div className="text-xl font-bold text-white">{credits}</div>
            </div>
          </div>
          {/* Max SGPA (neutral styling) */}
          <div className="mt-4 p-3 bg-gray-700/30 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-300">
                Max Possible SGPA if SEE = 100
              </span>
              <span className="text-lg font-bold text-white">
                {maxResult.sgpa}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
