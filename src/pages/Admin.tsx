import { AdminConsole } from '@/components/AdminConsole';
import { useJukeboxState } from '@/hooks/useJukeboxState';
import { usePlayerManager } from '@/hooks/usePlayerManager';
import { usePlaylistManager } from '@/hooks/usePlaylistManager';
import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DisplayInfo } from '@/services/displayManager';

export default function Admin() {
  const { toast } = useToast();
  const {
    state,
    setState,
    addLog,
    addUserRequest,
    addCreditHistory,
    handleBackgroundUpload,
    getCurrentPlaylistForDisplay,
  } = useJukeboxState();

  const [pendingDisplayConfirmation, setPendingDisplayConfirmation] = useState<{
    displayInfo: DisplayInfo;
    onConfirm: (useFullscreen: boolean, rememberChoice: boolean) => void;
    onCancel: () => void;
  } | null>(null);

  const handleDisplayConfirmationNeeded = useCallback(
    (
      displayInfo: DisplayInfo,
      onConfirm: (useFullscreen: boolean, rememberChoice: boolean) => void,
      onCancel: () => void,
    ) => {
      setPendingDisplayConfirmation({ displayInfo, onConfirm, onCancel });
    },
    [],
  );

  const {
    initializePlayer,
    handlePlayerToggle,
    handleSkipSong,
    playSong,
  } = usePlayerManager(
    state,
    setState,
    addLog,
    handleDisplayConfirmationNeeded,
  );

  const {
    handleDefaultPlaylistChange,
    handlePlaylistReorder,
    handlePlaylistShuffle,
  } = usePlaylistManager(state, setState, addLog, playSong, toast);

  return (
    <div className="min-h-screen bg-background">
      <AdminConsole
        isOpen={true}
        onClose={() => window.close()}
        mode={state.mode}
        onModeChange={(mode) => setState((prev) => ({ ...prev, mode }))}
        credits={state.credits}
        onCreditsChange={(credits) =>
          setState((prev) => ({ ...prev, credits }))
        }
        apiKey={state.apiKey}
        onApiKeyChange={(apiKey) => setState((prev) => ({ ...prev, apiKey }))}
        selectedApiKeyOption={state.selectedApiKeyOption}
        onApiKeyOptionChange={(option) => {
          const API_KEY_OPTIONS = {
            key1: "AIzaSyC12QKbzGaKZw9VD3-ulxU_mrd0htZBiI4",
            key2: "AIzaSyCKHHGkaztp8tfs2BVxiny0InE_z-kGDtY",
            key3: "AIzaSyDy6_QI9SP5nOZRVoNa5xghSHtY3YWX5kU",
            key4: "AIzaSyCPAY_ukeGnAGJdCvYk1bVVDxZjQRJqsdk",
            key5: "AIzaSyBGcwaCm70o4ir0CKcNIJ0V_7TeyY2cwdA",
            custom: state.customApiKey,
          };

          setState((prev) => ({
            ...prev,
            selectedApiKeyOption: option,
            apiKey:
              option === "custom"
                ? prev.customApiKey
                : API_KEY_OPTIONS[option as keyof typeof API_KEY_OPTIONS] ||
                  prev.apiKey,
          }));
        }}
        customApiKey={state.customApiKey}
        onCustomApiKeyChange={(key) => {
          setState((prev) => ({
            ...prev,
            customApiKey: key,
            apiKey: prev.selectedApiKeyOption === "custom" ? key : prev.apiKey,
          }));
        }}
        autoRotateApiKeys={state.autoRotateApiKeys}
        onAutoRotateChange={(enabled) =>
          setState((prev) => ({ ...prev, autoRotateApiKeys: enabled }))
        }
        rotationHistory={state.rotationHistory}
        lastRotationTime={state.lastRotationTime}
        searchMethod={state.searchMethod}
        onSearchMethodChange={(searchMethod) =>
          setState((prev) => ({ ...prev, searchMethod }))
        }
        selectedCoinAcceptor={state.selectedCoinAcceptor}
        onCoinAcceptorChange={(device) =>
          setState((prev) => ({ ...prev, selectedCoinAcceptor: device }))
        }
        logs={state.logs}
        userRequests={state.userRequests}
        creditHistory={state.creditHistory}
        backgrounds={state.backgrounds}
        selectedBackground={state.selectedBackground}
        onBackgroundChange={(id) =>
          setState((prev) => ({ ...prev, selectedBackground: id }))
        }
        cycleBackgrounds={state.cycleBackgrounds}
        onCycleBackgroundsChange={(cycle) =>
          setState((prev) => ({ ...prev, cycleBackgrounds: cycle }))
        }
        bounceVideos={state.bounceVideos}
        onBounceVideosChange={(bounce) =>
          setState((prev) => ({ ...prev, bounceVideos: bounce }))
        }
        onBackgroundUpload={handleBackgroundUpload}
        onAddLog={addLog}
        onAddUserRequest={addUserRequest}
        onAddCreditHistory={addCreditHistory}
        playerWindow={state.playerWindow}
        isPlayerRunning={state.isPlayerRunning}
        onPlayerToggle={handlePlayerToggle}
        onSkipSong={handleSkipSong}
        onInitializePlayer={initializePlayer}
        maxSongLength={state.maxSongLength}
        onMaxSongLengthChange={(minutes) =>
          setState((prev) => ({ ...prev, maxSongLength: minutes }))
        }
        defaultPlaylist={state.defaultPlaylist}
        onDefaultPlaylistChange={handleDefaultPlaylistChange}
        currentPlaylistVideos={getCurrentPlaylistForDisplay()}
        onPlaylistReorder={handlePlaylistReorder}
        onPlaylistShuffle={handlePlaylistShuffle}
        currentlyPlaying={state.currentlyPlaying}
        priorityQueue={state.priorityQueue}
        showMiniPlayer={state.showMiniPlayer}
        onShowMiniPlayerChange={(show) =>
          setState((prev) => ({ ...prev, showMiniPlayer: show }))
        }
        testMode={state.testMode}
        onTestModeChange={(testMode) =>
          setState((prev) => ({ ...prev, testMode }))
        }
        coinValueA={state.coinValueA}
        onCoinValueAChange={(value) =>
          setState((prev) => ({ ...prev, coinValueA: value }))
        }
        coinValueB={state.coinValueB}
        onCoinValueBChange={(value) =>
          setState((prev) => ({ ...prev, coinValueB: value }))
        }
      />
    </div>
  );
}
