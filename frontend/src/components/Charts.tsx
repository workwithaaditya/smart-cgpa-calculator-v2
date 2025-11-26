/**
 * Charts Component
 * 
 * Provides visualizations:
 * - Line chart: SEE → SGPA for selected subject
 * - Pareto bar: Marginal SGPA gain per +1 SEE
 * - Pairwise heatmap: SEE_a vs SEE_b → SGPA
 */

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  generateSGPACurve,
  calculateMarginalGains,
  Subject,
  GradingConfig,
  DEFAULT_GRADING_CONFIG
} from '../lib/SGPAEngine';

interface ChartsProps {
  subjects: Subject[];
  selectedSubjectCode?: string;
  config?: GradingConfig;
}

export const Charts: React.FC<ChartsProps> = ({
  subjects,
  selectedSubjectCode,
  config = DEFAULT_GRADING_CONFIG
}) => {
  // Generate line chart data
  const lineData = selectedSubjectCode
    ? generateSGPACurve(subjects, selectedSubjectCode, 2, config)
    : [];
  
  // Generate marginal gains data
  const marginalData = calculateMarginalGains(subjects, config).map(item => ({
    name: item.code,
    gain: item.marginalGain,
    fullName: item.name
  }));
  
  // Sort by gain descending for Pareto effect
  marginalData.sort((a, b) => b.gain - a.gain);
  
  // Color scale for bars
  const getBarColor = (gain: number) => {
    if (gain > 0.05) return '#10b981'; // green
    if (gain > 0.01) return '#3b82f6'; // blue
    if (gain > 0) return '#f59e0b'; // amber
    return '#6b7280'; // gray
  };
  
  return (
    <div className="charts-container space-y-6">
      {/* Line Chart: SEE → SGPA */}
      {selectedSubjectCode && lineData.length > 0 && (
        <div className="chart-box bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            SEE Impact on SGPA: {subjects.find(s => s.code === selectedSubjectCode)?.name}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="see" 
                stroke="#9ca3af"
                label={{ value: 'SEE Marks', position: 'insideBottom', offset: -5, fill: '#9ca3af' }}
              />
              <YAxis 
                domain={['auto', 'auto']}
                stroke="#9ca3af"
                label={{ value: 'SGPA', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#e5e7eb' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-gray-800 p-3 border border-gray-600 rounded shadow-lg">
                        <p className="font-semibold text-white">SEE: {data.see}</p>
                        <p className="text-blue-400">SGPA: {data.sgpa}</p>
                        <p className="text-gray-300">GP: {data.gp}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ color: '#e5e7eb' }} />
              <Line 
                type="stepAfter" 
                dataKey="sgpa" 
                stroke="#60a5fa" 
                strokeWidth={3}
                dot={false}
                name="SGPA"
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Step changes occur at grade boundaries
          </p>
        </div>
      )}
      
      {/* Pareto Bar Chart: Marginal Gains */}
      <div className="chart-box bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">
          Marginal SGPA Gain per +1 SEE
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={marginalData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="name"
              stroke="#9ca3af"
              label={{ value: 'Subject', position: 'insideBottom', offset: -5, fill: '#9ca3af' }}
            />
            <YAxis 
              stroke="#9ca3af"
              label={{ value: 'SGPA Gain', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-gray-800 p-3 border border-gray-600 rounded shadow-lg">
                      <p className="font-semibold text-white">{data.fullName}</p>
                      <p className="text-green-400">Gain: +{data.gain.toFixed(4)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="gain" name="SGPA Gain">
              {marginalData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.gain)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Focus on subjects with highest marginal gains for maximum SGPA improvement
        </p>
      </div>
      
      {/* Instructions if no subject selected */}
      {!selectedSubjectCode && (
        <div className="bg-blue-900/30 border-2 border-blue-600/50 rounded-lg p-6 text-center">
          <p className="text-blue-300 font-medium">
            Select a subject to view detailed SEE → SGPA curve
          </p>
        </div>
      )}
    </div>
  );
};
