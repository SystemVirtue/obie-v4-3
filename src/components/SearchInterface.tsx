import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { SearchInterfaceProps, SearchResult } from "@/types/search";
import { SearchKeyboard } from "@/components/SearchKeyboard";
import { VideoResultCard } from "@/components/VideoResultCard";
import { BackToSearchButton } from "@/components/BackToSearchButton";

export const SearchInterface: React.FC<SearchInterfaceProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  isSearching,
  showKeyboard,
  showSearchResults,
  onKeyboardInput,
  onVideoSelect,
  onBackToSearch,
  mode,
  credits,
  onInsufficientCredits,
}) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // 4 columns x 2 rows

  // Calculate pagination
  const totalPages = Math.max(
    1,
    Math.ceil(searchResults.length / itemsPerPage),
  );
  const paginatedResults = searchResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Reset to page 1 when new search results come in
  useEffect(() => {
    setCurrentPage(1);
  }, [searchResults]);

  const handleVideoSelect = (video: SearchResult) => {
    if (mode === "PAID" && credits === 0) {
      onInsufficientCredits();
      return;
    }
    onVideoSelect(video);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900/20 backdrop-blur-sm border-slate-600 max-w-[95vw] w-full sm:w-[1200px] h-[calc(100vh-50px)] sm:h-[calc(100vh-200px)] top-[25px] sm:top-[100px] translate-y-0 p-0">
        {/* Responsive close button */}
        <Button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 w-8 h-8 sm:w-12 sm:h-12 bg-red-600/80 hover:bg-red-700/80 border-2 border-red-500 shadow-lg"
          style={{ filter: "drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))" }}
        >
          <X className="w-4 h-4 sm:w-6 sm:h-6" />
        </Button>

        {showKeyboard && (
          <SearchKeyboard
            searchQuery={searchQuery}
            onSearchQueryChange={onSearchQueryChange}
            onKeyPress={onKeyboardInput}
          />
        )}

        {showSearchResults && (
          <div className="h-full bg-slate-900/20 backdrop-blur-sm text-white flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/60 backdrop-blur">
              <BackToSearchButton onClick={onBackToSearch} />
            </div>

            {isSearching ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-2xl text-amber-200">Searching...</div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div
                  className="flex-1 overflow-y-auto p-6 search-results-scrollable"
                  style={{
                    scrollbarWidth: "auto",
                    scrollbarColor: "#f59e0b #374151",
                  }}
                >
                  <style>{`
                    .search-results-scrollable::-webkit-scrollbar {
                      width: 20px;
                      display: block;
                    }
                    
                    .search-results-scrollable::-webkit-scrollbar-track {
                      background: #374151;
                      border-radius: 10px;
                    }
                    
                    .search-results-scrollable::-webkit-scrollbar-thumb {
                      background: #f59e0b;
                      border-radius: 10px;
                      border: 2px solid #374151;
                    }
                    
                    .search-results-scrollable::-webkit-scrollbar-thumb:hover {
                      background: #d97706;
                    }
                  `}</style>
                  <div className="grid grid-cols-4 gap-6">
                    {paginatedResults.map((video) => (
                      <VideoResultCard
                        key={video.id}
                        video={video}
                        onClick={handleVideoSelect}
                        variant="grid"
                      />
                    ))}
                  </div>
                  {/* Pagination Controls */}
                  <div className="flex justify-center items-center gap-4 mt-6">
                    <Button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-6 py-2 text-lg font-bold bg-black/60 text-white border-2 border-yellow-400 rounded shadow disabled:opacity-50"
                    >
                      Previous
                    </Button>
                    <span className="text-white text-lg font-bold">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-6 py-2 text-lg font-bold bg-black/60 text-white border-2 border-yellow-400 rounded shadow disabled:opacity-50"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
