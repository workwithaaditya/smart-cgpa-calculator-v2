/**
 * SubjectSlider Component
 * 
 * Interactive slider with segmented grade bands, critical markers,
 * and smooth animations for crossing grade boundaries.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  calculateCriticalSEEValues,
  getGradeBandForSEE,
  DEFAULT_GRADING_CONFIG,
  GradingConfig
} from '../lib/SGPAEngine';

interface SubjectSliderProps {
  subjectName: string;
  cie: number;
  see: number;
  onSeeChange: (see: number) => void;
  config?: GradingConfig;
  disabled?: boolean;
}

interface ToastMessage {
  text: string;
  visible: boolean;
}

export const SubjectSlider: React.FC<SubjectSliderProps> = ({
  subjectName,
  cie,
  see,
  onSeeChange,
  config = DEFAULT_GRADING_CONFIG,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [handleHover, setHandleHover] = useState(false);
  const [toast, setToast] = useState<ToastMessage>({ text: '', visible: false });
  const [previousGP, setPreviousGP] = useState<number>(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  
  // Calculate critical SEE markers
  const criticalValues = calculateCriticalSEEValues(cie, config);
  const currentBand = getGradeBandForSEE(cie, see, config);
  
  useEffect(() => {
    const currentGP = getGradeBandForSEE(cie, see, config).gp;
    if (previousGP !== 0 && currentGP !== previousGP) {
      // GP changed - show toast
      const direction = currentGP > previousGP ? '↑' : '↓';
      setToast({
        text: `Grade ${direction}: GP ${previousGP} → ${currentGP}`,
        visible: true
      });
      
      setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 2000);
    }
    setPreviousGP(currentGP);
  }, [see, cie, config, previousGP]);
  
  // Snap (magnetic) to nearby critical SEE values within threshold
  const SNAP_THRESHOLD = 1; // marks within 1 SEE point will snap
  const handleSeeChange = useCallback((newSee: number) => {
    // Find reachable critical value within threshold
    let target = newSee;
    for (const c of criticalValues) {
      if (!c.reachable) continue;
      const diff = Math.abs(c.seeCrit - newSee);
      if (diff <= SNAP_THRESHOLD) {
        target = c.seeCrit; // snap to marker
        break;
      }
    }
    const clampedSee = Math.max(0, Math.min(config.maxSEE, Math.round(target)));
    onSeeChange(clampedSee);
  }, [onSeeChange, config.maxSEE, criticalValues]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newSee = percent * config.maxSEE;
    
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    
    requestRef.current = requestAnimationFrame(() => {
      handleSeeChange(newSee);
    });
  }, [isDragging, handleSeeChange, config.maxSEE]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    setIsDragging(true);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    handleSeeChange(percent * config.maxSEE);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    
    let delta = 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      delta = e.shiftKey ? 5 : 1;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      delta = e.shiftKey ? -5 : -1;
    } else if (e.key === 'Home') {
      handleSeeChange(0);
      return;
    } else if (e.key === 'End') {
      handleSeeChange(config.maxSEE);
      return;
    }
    
    if (delta !== 0) {
      e.preventDefault();
      handleSeeChange(see + delta);
    }
  };
  
  // Generate gradient for grade bands
  const generateGradient = () => {
    // Sort reachable critical values (grade change boundaries)
    const sortedCriticals = [...criticalValues]
      .filter(c => c.reachable)
      .sort((a, b) => a.seeCrit - b.seeCrit);

    // Build boundary list including 0 and maxSEE
    const boundaries = [0, ...sortedCriticals.map(c => c.seeCrit), config.maxSEE];
    const boundaryPercents = boundaries.map(b => (b / config.maxSEE) * 100);

    // Color palette ordered from low → high grade
    let colors = [
      '#991b1b', // F - dark red
      '#ef4444', // C - red
      '#f59e0b', // B - amber
      '#8b5cf6', // B+ - purple
      '#3b82f6', // A - blue
      '#10b981', // O - green
      '#10b981'  // Extra final to ensure length if needed
    ];

    // Ensure we have at least as many colors as boundaries
    if (colors.length < boundaryPercents.length) {
      const last = colors[colors.length - 1];
      while (colors.length < boundaryPercents.length) colors.push(last);
    } else if (colors.length > boundaryPercents.length) {
      colors = colors.slice(0, boundaryPercents.length);
    }

    // Construct gradient stops: each boundary gets its color.
    // CSS will smoothly interpolate between consecutive stops.
    const stops: string[] = boundaryPercents.map((pct, i) => `${colors[i]} ${pct}%`);

    return `linear-gradient(90deg, ${stops.join(', ')})`;
  };
  
  const percent = (see / config.maxSEE) * 100;
  
  return (
    <div className="subject-slider w-full">
      {/* Toast notification */}
      {toast.visible && (
        <div className="toast-notification absolute -top-10 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse z-10">
          {toast.text}
        </div>
      )}
      
      {/* Extra space for top labels */}
      <div className="h-8 mb-1"></div>
      
      {/* Slider track */}
      <div
        ref={sliderRef}
        className={`relative h-12 rounded-lg cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ background: generateGradient() }}
        onMouseDown={handleMouseDown}
        role="slider"
        aria-label={`SEE marks for ${subjectName}`}
        aria-valuemin={0}
        aria-valuemax={config.maxSEE}
        aria-valuenow={see}
        aria-valuetext={`${see} out of ${config.maxSEE}`}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
      >
        {/* Critical markers (minimal: no vertical line, neutral GP pill) */}
        {criticalValues.map((critical, index) => (
          critical.reachable && (
            <button
              key={index}
              type="button"
              onClick={(e) => { e.stopPropagation(); handleSeeChange(critical.seeCrit); }}
              className="absolute top-0 bottom-0 flex flex-col items-center focus:outline-none group"
              style={{ left: `${(critical.seeCrit / config.maxSEE) * 100}%` }}
              title={`Click to snap: SEE ${Math.round(critical.seeCrit)} → GP ${critical.gp}`}
            >
              {/* SEE number label at top */}
              <div className="absolute -top-7 bg-transparent backdrop-blur-sm text-gray-100 px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-md whitespace-nowrap border border-black/60 group-hover:bg-black/30">
                {Math.round(critical.seeCrit)}
              </div>
              {/* GP label (neutral) */}
              <div className="absolute -bottom-6 bg-transparent backdrop-blur-sm text-gray-100 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border border-black/60 group-hover:bg-black/30">
                GP{critical.gp}
              </div>
            </button>
          )
        ))}
        
        {/* Slider handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-blue-500/30 backdrop-blur-sm shadow-lg transition-all hover:scale-110 z-10 border border-black/70"
          style={{ left: `${percent}%` }}
          onMouseEnter={() => setHandleHover(true)}
          onMouseLeave={() => setHandleHover(false)}
        >
          {(isDragging || handleHover) && (
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-transparent backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-xl border border-black/70">
              {see}
            </div>
          )}
        </div>
      </div>
      
      {/* Extra space for bottom labels */}
      <div className="h-8 mt-1"></div>
      
      {/* Legend */}
      <div className="flex justify-between text-[11px] text-gray-300">
        <span>0</span>
        <span className="font-semibold text-white">GP {currentBand.gp} ({currentBand.label})</span>
        <span>{config.maxSEE}</span>
      </div>
    </div>
  );
};
