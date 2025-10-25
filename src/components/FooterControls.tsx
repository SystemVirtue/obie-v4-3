import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

/**
 * FooterControls Component
 * 
 * Displays the admin/settings button in the bottom-left corner.
 * Low opacity until hovered to avoid cluttering the interface.
 * 
 * Features:
 * - Fixed positioning at bottom-left
 * - Settings gear icon
 * - Low opacity (30%) until hover (100%)
 * - Responsive sizing
 * - Ghost button variant for minimal appearance
 */

interface FooterControlsProps {
  /**
   * Callback when admin button is clicked.
   * Should open the admin console/settings dialog.
   */
  onOpenAdmin: () => void;
}

export const FooterControls = ({ onOpenAdmin }: FooterControlsProps) => {
  return (
    <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4">
      <Button
        variant="ghost"
        onClick={() => {
          console.log("Opening admin console");
          onOpenAdmin();
        }}
        className="text-amber-200 hover:text-amber-100 opacity-30 hover:opacity-100 p-1 sm:p-2"
      >
        <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
      </Button>
    </div>
  );
};
