import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coins, List, Shuffle } from 'lucide-react';
import { PlaylistItem, LogEntry } from '@/types/jukebox';

interface PlaylistInfo {
  id: string;
  title: string;
}

interface SettingsPanelProps {
  mode: "FREEPLAY" | "PAID";
  onModeChange: (mode: "FREEPLAY" | "PAID") => void;
  credits: number;
  onCreditsChange: (credits: number) => void;
  selectedCoinAcceptor: string;
  onCoinAcceptorChange: (device: string) => void;
  coinValueA: number;
  onCoinValueAChange: (value: number) => void;
  coinValueB: number;
  onCoinValueBChange: (value: number) => void;
  defaultPlaylist: string;
  onDefaultPlaylistChange: (playlistId: string) => void;
  currentPlaylistVideos: PlaylistItem[];
  onPlaylistShuffle?: () => void;
  onAddLog: (
    type: LogEntry["type"],
    description: string,
    videoId?: string,
    creditAmount?: number,
  ) => void;
  onAddCreditHistory: (
    amount: number,
    type: "ADDED" | "REMOVED",
    description: string,
  ) => void;
  playlistTitles: Record<string, string>;
  setShowPlaylistDialog: (show: boolean) => void;
  isImportingPlaylist?: boolean;
}

const AVAILABLE_PLAYLISTS: PlaylistInfo[] = [
  { id: "PLJ7vMjpVbhBWLWJpweVDki43Wlcqzsqdu", title: "DJAMMMS Default Playlist" },
  { id: "PLN9QqCogPsXIoSObV0F39OZ_MlRZ9tRT9", title: "Obie Nights" },
  { id: "PLN9QqCogPsXJCgeL_iEgYnW6Rl_8nIUUH", title: "Obie Playlist" },
  { id: "PLN9QqCogPsXIkPh6xm7cxSN9yTVaEoj0j", title: "Obie Jo" },
  { id: "PLN9QqCogPsXLAtgvLQ0tvpLv820R7PQsM", title: "Karaoke" },
  { id: "PLN9QqCogPsXIqfwdfe4hf3qWM1mFweAXP", title: "Poly" },
  { id: "PLN9QqCogPsXLsv5D5ZswnOSnRIbGU80IS", title: "Obie Johno" },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  mode,
  onModeChange,
  credits,
  onCreditsChange,
  selectedCoinAcceptor,
  onCoinAcceptorChange,
  coinValueA,
  onCoinValueAChange,
  coinValueB,
  onCoinValueBChange,
  defaultPlaylist,
  onDefaultPlaylistChange,
  currentPlaylistVideos,
  onPlaylistShuffle,
  onAddLog,
  onAddCreditHistory,
  playlistTitles,
  setShowPlaylistDialog,
  isImportingPlaylist,
}) => {
  return (
    <div className="space-y-6">
      {/* Play Mode */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Play Mode
        </label>
        <Select value={mode} onValueChange={onModeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FREEPLAY">Free Play</SelectItem>
            <SelectItem value="PAID">Credit Mode</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Coin Acceptor Configuration */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Coin Acceptor Device
        </label>
        <Select
          value={selectedCoinAcceptor}
          onValueChange={onCoinAcceptorChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select device..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Device</SelectItem>
            <SelectItem value="usbserial-1420">
              USB Serial Device (usbserial-1420)
            </SelectItem>
          </SelectContent>
        </Select>

        {selectedCoinAcceptor && selectedCoinAcceptor !== "none" && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Coins className="w-5 h-5 text-blue-600" />
              <label className="text-sm font-medium text-blue-800">
                Coin Values Configuration
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">
                  "a" character adds:
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={coinValueA ?? 3}
                  onChange={(e) =>
                    onCoinValueAChange(parseInt(e.target.value) || 1)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <span className="text-xs text-blue-600">credit(s)</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">
                  "b" character adds:
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={coinValueB ?? 1}
                  onChange={(e) =>
                    onCoinValueBChange(parseInt(e.target.value) || 3)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <span className="text-xs text-blue-600">credit(s)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Default Playlist
        </label>
        <Select
          value={defaultPlaylist}
          onValueChange={onDefaultPlaylistChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_PLAYLISTS.map((playlist) => (
              <SelectItem key={playlist.id} value={playlist.id}>
                {playlistTitles[playlist.id] || playlist.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 mt-2">
          <Button
            onClick={() => setShowPlaylistDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            size="sm"
            disabled={isImportingPlaylist}
          >
            <List className="w-4 h-4" />
            {isImportingPlaylist ? (
              "Importing Playlist, one moment"
            ) : (
              <>
                Show Queue (
                {
                  currentPlaylistVideos.filter(
                    (v) => !v.isUserRequest && !v.isNowPlaying,
                  ).length
                }{" "}
                songs)
              </>
            )}
          </Button>
          <Button
            onClick={onPlaylistShuffle}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
            size="sm"
          >
            <Shuffle className="w-4 h-4" />
            Shuffle
          </Button>
        </div>
      </div>

      {mode === "PAID" && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Credit Balance: {credits}
          </label>
          <div className="flex gap-2 mb-4">
            <Button
              size="sm"
              onClick={() => {
                onCreditsChange(credits + 1);
                onAddLog(
                  "CREDIT_ADDED",
                  "ADMIN CREDIT (+1)",
                  undefined,
                  1,
                );
                onAddCreditHistory(1, "ADDED", "ADMIN CREDIT (+1)");
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              +1
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onCreditsChange(credits + 3);
                onAddLog(
                  "CREDIT_ADDED",
                  "ADMIN CREDIT (+3)",
                  undefined,
                  3,
                );
                onAddCreditHistory(3, "ADDED", "ADMIN CREDIT (+3)");
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              +3
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onCreditsChange(credits + 5);
                onAddLog(
                  "CREDIT_ADDED",
                  "ADMIN CREDIT (+5)",
                  undefined,
                  5,
                );
                onAddCreditHistory(5, "ADDED", "ADMIN CREDIT (+5)");
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              +5
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onAddLog(
                  "CREDIT_REMOVED",
                  `ADMIN CREDIT CLEAR (was ${credits})`,
                  undefined,
                  -credits,
                );
                onAddCreditHistory(
                  credits,
                  "REMOVED",
                  `ADMIN CREDIT CLEAR (was ${credits})`,
                );
                onCreditsChange(0);
              }}
              variant="destructive"
            >
              Clear(0)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};