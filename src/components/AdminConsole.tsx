import React, { useRef, useState, useEffect } from "react";
import { youtubeQuotaService, QuotaUsage } from "@/services/youtube/api";
import { testApiKey, ApiKeyTestResult } from "@/utils/apiKeyTester";
import { apiKeyRotation } from "@/services/youtube/api/keyRotation";
import { displayManager } from "@/services/displayManager";
import type { DisplayInfo, PlaylistItem } from "../types/jukebox";
import { SearchMethod } from "@/services/youtube/search";
import { AdminConsoleHealthCheck } from "@/components/AdminConsoleHealthCheck";
import { PlaylistManager } from "@/components/PlaylistManager";
import { SettingsPanel } from "@/components/SettingsPanel";
import { PlayerControlsPanel } from "@/components/PlayerControlsPanel";
import { VideoSettingsPanel } from "@/components/VideoSettingsPanel";
import { ApiManagementPanel } from "@/components/ApiManagementPanel";
import { LogsPanel } from "@/components/LogsPanel";
import { SettingsManagementPanel } from "@/components/SettingsManagementPanel";
import { DisplayButtonGrid } from "@/components/DisplayButtonGrid";
import { BackgroundAssetsPanel } from "@/components/BackgroundAssetsPanel";
import { BackgroundSettingsPanel } from "@/components/BackgroundSettingsPanel";
import { BackgroundAssetsErrorBoundary } from "@/components/BackgroundAssetsErrorBoundary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  Play,
  Pause,
  SkipForward,
  Download,
  List,
  GripVertical,
  X,
  Shuffle,
  Clock,
  Users,
  Monitor,
  Timer,
  Coins,
  Settings2,
  ExternalLink,
  Maximize,
  Minimize,
  Activity,
  ListMusic,
} from "lucide-react";

/**
 * CHANGELOG - Phase 3 Integration
 * ADDED: Imports for AdminConsoleHealthCheck and PlaylistManager
 * ADDED: Icons for new sections (Activity, ListMusic)
 */

// Helper function to clean title text by removing content in brackets
const cleanTitle = (title: string): string => {
  return title.replace(/\([^)]*\)/g, "").trim();
};

interface LogEntry {
  timestamp: string;
  type: "SONG_PLAYED" | "USER_SELECTION" | "CREDIT_ADDED" | "CREDIT_REMOVED";
  description: string;
  videoId?: string;
  creditAmount?: number;
}

interface UserRequest {
  timestamp: string;
  title: string;
  videoId: string;
  channelTitle: string;
}

interface CreditHistory {
  timestamp: string;
  amount: number;
  type: "ADDED" | "REMOVED";
  description: string;
}

interface PlaylistInfo {
  id: string;
  title: string;
}

interface BackgroundFile {
  id: string;
  name: string;
  url: string;
  type: "image" | "video";
}

interface QueuedRequest {
  id: string;
  title: string;
  channelTitle: string;
  videoId: string;
  timestamp: string;
}

