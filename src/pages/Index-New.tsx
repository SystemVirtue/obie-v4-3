import React from "react";
import { SearchInterface } from "@/components/SearchInterface";
import { IframeSearchInterface } from "@/components/IframeSearchInterface";
import { InsufficientCreditsDialog } from "@/components/InsufficientCreditsDialog";
import { DuplicateSongDialog } from "@/components/DuplicateSongDialog";
import { AdminConsole } from "@/components/AdminConsole";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { DisplayConfirmationDialog } from "@/components/DisplayConfirmationDialog";
import { QuotaExhaustedDialog } from "@/components/QuotaExhaustedDialog";
import { ApiKeyTestDialog } from "@/components/ApiKeyTestDialog";
import { BackgroundDisplay } from "@/components/BackgroundManager";
import { useBackgroundManager } from "@/components/BackgroundManager";
import { JukeboxProvider, useJukebox } from "@/contexts/JukeboxContext";
import "@/utils/emergencyFallback";

/**
 * Main Jukebox Interface Component
 * Simplified to use JukeboxProvider context for all state management
 */
const JukeboxInterface = () => {
  const { state, setState } = useJukebox();

  // Use background manager hook
  const { getCurrentBackground } = useBackgroundManager({
    backgrounds: state.backgrounds,
    selectedBackground: state.selectedBackground,
    cycleBackgrounds: state.cycleBackgrounds,
    backgroundCycleIndex: state.backgroundCycleIndex,
    bounceVideos: state.bounceVideos,
    backgroundSettings: state.backgroundSettings,
    onBackgroundCycleIndexChange: (index) =>
      setState((prev) => ({ ...prev, backgroundCycleIndex: index })),
    onSelectedBackgroundChange: (id) =>
      setState((prev) => ({ ...prev, selectedBackground: id })),
  });

  const currentBackground = getCurrentBackground();
  const isLoading = state.isLoadingPlaylist || state.isSearching;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <BackgroundDisplay background={currentBackground} bounceVideos={state.bounceVideos}>
        {/* Loading Indicator */}
        {isLoading && <LoadingIndicator />}

        {/* Credits Display */}
        <CreditsDisplay
          credits={state.credits}
          mode={state.mode}
          className="fixed top-4 left-4 z-20"
        />

        {/* Main Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
          {/* Search Interface - Conditional based on search method */}
          {state.searchMethod === "iframe_search" ? (
            <IframeSearchInterface />
          ) : (
            <SearchInterface />
          )}
        </div>

        {/* Dialogs */}
        <InsufficientCreditsDialog />
        <DuplicateSongDialog />
        <DisplayConfirmationDialog />
        <QuotaExhaustedDialog />
        <ApiKeyTestDialog />

        {/* Admin Console - Only shown when admin mode is active */}
        {state.showAdmin && <AdminConsole />}
      </BackgroundDisplay>
    </div>
  );
};

/**
 * Main Index Component
 * Wraps the jukebox interface with the context provider
 */
const Index = () => {
  return (
    <JukeboxProvider>
      <JukeboxInterface />
    </JukeboxProvider>
  );
};

export default Index;
