/**
 * Planner Component
 * 
 * Intelligent action planner showing:
 * - Per-subject minimal SEE to reach target SGPA
 * - Greedy global plan with step-by-step improvements
 * - Impossibility detection and best attainable SGPA
 */

import React, { useState } from 'react';
import {
  findMinimalSEEForTarget,
  greedyGlobalPlan,
  Subject,
  GradingConfig,
  DEFAULT_GRADING_CONFIG
} from '../lib/SGPAEngine';

interface PlannerProps {
  subjects: Subject[];
  currentSgpa: number;
  config?: GradingConfig;
}

export const Planner: React.FC<PlannerProps> = ({
  subjects,
  currentSgpa,
  config = DEFAULT_GRADING_CONFIG
}) => {
  const [targetSgpa, setTargetSgpa] = useState<string>('9.00');
  const [activeTab, setActiveTab] = useState<'single' | 'global'>('single');
  
  const targetValue = parseFloat(targetSgpa) || 9.0;
  
  // Calculate per-subject plans
  const subjectPlans = subjects.map(subject => 
    findMinimalSEEForTarget(subjects, subject.code, targetValue, config)
  );
  
  // Calculate global plan
  const globalPlan = greedyGlobalPlan(subjects, targetValue, config);
  
  return (
    <div className="planner-container bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Action Planner</h2>
      
      {/* Target SGPA Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Target SGPA
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="number"
            step="0.01"
            min="0"
            max="10"
            value={targetSgpa}
            onChange={(e) => setTargetSgpa(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-700 border-2 border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
          />
          <div className="text-sm">
            <span className="text-gray-400">Current: </span>
            <span className="font-bold text-blue-400">{currentSgpa}</span>
          </div>
        </div>
        
        {targetValue <= currentSgpa && (
          <div className="mt-2 p-3 bg-green-900/30 border-2 border-green-600/50 rounded-lg">
            <p className="text-green-300 font-medium">
              ✓ Target already achieved!
            </p>
          </div>
        )}
      </div>
      
      {/* Tabs */}
      <div className="flex space-x-2 mb-4 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('single')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'single'
              ? 'border-b-2 border-blue-500 text-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Per-Subject Plans
        </button>
        <button
          onClick={() => setActiveTab('global')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'global'
              ? 'border-b-2 border-blue-500 text-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Global Strategy
        </button>
      </div>
      
      {/* Per-Subject Plans */}
      {activeTab === 'single' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-300 mb-3">
            Minimal SEE needed for each subject individually to reach target SGPA
          </p>
          
          {subjectPlans.map((plan, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${
                plan.possible
                  ? 'bg-blue-900/20 border-blue-600/50'
                  : 'bg-gray-700/30 border-gray-600'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-white">{plan.name}</h4>
                  <p className="text-xs text-gray-400">{plan.code}</p>
                </div>
                {plan.possible ? (
                  <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">
                    Possible
                  </span>
                ) : (
                  <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">
                    Impossible
                  </span>
                )}
              </div>
              
              {plan.possible ? (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-gray-300">Current SEE:</span>
                    <span className="ml-1 font-bold text-white">{plan.currentSee}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Need SEE:</span>
                    <span className="ml-1 font-bold text-blue-400">
                      {plan.minSeeToReachTarget}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-300">Achieves:</span>
                    <span className="ml-1 font-bold text-green-400">
                      {plan.achievedSgpa.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  Cannot reach target by improving this subject alone
                </p>
              )}
              
              {plan.marginalGain > 0 && (
                <div className="mt-2 text-xs text-gray-400">
                  Marginal gain: +{plan.marginalGain.toFixed(4)} per SEE mark
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Global Plan */}
      {activeTab === 'global' && (
        <div>
          <p className="text-sm text-gray-300 mb-3">
            Greedy strategy: improve subjects with highest marginal gains
          </p>
          
          {globalPlan.targetReached ? (
            <div className="mb-4 p-4 bg-green-900/30 border-2 border-green-600/50 rounded-lg">
              <p className="font-semibold text-green-300">
                ✓ Target SGPA achievable!
              </p>
              <p className="text-sm text-green-400 mt-1">
                Final SGPA: {globalPlan.finalSgpa.toFixed(2)}
              </p>
            </div>
          ) : (
            <div className="mb-4 p-4 bg-red-900/30 border-2 border-red-600/50 rounded-lg">
              <p className="font-semibold text-red-300">
                ✗ Target SGPA not reachable
              </p>
              <p className="text-sm text-red-400 mt-1">
                Best attainable: {globalPlan.bestAttainableSgpa.toFixed(2)}
              </p>
            </div>
          )}
          
          {globalPlan.steps.length > 0 ? (
            <div className="space-y-2">
              <h4 className="font-semibold text-white mb-2">
                Recommended Steps:
              </h4>
              {globalPlan.steps.map((step, index) => (
                <div
                  key={index}
                  className="p-3 bg-blue-900/20 border border-blue-600/50 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-blue-300">
                        {index + 1}. {step.name}
                      </span>
                      <p className="text-xs text-gray-400">{step.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        <span className="text-gray-300">SEE: </span>
                        <span className="font-bold text-white">
                          {step.fromSee} → {step.toSee}
                        </span>
                        <span className="text-green-400 ml-1">
                          (+{step.increaseSeeBy})
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">
                        SGPA → {step.sgpaAfter.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-gray-700/30 border border-gray-600 rounded-lg text-center">
              <p className="text-gray-300">
                No improvements needed - target already met!
              </p>
            </div>
          )}
          
          <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
            <p className="text-xs text-yellow-300">
              <strong>Note:</strong> This is a greedy heuristic and may not be optimal.
              For guaranteed optimal solution, integer programming would be required.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