interface AdminConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "FREEPLAY" | "PAID";
  onModeChange: (mode: "FREEPLAY" | "PAID") => void;
  credits: number;
  onCreditsChange: (credits: number) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  selectedApiKeyOption: string;
  onApiKeyOptionChange: (option: string) => void;
  customApiKey: string;
  onCustomApiKeyChange: (key: string) => void;
  autoRotateApiKeys: boolean;
  onAutoRotateChange: (enabled: boolean) => void;
  rotationHistory: Array<{
    timestamp: string;
    from: string;
    to: string;
    reason: string;
  }>;
  lastRotationTime: string;
  searchMethod: SearchMethod;
  onSearchMethodChange: (method: SearchMethod) => void;
  selectedCoinAcceptor: string;
  onCoinAcceptorChange: (device: string) => void;
  logs: LogEntry[];
  userRequests: UserRequest[];
  creditHistory: CreditHistory[];
  backgrounds: BackgroundFile[];
  selectedBackground: string;
  onBackgroundChange: (id: string) => void;
  cycleBackgrounds: boolean;
  onCycleBackgroundsChange: (cycle: boolean) => void;
  bounceVideos: boolean;
  onBounceVideosChange: (bounce: boolean) => void;
  backgroundQueue: BackgroundQueueItem[];
  onAddToBackgroundQueue: (assetId: string) => void;
  onRemoveFromBackgroundQueue: (queueId: string) => void;
  onReorderBackgroundQueue: (fromIndex: number, toIndex: number) => void;
  onUpdateBackgroundQueueItem?: (queueId: string, updates: Partial<BackgroundQueueItem>) => void;
  onTestBackgroundQueue?: () => void;
  isTestingBackgroundQueue?: boolean;
  currentTestIndex?: number;
  backgroundSettings: BackgroundSettings;
  onBackgroundSettingsChange: (settings: BackgroundSettings) => void;
  onBackgroundUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAddLog: (
    type: LogEntry["type"],
    description: string,
    videoId?: string,
    creditAmount?: number,
  ) => void;
  onAddUserRequest: (
    title: string,
    videoId: string,
    channelTitle: string,
  ) => void;
  onAddCreditHistory: (
    amount: number,
    type: "ADDED" | "REMOVED",
    description: string,
  ) => void;
  playerWindow: Window | null;
  isPlayerRunning: boolean;
  isPlayerPaused: boolean;
  onPlayerToggle: () => void;
  onSkipSong: () => void;
  onInitializePlayer: () => void;
  maxSongLength: number;
  onMaxSongLengthChange: (minutes: number) => void;
  defaultPlaylist: string;
  onDefaultPlaylistChange: (playlistId: string) => void;
  currentPlaylistVideos: PlaylistItem[];
  onPlaylistReorder?: (newPlaylist: PlaylistItem[]) => void;
  onPlaylistShuffle?: () => void;
  currentlyPlaying: string;
  priorityQueue: QueuedRequest[];
  showMiniPlayer: boolean;
  onShowMiniPlayerChange: (show: boolean) => void;
  testMode: boolean;
  onTestModeChange: (testMode: boolean) => void;
  coinValueA: number;
  onCoinValueAChange: (value: number) => void;
  coinValueB: number;
  onCoinValueBChange: (value: number) => void;
  videoQuality: "auto" | "hd1080" | "hd720" | "large" | "medium" | "small";
  onVideoQualityChange: (quality: "auto" | "hd1080" | "hd720" | "large" | "medium" | "small") => void;
  hideEndCards: boolean;
  onHideEndCardsChange: (hide: boolean) => void;
  adaptiveQualityEnabled: boolean;
  onAdaptiveQualityEnabledChange: (enabled: boolean) => void;
  selectedDisplay: string;
  onSelectedDisplayChange: (display: string) => void;
  useFullscreen: boolean;
  onUseFullscreenChange: (fullscreen: boolean) => void;
  autoDetectDisplay: boolean;
  onAutoDetectDisplayChange: (autoDetect: boolean) => void;
  showDisplaySelectionDialogOnStartup: boolean;
  onShowDisplaySelectionDialogOnStartupChange: (show: boolean) => void;
  backgroundQueue: BackgroundQueueItem[];
  onAddToBackgroundQueue: (assetId: string) => void;
  onRemoveFromBackgroundQueue: (queueId: string) => void;
  onReorderBackgroundQueue: (fromIndex: number, toIndex: number) => void;
  backgroundSettings: BackgroundSettings;
  onBackgroundSettingsChange: (settings: BackgroundSettings) => void;
  bgVisualMode: "random" | "images-only" | "videos-only" | "custom-queue";
  onBgVisualModeChange: (mode: "random" | "images-only" | "videos-only" | "custom-queue") => void;
  isImportingPlaylist?: boolean;
}

