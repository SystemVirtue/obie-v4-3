import React, { useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Loader2 } from "lucide-react";

interface PlaylistImportPopoverProps {
  isOpen: boolean;
  progress: number;
  error: string | null;
  onClose: () => void;
}

export const PlaylistImportPopover: React.FC<PlaylistImportPopoverProps> = ({
  isOpen,
  progress,
  error,
  onClose,
}) => {
  // Auto-hide error messages after 3 seconds
  useEffect(() => {
    if (error && isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, isOpen, onClose]);

  // Auto-hide success after import completes
  useEffect(() => {
    if (!error && progress >= 100 && isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [error, progress, isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in fade-in-0 slide-in-from-top-2 duration-300">
      <div className={`p-4 rounded-md border shadow-lg max-w-sm transition-all duration-200 ${
        error
          ? "bg-destructive/10 border-destructive text-destructive"
          : "bg-background border-border"
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {error ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          <span className="font-medium">
            {error ? "Import Error" : "Importing Playlist..."}
          </span>
        </div>

        {error ? (
          <p className="text-sm">{error}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Please wait while we load your playlist
            </p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {progress}% complete
            </p>
          </div>
        )}
      </div>
    </div>
  );
};