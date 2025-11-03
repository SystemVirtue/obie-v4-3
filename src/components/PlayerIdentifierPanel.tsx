/**
 * Player Identifier Panel Component
 * 
 * Allows configuration of the PLAYER_IDENTIFIER used for kiosk-player communication.
 * This identifier associates kiosk requests with specific player instances.
 * 
 * @module components/PlayerIdentifierPanel
 */

import React from "react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Monitor, Info } from "lucide-react";

interface PlayerIdentifierPanelProps {
  /**
   * Current player identifier value
   */
  playerIdentifier: string;
  
  /**
   * Callback when player identifier changes
   */
  onPlayerIdentifierChange: (value: string) => void;
}

export const PlayerIdentifierPanel: React.FC<PlayerIdentifierPanelProps> = ({
  playerIdentifier,
  onPlayerIdentifierChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Monitor className="w-5 h-5 text-slate-700" />
        <h3 className="text-lg font-semibold text-slate-900">
          Player Identifier
        </h3>
      </div>

      <Separator />

      <div className="space-y-3">
        <div>
          <label
            htmlFor="player-identifier"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Player Identifier String
          </label>
          <Input
            id="player-identifier"
            value={playerIdentifier}
            onChange={(e) => onPlayerIdentifierChange(e.target.value)}
            placeholder="default"
            className="bg-white"
          />
          <div className="flex items-start gap-2 mt-2 text-xs text-slate-600">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              This identifier is used to associate kiosk requests with this player instance.
              The kiosk will send song requests to Supabase tagged with this identifier,
              and only this player will receive those requests.
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-900 mb-1">
            How it works:
          </h4>
          <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
            <li>This player registers with Supabase using the identifier "{playerIdentifier}"</li>
            <li>Kiosks using the same identifier can send song requests to this player</li>
            <li>The player sends a heartbeat every 20 seconds to stay active</li>
            <li>Requests are delivered in real-time via Supabase Realtime</li>
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-amber-900 mb-1">
            ⚠️ Important:
          </h4>
          <p className="text-xs text-amber-800">
            If you change this identifier, kiosks using the old identifier
            will no longer be able to send requests to this player until
            they update their stored identifier.
          </p>
        </div>
      </div>
    </div>
  );
};
