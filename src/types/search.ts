/**
 * Search Interface Types
 * Shared types for SearchInterface and IframeSearchInterface components
 */

export interface SearchResult {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  videoUrl: string;
  officialScore?: number;
  duration?: string;
}

export interface SearchInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  showKeyboard: boolean;
  showSearchResults: boolean;
  onKeyboardInput: (key: string) => void;
  onVideoSelect: (video: SearchResult) => void;
  onBackToSearch: () => void;
  mode: "FREEPLAY" | "PAID";
  credits: number;
  onInsufficientCredits: () => void;
}
