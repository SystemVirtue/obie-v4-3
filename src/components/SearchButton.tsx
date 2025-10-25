import { Button } from "@/components/ui/button";

/**
 * SearchButton Component
 * 
 * Large, prominent button that opens the search interface.
 * Fixed position at bottom of screen with yellow border.
 * 
 * Features:
 * - Fixed positioning above footer (50px margin)
 * - Responsive sizing (smaller on mobile)
 * - Yellow border for visibility
 * - Musical note emojis
 * - Hover scale effect
 * - Drop shadow for depth
 * - Semi-transparent black background
 */

interface SearchButtonProps {
  /**
   * Callback when search button is clicked.
   * Should open the search interface and set appropriate state.
   */
  onClick: () => void;
}

export const SearchButton = ({ onClick }: SearchButtonProps) => {
  return (
    <div className="fixed bottom-[calc(2rem+50px)] left-4 right-4 sm:left-0 sm:right-0 flex justify-center z-20">
      <Button
        onClick={() => {
          console.log("Search button clicked - opening search interface");
          onClick();
        }}
        className="w-full max-w-96 h-16 sm:h-24 text-xl sm:text-3xl font-bold bg-black/60 text-white shadow-lg border-2 sm:border-4 border-yellow-400 rounded-lg transform hover:scale-105 transition-all duration-200 relative overflow-hidden"
        style={{ filter: "drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))" }}
      >
        <span
          className="absolute inset-0 bg-black/60 pointer-events-none"
          style={{ zIndex: 0 }}
        ></span>
        <span className="relative z-10">🎵 Search for Music 🎵</span>
      </Button>
    </div>
  );
};
