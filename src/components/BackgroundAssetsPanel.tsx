import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Upload, GripVertical, Play, Pause, Settings, Eye, Image, Video } from 'lucide-react';
import { BackgroundFile, BackgroundQueueItem } from '@/types/jukebox';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface BackgroundAssetsPanelProps {
  backgrounds: BackgroundFile[];
  backgroundQueue: BackgroundQueueItem[];
  onAddToQueue: (assetId: string) => void;
  onRemoveFromQueue: (queueId: string) => void;
  onReorderQueue: (fromIndex: number, toIndex: number) => void;
  onUpdateQueueItem: (queueId: string, updates: Partial<BackgroundQueueItem>) => void;
  onAddCustomAsset: () => void;
  onTestQueue?: () => void;
  isTestingMode?: boolean;
  currentTestIndex?: number;
}

export const BackgroundAssetsPanel: React.FC<BackgroundAssetsPanelProps> = React.memo(({
  backgrounds,
  backgroundQueue,
  onAddToQueue,
  onRemoveFromQueue,
  onReorderQueue,
  onUpdateQueueItem,
  onAddCustomAsset,
  onTestQueue,
  isTestingMode = false,
  currentTestIndex = -1,
}) => {
  // Validate props and provide fallbacks
  const safeBackgrounds = Array.isArray(backgrounds) ? backgrounds : [];
  const safeBackgroundQueue = Array.isArray(backgroundQueue) ? backgroundQueue : [];
  const safeIsTestingMode = Boolean(isTestingMode);
  const safeCurrentTestIndex = typeof currentTestIndex === 'number' ? currentTestIndex : -1;

  // State declarations
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<BackgroundQueueItem | null>(null);
  const [loadedPreviews, setLoadedPreviews] = useState<Set<string>>(new Set());

  // Refs
  const observerRef = useRef<IntersectionObserver | null>(null);
  const dialogFirstFocusRef = useRef<HTMLButtonElement>(null);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const assetId = entry.target.getAttribute('data-asset-id');
            if (assetId) {
              setLoadedPreviews(prev => new Set([...prev, assetId]));
            }
          }
        });
      },
      { rootMargin: '50px' }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Focus management for settings dialog
  useEffect(() => {
    if (showSettingsDialog && dialogFirstFocusRef.current) {
      // Focus the first form element when dialog opens
      setTimeout(() => dialogFirstFocusRef.current?.focus(), 100);
    }
  }, [showSettingsDialog]);

  // Default assets
  const defaultAssets = useMemo(() => [
    { id: 'none-black', name: 'NONE (BLACK)', type: 'default' as const },
    { id: 'now-playing-thumbnail', name: 'Now Playing Thumbnail', type: 'default' as const },
    { id: 'random-thumbnails', name: 'Random Thumbnail Tiles', type: 'default' as const },
  ], []);

  // Memoize expensive calculations
  const allAssets = useMemo(() => [
    ...defaultAssets,
    ...safeBackgrounds.map(bg => ({ ...bg, type: bg.type as 'image' | 'video' })),
  ], [defaultAssets, safeBackgrounds]);

  const groupedAssets = useMemo(() => allAssets.reduce((acc, asset) => {
    if (!acc[asset.type]) acc[asset.type] = [];
    acc[asset.type].push(asset);
    return acc;
  }, {} as Record<string, typeof allAssets>), [allAssets]);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorderQueue(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  }, [draggedIndex, onReorderQueue]);

  const handleEditSettings = useCallback((item: BackgroundQueueItem) => {
    setEditingItem(item);
    setShowSettingsDialog(true);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (safeIsTestingMode) return;

    switch (e.key) {
      case 'ArrowUp': {
        e.preventDefault();
        if (index > 0) {
          onReorderQueue(index, index - 1);
        }
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        if (index < safeBackgroundQueue.length - 1) {
          onReorderQueue(index, index + 1);
        }
        break;
      }
      case 'Delete':
      case 'Backspace': {
        e.preventDefault();
        const item = safeBackgroundQueue[index];
        if (item) {
          onRemoveFromQueue(item.id);
        }
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const itemToEdit = safeBackgroundQueue[index];
        if (itemToEdit) {
          handleEditSettings(itemToEdit);
        }
        break;
      }
    }
  }, [safeIsTestingMode, safeBackgroundQueue, onReorderQueue, onRemoveFromQueue, handleEditSettings]);

  const getAssetPreview = (assetId: string) => {
    const asset = allAssets.find(a => a.id === assetId);
    if (!asset) return null;

    // Only show preview if it's been loaded (lazy loading)
    if (!loadedPreviews.has(assetId)) {
      return (
        <div className="w-12 h-12 bg-slate-100 rounded border flex items-center justify-center">
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" />
        </div>
      );
    }

    if (asset.type === 'image' || asset.type === 'video') {
      return (
        <div className="w-12 h-12 bg-slate-100 rounded border overflow-hidden flex items-center justify-center">
          {asset.type === 'image' ? (
            <Image className="w-6 h-6 text-slate-400" />
          ) : (
            <Video className="w-6 h-6 text-slate-400" />
          )}
        </div>
      );
    }

    return (
      <div className="w-12 h-12 bg-slate-200 rounded border flex items-center justify-center">
        <span className="text-xs text-slate-600 font-medium">
          {asset.name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Available Assets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Available Background Assets</CardTitle>
            <Button
              onClick={onAddCustomAsset}
              variant="outline"
              size="sm"
              aria-label="Add custom image or video assets to the background collection"
            >
              <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
              Add Custom Image/Video Assets
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(groupedAssets).map(([type, assets]) => (
            <div key={type} className="space-y-2">
              <h4 className="font-medium text-sm text-slate-600 uppercase tracking-wide" id={`asset-group-${type}`}>
                {type === 'default' ? 'Default Assets' :
                 type === 'image' ? 'Image Assets' : 'Video Assets'}
              </h4>
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
                role="group"
                aria-labelledby={`asset-group-${type}`}
              >
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    data-asset-id={asset.id}
                    ref={(el) => {
                      if (el && observerRef.current && !loadedPreviews.has(asset.id)) {
                        observerRef.current.observe(el);
                      }
                    }}
                    className="flex items-center justify-between p-3 border rounded-lg bg-slate-50"
                    role="listitem"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{asset.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {asset.type}
                        </Badge>
                      </div>
                      {('url' in asset) && asset.url && (
                        <p className="text-xs text-slate-500 truncate mt-1">{asset.url}</p>
                      )}
                    </div>
                    <Button
                      onClick={() => onAddToQueue(asset.id)}
                      size="sm"
                      variant="ghost"
                      className="ml-2 flex-shrink-0"
                      aria-label={`Add ${asset.name} to background queue`}
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Background Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Background Queue</CardTitle>
              <p className="text-sm text-slate-600">
                Drag items to reorder. Assets play in order from top to bottom.
                {safeIsTestingMode && (
                  <span className="text-blue-600 font-medium ml-2" aria-live="polite">
                    Testing Mode Active
                  </span>
                )}
              </p>
            </div>
            {onTestQueue && (
              <Button
                onClick={onTestQueue}
                variant={safeIsTestingMode ? "destructive" : "outline"}
                size="sm"
                aria-label={safeIsTestingMode ? "Stop testing background queue" : "Start testing background queue playback"}
                aria-pressed={safeIsTestingMode}
              >
                {isTestingMode ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" aria-hidden="true" />
                    Stop Test
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" aria-hidden="true" />
                    Test Queue
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {safeBackgroundQueue.length === 0 ? (
            <p className="text-slate-500 text-center py-8" role="status" aria-live="polite">
              No items in background queue. Add assets above to create a playlist.
            </p>
          ) : (
            <div className="space-y-2" role="list" aria-label="Background queue items">
              {safeBackgroundQueue.map((item, index) => {
                const asset = allAssets.find(a => a.id === item.assetId);
                const isCurrentlyTesting = safeIsTestingMode && index === safeCurrentTestIndex;

                return (
                  <div
                    key={item.id}
                    draggable={!safeIsTestingMode}
                    onDragStart={() => !safeIsTestingMode && handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                      isCurrentlyTesting
                        ? 'bg-blue-50 border-blue-300 shadow-md'
                        : 'bg-white hover:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2'
                    } ${safeIsTestingMode ? 'cursor-default' : 'cursor-move'}`}
                    role="listitem"
                    aria-label={`Queue item ${index + 1}: ${item.name}, type: ${item.type}${isCurrentlyTesting ? ', currently testing' : ''}`}
                    tabIndex={safeIsTestingMode ? -1 : 0}
                  >
                    {/* Drag Handle */}
                    {!safeIsTestingMode && (
                      <GripVertical
                        className="w-4 h-4 text-slate-400 flex-shrink-0"
                        aria-hidden="true"
                        role="presentation"
                      />
                    )}

                    {/* Test Indicator */}
                    {safeIsTestingMode && (
                      <div
                        className={`w-4 h-4 rounded-full flex-shrink-0 ${
                          isCurrentlyTesting ? 'bg-blue-500' : 'bg-slate-300'
                        }`}
                        aria-label={isCurrentlyTesting ? "Currently testing this item" : "Waiting to test"}
                        role="status"
                        aria-live="polite"
                      >
                        {isCurrentlyTesting && (
                          <div className="w-full h-full bg-blue-500 rounded-full animate-pulse" aria-hidden="true" />
                        )}
                      </div>
                    )}

                    {/* Asset Preview */}
                    <div aria-hidden="true">
                      {getAssetPreview(item.assetId)}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{item.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                        {isCurrentlyTesting && (
                          <Badge variant="default" className="text-xs bg-blue-500" aria-live="assertive">
                            Testing
                          </Badge>
                        )}
                      </div>

                      {/* Settings Summary */}
                      <div className="flex items-center gap-4 text-xs text-slate-500" aria-label="Display settings">
                        <span>Duration: {item.settings?.displayDuration || '30s'}</span>
                        <span>Scale: {item.settings?.scaling || 'Fit-To-Screen'}</span>
                        {item.type === 'video' && (
                          <span>Speed: {item.settings?.videoSpeed || '1.0'}x</span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0" role="group" aria-label="Queue item actions">
                      <Button
                        onClick={() => handleEditSettings(item)}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        title="Edit settings"
                        aria-label={`Edit settings for ${item.name}`}
                      >
                        <Settings className="w-4 h-4" aria-hidden="true" />
                      </Button>

                      <Button
                        onClick={() => onRemoveFromQueue(item.id)}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Remove from queue"
                        aria-label={`Remove ${item.name} from background queue`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-md" aria-describedby="settings-dialog-description">
          <DialogHeader>
            <DialogTitle>Edit Background Settings</DialogTitle>
            <DialogDescription id="settings-dialog-description">
              Customize display settings for "{editingItem?.name}"
            </DialogDescription>
          </DialogHeader>

          {editingItem && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveSettings(editingItem.settings || {});
              }}
              className="space-y-4"
            >
              {/* Scaling */}
              <div className="space-y-2">
                <Label htmlFor="scaling-select">Scaling</Label>
                <Select
                  value={editingItem.settings?.scaling || 'Fit-To-Screen'}
                  onValueChange={(value) => setEditingItem({
                    ...editingItem,
                    settings: { ...editingItem.settings, scaling: value as any }
                  })}
                >
                  <SelectTrigger ref={dialogFirstFocusRef} id="scaling-select" aria-describedby="scaling-help">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Original Size">Original Size</SelectItem>
                    <SelectItem value="Fit-To-Screen">Fit-To-Screen</SelectItem>
                    <SelectItem value="Fill-Screen">Fill-Screen</SelectItem>
                    <SelectItem value="Stretch to Screen">Stretch to Screen</SelectItem>
                  </SelectContent>
                </Select>
                <p id="scaling-help" className="text-xs text-slate-500">
                  How the background asset should be sized on screen
                </p>
              </div>

              {/* Display Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration-select">Display Duration</Label>
                <Select
                  value={editingItem.settings?.displayDuration || '30s'}
                  onValueChange={(value) => setEditingItem({
                    ...editingItem,
                    settings: { ...editingItem.settings, displayDuration: value as any }
                  })}
                >
                  <SelectTrigger id="duration-select" aria-describedby="duration-help">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Random Fast">Random Fast (5-20s)</SelectItem>
                    <SelectItem value="Random Slow">Random Slow (30-60s)</SelectItem>
                    <SelectItem value="15s">15 seconds</SelectItem>
                    <SelectItem value="30s">30 seconds</SelectItem>
                    <SelectItem value="45s">45 seconds</SelectItem>
                    <SelectItem value="1 Minute">1 Minute</SelectItem>
                  </SelectContent>
                </Select>
                <p id="duration-help" className="text-xs text-slate-500">
                  How long this background should be displayed
                </p>
              </div>

              {/* Fade Effect */}
              <div className="space-y-2">
                <Label htmlFor="fade-select">Fade Effect</Label>
                <Select
                  value={editingItem.settings?.fadeInOut || '1.0s'}
                  onValueChange={(value) => setEditingItem({
                    ...editingItem,
                    settings: { ...editingItem.settings, fadeInOut: value as any }
                  })}
                >
                  <SelectTrigger id="fade-select" aria-describedby="fade-help">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No Fade">No Fade</SelectItem>
                    <SelectItem value="0.5s">0.5 seconds</SelectItem>
                    <SelectItem value="1.0s">1.0 seconds</SelectItem>
                    <SelectItem value="2.0s">2.0 seconds</SelectItem>
                  </SelectContent>
                </Select>
                <p id="fade-help" className="text-xs text-slate-500">
                  Transition effect when switching to the next background
                </p>
              </div>

              {/* Video-specific settings */}
              {editingItem.type === 'video' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="video-speed-select">Video Speed</Label>
                    <Select
                      value={editingItem.settings?.videoSpeed || '1.0'}
                      onValueChange={(value) => setEditingItem({
                        ...editingItem,
                        settings: { ...editingItem.settings, videoSpeed: value as any }
                      })}
                    >
                      <SelectTrigger id="video-speed-select" aria-describedby="video-speed-help">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.25">0.25x</SelectItem>
                        <SelectItem value="0.5">0.5x</SelectItem>
                        <SelectItem value="0.75">0.75x</SelectItem>
                        <SelectItem value="1.0">1.0x (Normal)</SelectItem>
                        <SelectItem value="1.25">1.25x</SelectItem>
                        <SelectItem value="1.5">1.5x</SelectItem>
                        <SelectItem value="1.75">1.75x</SelectItem>
                        <SelectItem value="2.0">2.0x</SelectItem>
                      </SelectContent>
                    </Select>
                    <p id="video-speed-help" className="text-xs text-slate-500">
                      Playback speed multiplier for video assets
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="direction-select">Playback Direction</Label>
                    <Select
                      value={editingItem.settings?.direction || '>> Forwards >>'}
                      onValueChange={(value) => setEditingItem({
                        ...editingItem,
                        settings: { ...editingItem.settings, direction: value as any }
                      })}
                    >
                      <SelectTrigger id="direction-select" aria-describedby="direction-help">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=">> Forwards >>">Forwards</SelectItem>
                        <SelectItem value="<< Backwards <<">Backwards</SelectItem>
                      </SelectContent>
                    </Select>
                    <p id="direction-help" className="text-xs text-slate-500">
                      Direction to play the video (forwards or backwards)
                    </p>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4" role="group" aria-label="Settings dialog actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSettingsDialog(false)}
                  aria-label="Cancel changes and close settings dialog"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  aria-label="Save settings and close dialog"
                >
                  Save Settings
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});