const AVAILABLE_PLAYLISTS: PlaylistInfo[] = [
  { id: "PLJ7vMjpVbhBWLWJpweVDki43Wlcqzsqdu", title: "DJAMMMS Default Playlist" },
  { id: "PLN9QqCogPsXIoSObV0F39OZ_MlRZ9tRT9", title: "Obie Nights" },
  { id: "PLN9QqCogPsXJCgeL_iEgYnW6Rl_8nIUUH", title: "Obie Playlist" },
  { id: "PLN9QqCogPsXIkPh6xm7cxSN9yTVaEoj0j", title: "Obie Jo" },
  { id: "PLN9QqCogPsXLAtgvLQ0tvpLv820R7PQsM", title: "Karaoke" },
  { id: "PLN9QqCogPsXLsv5D5ZswnOSnRIbGU80IS", title: "Poly" },
  { id: "PLN9QqCogPsXIqfwdfe4hf3qWM1mFweAXP", title: "Obie Johno" },
];

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  isOpen,
  onClose,
  mode,
  onModeChange,
  credits,
  onCreditsChange,
  apiKey,
  onApiKeyChange,
  selectedApiKeyOption,
  onApiKeyOptionChange,
  customApiKey,
  onCustomApiKeyChange,
  autoRotateApiKeys,
  onAutoRotateChange,
  rotationHistory,
  lastRotationTime,
  searchMethod,
  onSearchMethodChange,
  selectedCoinAcceptor,
  onCoinAcceptorChange,
  logs,
  userRequests,
  creditHistory,
  backgrounds,
  selectedBackground,
  onBackgroundChange,
  cycleBackgrounds,
  onCycleBackgroundsChange,
  bounceVideos,
  onBounceVideosChange,
  backgroundQueue,
  onAddToBackgroundQueue,
  onRemoveFromBackgroundQueue,
  onReorderBackgroundQueue,
  onUpdateBackgroundQueueItem,
  onTestBackgroundQueue,
  isTestingBackgroundQueue,
  currentTestIndex,
  backgroundSettings,
  onBackgroundSettingsChange,
  bgVisualMode,
  onBgVisualModeChange,
  onBackgroundUpload,
  onAddLog,
  onAddUserRequest,
  onAddCreditHistory,
  playerWindow,
  isPlayerRunning,
  isPlayerPaused,
  onPlayerToggle,
  onSkipSong,
  onInitializePlayer,
  maxSongLength,
  onMaxSongLengthChange,
  defaultPlaylist,
  onDefaultPlaylistChange,
  currentPlaylistVideos,
  onPlaylistReorder,
  onPlaylistShuffle,
  currentlyPlaying,
  priorityQueue,
  showMiniPlayer,
  onShowMiniPlayerChange,
  testMode,
  onTestModeChange,
  coinValueA,
  onCoinValueAChange,
  coinValueB,
  onCoinValueBChange,
  videoQuality,
  onVideoQualityChange,
  hideEndCards,
  onHideEndCardsChange,
  adaptiveQualityEnabled,
  onAdaptiveQualityEnabledChange,
  selectedDisplay,
  onSelectedDisplayChange,
  useFullscreen,
  onUseFullscreenChange,
  autoDetectDisplay,
  onAutoDetectDisplayChange,
  showDisplaySelectionDialogOnStartup,
  onShowDisplaySelectionDialogOnStartupChange,
  isImportingPlaylist,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);
  const [quotaUsage, setQuotaUsage] = useState<QuotaUsage>({
    used: 0,
    limit: 10000,
    percentage: 0,
    lastUpdated: "",
  });
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [apiKeyTestResult, setApiKeyTestResult] =
    useState<ApiKeyTestResult | null>(null);
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [hasCheckedQuota, setHasCheckedQuota] = useState(false);
  const [validApiKeys, setValidApiKeys] = useState<Array<{ key: string; option: string; quotaPercentage: number }>>([]);
  const [validatingKeys, setValidatingKeys] = useState(false);

  // Load valid API keys from localStorage on component mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('VALID_API_KEYS');
      if (stored) {
        const parsedKeys = JSON.parse(stored);
        setValidApiKeys(parsedKeys);
      }
    } catch (error) {
      console.error('Error loading valid API keys from localStorage:', error);
    }
  }, []);

  // Auto-validate keys when admin panel opens (only once per session)
  useEffect(() => {
    if (isOpen && validApiKeys.length === 0 && !validatingKeys) {
      console.log('[AdminConsole] Auto-validating API keys on panel open...');
      handleValidateAllKeys();
    }
  }, [isOpen]); // Only depend on isOpen to avoid infinite loops

  // API Key mappings
  const API_KEY_OPTIONS = {
    key1: "AIzaSyC12QKbzGaKZw9VD3-ulxU_mrd0htZBiI4",
    key2: "AIzaSyDQ_Jx4Dwje2snQisj7hEFVK9lJJ0tptcc",
    key3: "AIzaSyDy6_QI9SP5nOZRVoNa5xghSHtY3YWX5kU",
    key4: "AIzaSyCPAY_ukeGnAGJdCvYk1bVVDxZjQRJqsdk",
    key5: "AIzaSyD7iB_2dHUu9yS87WD4wMbkJQduibU5vco",
    key6: "AIzaSyCgtXTfFuUiiBsNXH6z_k9-GiCqiS0Cgso",
    key7: "AIzaSyCKHHGkaztp8tfs2BVxiny0InE_z-kGDtY",
    key8: "AIzaSyBGcwaCm70o4ir0CKcNIJ0V_7TeyY2cwdA",
    custom: customApiKey,
  };

  // Only load quota usage when user manually opens admin panel and has valid key
  // Don't auto-check quota on every API key change to prevent errors
  useEffect(() => {
    // Only check quota if admin panel was manually opened and we haven't checked yet
    if (
      isOpen &&
      !hasCheckedQuota &&
      apiKey &&
      apiKey.startsWith("AIza") &&
      apiKey.length >= 20
    ) {
      console.log("[AdminConsole] Checking quota for first time after opening");
      setHasCheckedQuota(true);
      // Add a small delay to prevent immediate quota checks
      const timer = setTimeout(() => {
        handleRefreshQuota();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, hasCheckedQuota]); // Only depend on isOpen and hasCheckedQuota

  const handleRefreshQuota = async () => {
    if (!apiKey) {
      console.warn("No API key available for quota check");
      return;
    }

    // Check for basic API key format before making request
    if (!apiKey.startsWith("AIza") || apiKey.length < 20) {
      console.warn("Invalid API key format, skipping quota check");
      setQuotaUsage({
        used: 0,
        limit: 10000,
        percentage: 0,
        lastUpdated: new Date().toISOString(),
      });
      return;
    }

    setQuotaLoading(true);
    try {
      const usage = await youtubeQuotaService.checkQuotaUsage(apiKey);
      setQuotaUsage(usage);
    } catch (error) {
      console.error("Failed to fetch quota usage:", error);

      // Show user-friendly error based on the type
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("400")) {
        console.warn("API key appears to be invalid or malformed");
        setQuotaUsage({
          used: 0,
          limit: 10000,
          percentage: 0,
          lastUpdated: "Error: Invalid API key",
        });
      } else if (errorMessage.includes("403")) {
        console.warn("API key quota exceeded or access denied");
        setQuotaUsage({
          used: 10000,
          limit: 10000,
          percentage: 100,
          lastUpdated: "Error: Quota exceeded",
        });
      } else {
        // Set a safe default state when quota check fails
        setQuotaUsage({
          used: 0,
          limit: 10000,
          percentage: 0,
          lastUpdated: "Error: Could not check",
        });
      }
    } finally {
      setQuotaLoading(false);
    }
  };

  const handleTestApiKey = async () => {
    if (!apiKey) return;

    // Prevent multiple simultaneous tests
    if (testingApiKey) {
      console.log("API key test already in progress, ignoring request");
      return;
    }

    setTestingApiKey(true);
    setApiKeyTestResult(null);

    try {
      const result = await testApiKey(apiKey);
      setApiKeyTestResult(result);
    } catch (error) {
      setApiKeyTestResult({
        isValid: false,
        status: 0,
        message: `Test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setTestingApiKey(false);
    }
  };

  const handleValidateAllKeys = async () => {
    if (validatingKeys) {
      console.log("Key validation already in progress, ignoring request");
      return;
    }

    setValidatingKeys(true);

    try {
      console.log("[AdminConsole] Starting validation of all API keys...");
      const validKeys = await apiKeyRotation.getValidKeysWithQuota(customApiKey);
      setValidApiKeys(validKeys);

      // Store valid keys in localStorage for persistence
      localStorage.setItem('VALID_API_KEYS', JSON.stringify(validKeys));

      console.log(`[AdminConsole] Found ${validKeys.length} valid API keys with available quota`);
    } catch (error) {
      console.error("[AdminConsole] Error validating API keys:", error);
    } finally {
      setValidatingKeys(false);
    }
  };

  const handleSaveConfiguration = () => {
    // Save USER_PREFERENCES
    const userPrefs = {
      mode,
      credits,
      defaultPlaylist,
      apiKey,
      selectedApiKeyOption,
      customApiKey,
      autoRotateApiKeys,
      searchMethod,
      selectedCoinAcceptor,
      selectedBackground,
      cycleBackgrounds,
      bounceVideos,
      maxSongLength,
      showMiniPlayer,
      testMode,
      videoQuality,
      hideEndCards,
      coinValueA,
      coinValueB,
      selectedDisplay,
      useFullscreen,
      autoDetectDisplay,
      playerWindowPosition: null, // Will be saved separately
    };
    localStorage.setItem('USER_PREFERENCES', JSON.stringify(userPrefs));

    // Save ACTIVE_PLAYLIST (current in-memory playlist)
    if (currentPlaylistVideos && currentPlaylistVideos.length > 0) {
      localStorage.setItem('ACTIVE_QUEUE', JSON.stringify(currentPlaylistVideos));
    }

    // Save CURRENT_QUEUE_INDEX
    localStorage.setItem('current_video_index', '0'); // Reset to start on save

    // Save PRIORITY_QUEUE
    if (priorityQueue && priorityQueue.length > 0) {
      localStorage.setItem('PRIORITY_QUEUE', JSON.stringify(priorityQueue));
    }

    // Save ACTIVE_PLAYLIST_DATA (original loaded playlist)
    localStorage.setItem('active_playlist_data', JSON.stringify(currentPlaylistVideos));

    console.log('[AdminConsole] Configuration saved automatically on close');
  };

  const [playlistTitles, setPlaylistTitles] = useState<{
    [key: string]: string;
  }>({});

  // Load playlist titles on mount
  useEffect(() => {
    const loadPlaylistTitles = async () => {
      const titles: { [key: string]: string } = {};

      for (const playlist of AVAILABLE_PLAYLISTS) {
        try {
          const response = await fetch(
            `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlist.id}&key=${apiKey}`,
          );

          if (response.ok) {
            // Track API usage
            youtubeQuotaService.trackApiUsage(apiKey, "playlists", 1);

            const data = await response.json();
            if (data.items && data.items.length > 0) {
              titles[playlist.id] = data.items[0].snippet.title;
            } else {
              titles[playlist.id] = playlist.title;
            }
          } else {
            titles[playlist.id] = playlist.title;
          }
        } catch (error) {
          console.error(`Error loading playlist ${playlist.id}:`, error);
          titles[playlist.id] = playlist.title;
        }
      }

      setPlaylistTitles(titles);
    };

    if (apiKey && isOpen) {
      loadPlaylistTitles();
    }
  }, [apiKey, isOpen]);

  const handleBackgroundSelectChange = (value: string) => {
    if (value === "add-new") {
      fileInputRef.current?.click();
    } else {
      onBackgroundChange(value);
    }
  };

  const exportLogs = (
    logType: "event" | "user_requests" | "credit_history",
  ) => {
    let content = "";
    let filename = "";

    switch (logType) {
      case "event":
        content = logs
          .map(
            (log) =>
              `${log.timestamp} [${log.type}] ${log.description}${log.videoId ? ` (${log.videoId})` : ""}${log.creditAmount ? ` Amount: ${log.creditAmount}` : ""}`,
          )
          .join("\n");
        filename = "event_log.txt";
        break;
      case "user_requests":
        content = userRequests
          .map(
            (req) =>
              `${req.timestamp} "${req.title}" by ${req.channelTitle} (${req.videoId})`,
          )
          .join("\n");
        filename = "user_requests.txt";
        break;
      case "credit_history":
        content = creditHistory
          .map(
            (credit) =>
              `${credit.timestamp} ${credit.type} ${credit.amount} - ${credit.description}`,
          )
          .join("\n");
        filename = "credit_history.txt";
        break;
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate total playlist length including priority queue
  const getTotalPlaylistLength = () => {
    const defaultPlaylistLength = currentPlaylistVideos.filter(
      (video) => !video.isUserRequest && !video.isNowPlaying,
    ).length;
    return priorityQueue.length + defaultPlaylistLength;
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      // Dialog is closing, save configuration
      handleSaveConfiguration();
    }
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="bg-gradient-to-b from-slate-100 to-slate-200 border-slate-600 max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-900">
              Admin Console
            </DialogTitle>
            <DialogDescription className="text-slate-700">
              Configure jukebox settings, manage playlists, and control
              playback.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Test Mode - At the top */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="w-5 h-5 text-yellow-600" />
                <label className="text-sm font-medium text-yellow-800">
                  Test Mode
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="test-mode"
                  checked={testMode}
                  onCheckedChange={onTestModeChange}
                />
                <label htmlFor="test-mode" className="text-sm text-yellow-700">
                  TEST_MODE - 20 sec videos (Videos play for only 20 seconds
                  before auto-advancing)
                </label>
              </div>
            </div>

            <SettingsPanel
              mode={mode}
              onModeChange={onModeChange}
              credits={credits}
              onCreditsChange={onCreditsChange}
              selectedCoinAcceptor={selectedCoinAcceptor}
              onCoinAcceptorChange={onCoinAcceptorChange}
              coinValueA={coinValueA}
              onCoinValueAChange={onCoinValueAChange}
              coinValueB={coinValueB}
              onCoinValueBChange={onCoinValueBChange}
              defaultPlaylist={defaultPlaylist}
              onDefaultPlaylistChange={onDefaultPlaylistChange}
              currentPlaylistVideos={currentPlaylistVideos}
              onPlaylistShuffle={onPlaylistShuffle}
              onAddLog={onAddLog}
              onAddCreditHistory={onAddCreditHistory}
              playlistTitles={playlistTitles}
              setShowPlaylistDialog={setShowPlaylistDialog}
              isImportingPlaylist={isImportingPlaylist}
            />

            <PlayerControlsPanel
              playerWindow={playerWindow}
              isPlayerRunning={isPlayerRunning}
              isPlayerPaused={isPlayerPaused}
              onPlayerToggle={onPlayerToggle}
              onSkipSong={onSkipSong}
              onInitializePlayer={onInitializePlayer}
              selectedDisplay={selectedDisplay}
              onSelectedDisplayChange={onSelectedDisplayChange}
              useFullscreen={useFullscreen}
              onUseFullscreenChange={onUseFullscreenChange}
              autoDetectDisplay={autoDetectDisplay}
              onAutoDetectDisplayChange={onAutoDetectDisplayChange}
            />

            <VideoSettingsPanel
              showMiniPlayer={showMiniPlayer}
              onShowMiniPlayerChange={onShowMiniPlayerChange}
              maxSongLength={maxSongLength}
              onMaxSongLengthChange={onMaxSongLengthChange}
              videoQuality={videoQuality}
              onVideoQualityChange={onVideoQualityChange}
              hideEndCards={hideEndCards}
              onHideEndCardsChange={onHideEndCardsChange}
              adaptiveQualityEnabled={adaptiveQualityEnabled}
              onAdaptiveQualityEnabledChange={onAdaptiveQualityEnabledChange}
            />

            <ApiManagementPanel
              selectedApiKeyOption={selectedApiKeyOption}
              onApiKeyOptionChange={onApiKeyOptionChange}
              customApiKey={customApiKey}
              onCustomApiKeyChange={onCustomApiKeyChange}
              apiKey={apiKey}
              quotaUsage={quotaUsage}
              quotaLoading={quotaLoading}
              handleRefreshQuota={handleRefreshQuota}
              handleTestApiKey={handleTestApiKey}
              testingApiKey={testingApiKey}
              apiKeyTestResult={apiKeyTestResult}
              autoRotateApiKeys={autoRotateApiKeys}
              onAutoRotateChange={onAutoRotateChange}
              lastRotationTime={lastRotationTime}
              rotationHistory={rotationHistory}
              validApiKeys={validApiKeys}
              validatingKeys={validatingKeys}
              onValidateAllKeys={handleValidateAllKeys}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Search Method
              </label>
              <Select
                value={searchMethod}
                onValueChange={(value: SearchMethod) => onSearchMethodChange(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scraper">
                    Keyless Scraper (Recommended)
                  </SelectItem>
                  <SelectItem value="iframe_search">
                    Iframe Search (Local Proxy Required)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                {searchMethod === "scraper"
                  ? "🎉 No API key required! Scrapes YouTube directly via cloud function"
                  : "Uses local proxy server for fallback search"}
              </p>
            </div>

            {/* Background Assets and Queue */}
            <BackgroundAssetsErrorBoundary>
              <BackgroundAssetsPanel
                backgrounds={backgrounds}
                backgroundQueue={backgroundQueue}
                onAddToQueue={onAddToBackgroundQueue}
                onRemoveFromQueue={onRemoveFromBackgroundQueue}
                onReorderQueue={onReorderBackgroundQueue}
                onUpdateQueueItem={onUpdateBackgroundQueueItem}
                onTestQueue={onTestBackgroundQueue}
                isTestingMode={isTestingBackgroundQueue}
                currentTestIndex={currentTestIndex}
                onAddCustomAsset={() => fileInputRef.current?.click()}
              />
            </BackgroundAssetsErrorBoundary>

            {/* Background Settings */}
            <BackgroundSettingsPanel
              settings={backgroundSettings}
              onSettingsChange={onBackgroundSettingsChange}
              bgVisualMode={bgVisualMode}
              onBgVisualModeChange={onBgVisualModeChange}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: "none" }}
              onChange={onBackgroundUpload}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LogsPanel
              logs={logs}
              userRequests={userRequests}
              creditHistory={creditHistory}
              exportLogs={exportLogs}
            />
            </div>

            {/**
             * CHANGELOG - Phase 3 Integration
             * ADDED: System Health Check Section
             */}
            <Separator className="my-6" />
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-slate-900">System Health</h3>
              </div>
              <AdminConsoleHealthCheck
                playerWindow={playerWindow}
                inMemoryPlaylist={currentPlaylistVideos}
                priorityQueue={priorityQueue}
                currentlyPlaying={currentlyPlaying}
              />
            </div>

            {/**
             * CHANGELOG - Phase 3 Integration
             * ADDED: Custom Playlist Manager Section
             */}
            <Separator className="my-6" />
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <ListMusic className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-slate-900">Custom Playlists</h3>
              </div>
              <PlaylistManager onPlaylistSelect={onDefaultPlaylistChange} />
            </div>

            {/**
             * CHANGELOG - Phase 3 Integration
             * ADDED: Settings Export/Import Section
             */}
            <Separator className="my-6" />
            <div className="space-y-4">
            <SettingsManagementPanel
              mode={mode}
              credits={credits}
              defaultPlaylist={defaultPlaylist}
              apiKey={apiKey}
              selectedApiKeyOption={selectedApiKeyOption}
              customApiKey={customApiKey}
              autoRotateApiKeys={autoRotateApiKeys}
              searchMethod={searchMethod}
              selectedCoinAcceptor={selectedCoinAcceptor}
              selectedBackground={selectedBackground}
              cycleBackgrounds={cycleBackgrounds}
              bounceVideos={bounceVideos}
              maxSongLength={maxSongLength}
              showMiniPlayer={showMiniPlayer}
              testMode={testMode}
              videoQuality={videoQuality}
              hideEndCards={hideEndCards}
              coinValueA={coinValueA}
              coinValueB={coinValueB}
              selectedDisplay={selectedDisplay}
              useFullscreen={useFullscreen}
              autoDetectDisplay={autoDetectDisplay}
              currentPlaylistVideos={currentPlaylistVideos}
              priorityQueue={priorityQueue}
            />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Current Playlist Dialog */}
      <Dialog open={showPlaylistDialog} onOpenChange={setShowPlaylistDialog}>
        <DialogContent className="bg-gradient-to-b from-slate-100 to-slate-200 border-slate-600 max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-900 flex items-center justify-between">
              Current Queue ({getTotalPlaylistLength()} songs)
              <Button
                onClick={onPlaylistShuffle}
                className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                size="sm"
              >
                <Shuffle className="w-4 h-4" />
                Shuffle Default Playlist
              </Button>
            </DialogTitle>
            <DialogDescription className="text-slate-700">
              View and manage the current playlist queue including user requests
              and default songs.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-96 border rounded-md p-4 bg-white">
            {/* Currently Playing Section */}
            {currentPlaylistVideos.some(v => v.isNowPlaying) && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Play className="w-4 h-4 text-green-600" />
                  <h3 className="font-semibold text-green-700">
                    Currently Playing
                  </h3>
                </div>
                {currentPlaylistVideos
                  .filter(video => video.isNowPlaying)
                  .map((video, index) => (
                    <div
                      key={`now-playing-${video.id}-${index}`}
                      className="flex items-center gap-3 p-3 bg-green-50 border-green-200 border rounded-md"
                    >
                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <Play className="w-2 h-2 text-white" />
                      </div>
                      <span className="text-sm font-mono text-gray-500 w-8">
                        NP
                      </span>
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-green-700">
                          {cleanTitle(video.title)}
                        </div>
                        <div className="text-xs text-green-600">
                          {video.channelTitle}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Priority Queue Section */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-blue-700">
                  Priority Queue (Requests):{" "}
                  {priorityQueue.length > 0
                    ? `${priorityQueue.length} songs`
                    : "Empty"}
                </h3>
              </div>
              {priorityQueue.length > 0 ? (
                <div className="space-y-1">
                  {priorityQueue.map((request, index) => (
                    <div
                      key={`priority-${request.id}-${index}`}
                      className="flex items-center gap-3 p-3 bg-blue-50 border-blue-200 border rounded-md"
                    >
                      <span className="text-sm font-mono text-blue-600 w-8">
                        {index + 1}.
                      </span>
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-blue-700">
                          {cleanTitle(request.title)}
                        </div>
                        <div className="text-xs text-blue-600">
                          {request.channelTitle}
                        </div>
                      </div>
                      <div className="text-xs text-blue-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(request.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No user requests pending
                </div>
              )}
            </div>

            {/* Playlist Section - Circular Display */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <List className="w-4 h-4 text-gray-600" />
                <h3 className="font-semibold text-gray-700">
                  Playlist: {currentPlaylistVideos.filter(v => !v.isUserRequest && !v.isNowPlaying).length} songs
                </h3>
              </div>

              {/* Upcoming Songs */}
              {currentPlaylistVideos.filter(v => !v.isUserRequest && !v.isNowPlaying && !v.isAlreadyPlayed).length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Upcoming:</h4>
                  <div className="space-y-1">
                    {currentPlaylistVideos
                      .filter(video => !video.isUserRequest && !video.isNowPlaying && !video.isAlreadyPlayed)
                      .map((video, index) => (
                        <div
                          key={`upcoming-${video.id}-${index}`}
                          className="flex items-center gap-3 p-3 border-b hover:bg-gray-50"
                        >
                          <span className="text-sm font-mono text-gray-500 w-8">
                            {index + 1}.
                          </span>
                          <div className="flex-1">
                            <div className="font-semibold text-sm">
                              {cleanTitle(video.title)}
                            </div>
                            <div className="text-xs text-gray-600">
                              {video.channelTitle}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Already Played Songs */}
              {currentPlaylistVideos.filter(v => v.isAlreadyPlayed).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Already Played:</h4>
                  <div className="space-y-1 opacity-60">
                    {currentPlaylistVideos
                      .filter(video => video.isAlreadyPlayed)
                      .map((video, index) => (
                        <div
                          key={`played-${video.id}-${index}`}
                          className="flex items-center gap-3 p-3 border-b hover:bg-gray-50 bg-gray-50"
                        >
                          <span className="text-sm font-mono text-gray-400 w-8">
                            ✓
                          </span>
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-gray-500">
                              {cleanTitle(video.title)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {video.channelTitle}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {currentPlaylistVideos.filter(v => !v.isUserRequest && !v.isNowPlaying).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No songs in playlist
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Display Controls Component
interface DisplayControlsProps {
  playerWindow: Window | null;
  onInitializePlayer: () => void;
  selectedDisplay: string;
  onSelectedDisplayChange: (display: string) => void;
  useFullscreen: boolean;
  onUseFullscreenChange: (fullscreen: boolean) => void;
  autoDetectDisplay: boolean;
  onAutoDetectDisplayChange: (autoDetect: boolean) => void;
}

const DisplayControls: React.FC<DisplayControlsProps> = ({
  playerWindow,
  onInitializePlayer,
  selectedDisplay,
  onSelectedDisplayChange,
  useFullscreen,
  onUseFullscreenChange,
  autoDetectDisplay,
  onAutoDetectDisplayChange,
}) => {
  const [availableDisplays, setAvailableDisplays] = useState<DisplayInfo[]>([]);

  useEffect(() => {
    const loadDisplays = async () => {
      const displays = await displayManager.getDisplays();
      setAvailableDisplays(displays);

      // Auto-select secondary display if available and auto-detect is enabled
      if (autoDetectDisplay) {
        const secondaryDisplay = displays.find((d) => !d.isPrimary);
        if (secondaryDisplay) {
          onSelectedDisplayChange(secondaryDisplay.id);
          onUseFullscreenChange(true);
        } else {
          const primaryDisplay =
            displays.find((d) => d.isPrimary) || displays[0];
          if (primaryDisplay) {
            onSelectedDisplayChange(primaryDisplay.id);
            onUseFullscreenChange(false);
          }
        }
      }
    };

    loadDisplays();
  }, [autoDetectDisplay, onSelectedDisplayChange, onUseFullscreenChange]);

  // Toggle fullscreen when useFullscreen changes
  useEffect(() => {
    if (playerWindow && !playerWindow.closed) {
      const command = {
        action: 'fullscreen',
        enable: useFullscreen,
        timestamp: Date.now(),
      };
      try {
        localStorage.setItem('jukeboxCommand', JSON.stringify(command));
        console.log('[DisplayControls] Sent fullscreen command:', useFullscreen);
      } catch (e) {
        console.warn('[DisplayControls] Could not send fullscreen command:', e);
      }
    }
  }, [useFullscreen, playerWindow]);

  const handleOpenPlayerOnDisplay = () => {
    const display = availableDisplays.find((d) => d.id === selectedDisplay);
    if (!display) return;

    console.log(
      `[DisplayControls] Opening player on ${display.name} (${useFullscreen ? "fullscreen" : "windowed"})`,
    );

    // Close existing player window if open
    if (playerWindow && !playerWindow.closed) {
      playerWindow.close();
    }

    // If mini player is selected, don't open a window - the embedded player will be used instead
    if (showMiniPlayer) {
      console.log("[DisplayControls] Mini player mode selected - using embedded player");
      return;
    }

    // Open player on selected display
    const features = displayManager.generateWindowFeatures(
      display,
      useFullscreen,
    );
    const newPlayerWindow = window.open(
      "/player.html",
      "JukeboxPlayer",
      features,
    );

    if (newPlayerWindow && useFullscreen) {
      newPlayerWindow.addEventListener("load", () => {
        setTimeout(() => {
          try {
            newPlayerWindow.document.documentElement.requestFullscreen();
          } catch (error) {
            console.warn("Could not enter fullscreen mode:", error);
          }
        }, 1000);
      });
    }
  };

  return (
    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
      <div className="flex items-center gap-2 mb-3">
        <Monitor className="w-4 h-4 text-blue-600" />
        <label className="text-sm font-medium text-blue-800">
          Display Management
        </label>
      </div>

      <div className="space-y-3">
        {/* Auto-detect toggle */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={autoDetectDisplay}
            onCheckedChange={(checked) => onAutoDetectDisplayChange(checked === true)}
            id="auto-detect-display"
          />
          <label
            htmlFor="auto-detect-display"
            className="text-sm text-blue-700"
          >
            Auto-select secondary display (recommended)
          </label>
        </div>

        {/* Show display selection dialog toggle */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={showDisplaySelectionDialogOnStartup}
            onCheckedChange={(checked) => onShowDisplaySelectionDialogOnStartupChange(checked === true)}
            id="show-display-selection-dialog"
          />
          <label
            htmlFor="show-display-selection-dialog"
            className="text-sm text-blue-700"
          >
            Show the Video Player Default Display Selector dialogue on startup
          </label>
        </div>

        {/* Display selection */}
        <DisplayButtonGrid
          displays={availableDisplays}
          selectedDisplay={selectedDisplay}
          onDisplaySelect={onSelectedDisplayChange}
          disabled={showMiniPlayer}
        />

        {/* Fullscreen toggle */}
        <div className={`flex items-center gap-2 ${showMiniPlayer ? 'opacity-50' : ''}`}>
          <Checkbox
            checked={useFullscreen}
            onCheckedChange={(checked) => onUseFullscreenChange(checked === true)}
            id="use-fullscreen"
            disabled={showMiniPlayer}
          />
          <label htmlFor="use-fullscreen" className={`text-sm ${showMiniPlayer ? 'text-gray-400' : 'text-blue-700'}`}>
            Open in fullscreen mode
            {showMiniPlayer && <span className="text-xs text-gray-400 ml-1">(disabled in mini player mode)</span>}
          </label>
        </div>

        {/* Action buttons */}
        <div className={`flex gap-2 ${showMiniPlayer ? 'opacity-50' : ''}`}>
          <Button
            onClick={handleOpenPlayerOnDisplay}
            disabled={!selectedDisplay || showMiniPlayer}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            size="sm"
          >
            <ExternalLink className="w-4 h-4" />
            Reopen on Selected Display
            {showMiniPlayer && <span className="text-xs ml-1">(disabled in mini player mode)</span>}
          </Button>
        </div>

        {/* Display info */}
        <div className="text-xs text-blue-600">
          {availableDisplays.length > 1
            ? `${availableDisplays.length} displays detected. Secondary display ${useFullscreen ? "fullscreen" : "windowed"} mode recommended.`
            : "Single display detected. Player will open in windowed mode."}
        </div>
      </div>
    </div>
  );
};
