/**
 * CHANGELOG - Phase 3
 * 
 * ADDED:
 * - Custom playlist management UI
 * - Add/remove/rename playlists
 * - Playlist validation before adding
 * - LocalStorage persistence for custom playlists
 * 
 * TESTING:
 * - Test adding valid playlist URLs
 * - Test invalid URLs show errors
 * - Test renaming playlists
 * - Test removing playlists
 * - Verify persistence across page refresh
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { validatePlaylistUrl } from '@/utils/playlistValidator';
import { toast } from './ui/use-toast';

interface CustomPlaylist {
  id: string;
  name: string;
  url: string;
  videoCount: number;
  addedAt: string;
  isDefault: boolean;
}

interface PlaylistManagerProps {
  onPlaylistSelect: (playlistId: string) => void;
}

export const PlaylistManager: React.FC<PlaylistManagerProps> = ({ onPlaylistSelect }) => {
  const [playlists, setPlaylists] = useState<CustomPlaylist[]>([]);
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Load playlists from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('CUSTOM_PLAYLISTS');
      if (saved) {
        const parsed = JSON.parse(saved);
        setPlaylists(parsed);
      }
    } catch (error) {
      console.error('[PlaylistManager] Error loading playlists:', error);
    }
  }, []);

  // Save playlists to localStorage
  const savePlaylists = (updatedPlaylists: CustomPlaylist[]) => {
    try {
      localStorage.setItem('CUSTOM_PLAYLISTS', JSON.stringify(updatedPlaylists));
      setPlaylists(updatedPlaylists);
    } catch (error) {
      console.error('[PlaylistManager] Error saving playlists:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save playlist changes',
        variant: 'destructive',
      });
    }
  };

  // Add new playlist
  const handleAddPlaylist = async () => {
    if (!newPlaylistUrl.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a playlist URL or ID',
        variant: 'destructive',
      });
      return;
    }

    // Validate playlist URL
    const validation = validatePlaylistUrl(newPlaylistUrl);
    if (!validation.isValid) {
      toast({
        title: 'Invalid Playlist',
        description: validation.error || 'Please enter a valid YouTube playlist URL',
        variant: 'destructive',
      });
      return;
    }

    const playlistId = validation.playlistId!;

    // Check for duplicates
    if (playlists.some(p => p.url === playlistId)) {
      toast({
        title: 'Duplicate Playlist',
        description: 'This playlist is already in your list',
        variant: 'destructive',
      });
      return;
    }

    const newPlaylist: CustomPlaylist = {
      id: crypto.randomUUID(),
      name: newPlaylistName.trim() || `Playlist ${playlists.length + 1}`,
      url: playlistId,
      videoCount: 0, // Will be updated when loaded
      addedAt: new Date().toISOString(),
      isDefault: false,
    };

    savePlaylists([...playlists, newPlaylist]);

    setNewPlaylistUrl('');
    setNewPlaylistName('');
    setIsAdding(false);

    toast({
      title: 'Playlist Added',
      description: `${newPlaylist.name} has been added to your collection`,
    });
  };

  // Remove playlist
  const handleRemovePlaylist = (id: string) => {
    const playlist = playlists.find(p => p.id === id);
    if (playlist?.isDefault) {
      toast({
        title: 'Cannot Remove',
        description: 'Default playlists cannot be removed',
        variant: 'destructive',
      });
      return;
    }

    const updated = playlists.filter(p => p.id !== id);
    savePlaylists(updated);

    toast({
      title: 'Playlist Removed',
      description: 'Playlist has been removed from your collection',
    });
  };

  // Start editing playlist name
  const startEdit = (playlist: CustomPlaylist) => {
    setEditingId(playlist.id);
    setEditName(playlist.name);
  };

  // Save edited name
  const saveEdit = (id: string) => {
    if (!editName.trim()) {
      toast({
        title: 'Invalid Name',
        description: 'Playlist name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    const updated = playlists.map(p =>
      p.id === id ? { ...p, name: editName.trim() } : p
    );
    savePlaylists(updated);

    setEditingId(null);
    setEditName('');

    toast({
      title: 'Playlist Renamed',
      description: 'Playlist name has been updated',
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Custom Playlists</CardTitle>
          <CardDescription>
            Add and manage your YouTube playlists
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Playlist */}
          {isAdding ? (
            <div className="space-y-2 p-4 border rounded-lg">
              <Input
                placeholder="Playlist URL or ID"
                value={newPlaylistUrl}
                onChange={(e) => setNewPlaylistUrl(e.target.value)}
              />
              <Input
                placeholder="Playlist Name (optional)"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={handleAddPlaylist} size="sm">
                  <Check className="h-4 w-4 mr-2" />
                  Add
                </Button>
                <Button
                  onClick={() => {
                    setIsAdding(false);
                    setNewPlaylistUrl('');
                    setNewPlaylistName('');
                  }}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setIsAdding(true)} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Playlist
            </Button>
          )}

          {/* Playlist List */}
          {playlists.length > 0 ? (
            <div className="space-y-2">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  {editingId === playlist.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={() => saveEdit(playlist.id)} size="sm" variant="ghost">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button onClick={cancelEdit} size="sm" variant="ghost">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => onPlaylistSelect(playlist.url)}
                      >
                        <p className="font-medium">{playlist.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {playlist.url}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => startEdit(playlist)}
                          size="sm"
                          variant="ghost"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {!playlist.isDefault && (
                          <Button
                            onClick={() => handleRemovePlaylist(playlist.id)}
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              No custom playlists yet. Add one to get started!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
