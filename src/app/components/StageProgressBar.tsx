import React from 'react';

interface Stage {
  id: string;
  label: string;
  fullLabel?: string;
  category: string;
}

interface StageProgressBarProps {
  stages: Stage[];
  currentStage: string;
  onStageChange: (stage: Stage) => void;
}

export const StageProgressBar: React.FC<StageProgressBarProps> = ({
  stages,
  currentStage,
  onStageChange,
}) => {
  // Find the index of the current stage
  const currentIndex = stages.findIndex(
    (stage) => stage.label === currentStage || stage.fullLabel === currentStage
  );

  return (
    <div className="flex items-center gap-1 w-full max-w-xs mx-auto">
      {stages.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isUpcoming = index > currentIndex;

        return (
          <div
            key={stage.id}
            className="flex-1 group relative"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStageChange(stage);
              }}
              className="w-full h-2 rounded-full transition-all duration-200 cursor-pointer relative overflow-hidden"
              style={{
                backgroundColor: isCompleted || isCurrent ? '#0EA5E9' : '#E5E7EB',
                opacity: isCurrent ? 1 : isCompleted ? 0.8 : 0.5,
                border: isCurrent ? '2px solid #0284C7' : 'none',
                transform: isCurrent ? 'scaleY(1.4)' : 'scaleY(1)',
              }}
              title={stage.label}
              aria-label={`Stage: ${stage.label}`}
            >
              {/* Hover effect overlay */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-150"
                style={{ backgroundColor: '#FFFFFF' }}
              />
            </button>

            {/* Tooltip on hover */}
            <div
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              {stage.label.includes(':') ? stage.label.split(': ')[1] : stage.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};
