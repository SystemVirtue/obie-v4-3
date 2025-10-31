import React from 'react';
import { Button } from '@/components/ui/button';
import { Monitor, Tv } from 'lucide-react';
import { DisplayInfo } from '@/services/displayManager';

interface DisplayButtonGridProps {
  displays: DisplayInfo[];
  selectedDisplay: string;
  onDisplaySelect: (displayId: string) => void;
  disabled?: boolean;
}

export const DisplayButtonGrid: React.FC<DisplayButtonGridProps> = ({
  displays,
  selectedDisplay,
  onDisplaySelect,
  disabled = false,
}) => {
  // Calculate aspect ratios and create buttons
  const displayButtons = displays.map((display) => {
    const aspectRatio = display.width / display.height;
    const isSelected = selectedDisplay === display.id;

    // Create a button with the display's aspect ratio
    // Max width of 120px, height calculated from aspect ratio
    const maxWidth = 120;
    const height = maxWidth / aspectRatio;

    return (
      <Button
        key={display.id}
        variant={isSelected ? "default" : "outline"}
        className={`
          relative p-0 overflow-hidden transition-all duration-200
          ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          width: `${maxWidth}px`,
          height: `${height}px`,
          aspectRatio: `${aspectRatio}`,
        }}
        onClick={() => !disabled && onDisplaySelect(display.id)}
        disabled={disabled}
      >
        {/* Background with subtle gradient */}
        <div className={`
          absolute inset-0 flex items-center justify-center
          ${isSelected ? 'bg-blue-600' : 'bg-gray-100 hover:bg-gray-200'}
          transition-colors duration-200
        `}>
          {/* Display icon */}
          <div className="flex flex-col items-center justify-center text-center p-1">
            {display.isPrimary ? (
              <Tv className={`w-4 h-4 mb-1 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
            ) : (
              <Monitor className={`w-4 h-4 mb-1 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
            )}

            {/* Display name - truncate if too long */}
            <span className={`
              text-xs font-medium leading-tight
              ${isSelected ? 'text-white' : 'text-gray-700'}
              max-w-full overflow-hidden text-ellipsis
            `}>
              {display.name.length > 8 ? `${display.name.substring(0, 8)}...` : display.name}
            </span>

            {/* Resolution */}
            <span className={`
              text-xs leading-tight
              ${isSelected ? 'text-blue-100' : 'text-gray-500'}
            `}>
              {display.width}×{display.height}
            </span>
          </div>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full shadow-sm" />
        )}
      </Button>
    );
  });

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700">
        Select Display:
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        {displayButtons}
      </div>

      {displays.length === 0 && (
        <div className="text-center text-gray-500 text-sm py-4">
          No displays detected
        </div>
      )}
    </div>
  );
};