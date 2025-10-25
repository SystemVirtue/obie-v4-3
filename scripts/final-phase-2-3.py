#!/usr/bin/env python3
"""
Final Phase 2.3 Integration Script
Carefully integrates hooks and components into Index.tsx
"""

import re

def read_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(filepath, content):
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    file_path = 'src/pages/Index.tsx'
    print(f"Reading {file_path}...")
    content = read_file(file_path)
    original_lines = len(content.splitlines())
    print(f"Original file: {original_lines} lines")
    
    # Step 1: Add hook imports after existing imports
    print("\n1. Adding hook imports...")
    import_pattern = r'(import \{ ApiKeyTestDialog \} from "@/components/ApiKeyTestDialog";)'
    import_addition = r'\1\nimport { useDisplayConfirmation } from "@/hooks/useDisplayConfirmation";\nimport { useStorageSync } from "@/hooks/useStorageSync";\nimport { usePlayerInitialization } from "@/hooks/usePlayerInitialization";'
    content = re.sub(import_pattern, import_addition, content)
    
    # Step 2: Add component imports
    print("2. Adding component imports...")
    import_addition_2 = r'\1\nimport { NowPlayingTicker } from "@/components/NowPlayingTicker";\nimport { PlayerClosedNotification } from "@/components/PlayerClosedNotification";\nimport { MiniPlayer } from "@/components/MiniPlayer";\nimport { SearchButton } from "@/components/SearchButton";\nimport { UpcomingQueue } from "@/components/UpcomingQueue";\nimport { FooterControls } from "@/components/FooterControls";'
    content = re.sub(import_pattern, import_addition_2, content)
    
    # Step 3: Replace display confirmation logic with hook
    print("3. Replacing display confirmation logic...")
    display_conf_pattern = r'  const \[pendingDisplayConfirmation, setPendingDisplayConfirmation\] =\s+useState<\{[^}]+\} \| null>\(null\);[\s\S]*?const handleDisplayConfirmationCancel = useCallback\([^}]+\}\);'
    display_conf_replacement = '  // Display confirmation hook\n  const displayConfirmation = useDisplayConfirmation();'
    content = re.sub(display_conf_pattern, display_conf_replacement, content, flags=re.MULTILINE)
    
    # Step 4: Add useStorageSync call (after display confirmation hook)
    print("4. Adding useStorageSync hook call...")
    storage_sync_addition = '''
  // Storage synchronization hook (player window communication)
  useStorageSync({
    state,
    setState,
    addLog,
    handleVideoEnded,
    toast,
  });'''
    content = content.replace('  // Display confirmation hook\n  const displayConfirmation = useDisplayConfirmation();',
                             '  // Display confirmation hook\n  const displayConfirmation = useDisplayConfirmation();' + storage_sync_addition)
    
    # Step 5: Add usePlayerInitialization call
    print("5. Adding usePlayerInitialization hook call...")
    player_init_addition = '''

  // Player initialization hook (auto-start first song)
  usePlayerInitialization({
    state,
    initializePlayer,
    playNextSong,
  });'''
    content = content.replace(storage_sync_addition, storage_sync_addition + player_init_addition)
    
    # Step 6: Update usePlayerManager call
    print("6. Updating usePlayerManager call...")
    content = re.sub(
        r'handleDisplayConfirmationNeeded,',
        'displayConfirmation.handleDisplayConfirmationNeeded,',
        content
    )
    
    # Step 7: Update DisplayConfirmationDialog
    print("7. Updating DisplayConfirmationDialog props...")
    dialog_pattern = r'\{pendingDisplayConfirmation && \(\s*<DisplayConfirmationDialog\s+displayInfo=\{pendingDisplayConfirmation\.displayInfo\}\s+onConfirm=\{handleDisplayConfirmationResponse\}\s+onCancel=\{handleDisplayConfirmationCancel\}\s+/>\s*\)\}'
    dialog_replacement = '''<DisplayConfirmationDialog
        isOpen={!!displayConfirmation.pendingDisplayConfirmation}
        displayInfo={displayConfirmation.pendingDisplayConfirmation?.displayInfo || null}
        onConfirm={displayConfirmation.handleDisplayConfirmationResponse}
        onCancel={displayConfirmation.handleDisplayConfirmationCancel}
      />'''
    content = re.sub(dialog_pattern, dialog_replacement, content, flags=re.MULTILINE)
    
    # Step 8: Replace NowPlayingTicker JSX
    print("8. Replacing NowPlayingTicker component...")
    now_playing_pattern = r'\{/\* Now Playing Ticker - Responsive positioning and sizing \*/\}[\s\S]*?</Card>\s*</div>'
    now_playing_replacement = '{/* Now Playing Ticker */}\n        <NowPlayingTicker currentlyPlaying={state.currentlyPlaying} />'
    content = re.sub(now_playing_pattern, now_playing_replacement, content)
    
    # Step 9: Replace PlayerClosedNotification JSX
    print("9. Replacing PlayerClosedNotification component...")
    player_closed_pattern = r'\{/\* Player Closed Notification - Responsive positioning \*/\}[\s\S]*?\{/\* Credits display has been moved to the CreditsDisplay component \*/\}'
    player_closed_replacement = '''{/* Player Window Closed Warning */}
        <PlayerClosedNotification
          playerWindow={state.playerWindow}
          isPlayerRunning={state.isPlayerRunning}
          onReopenPlayer={initializePlayer}
        />

        {/* Credits display has been moved to the CreditsDisplay component */}'''
    content = re.sub(player_closed_pattern, player_closed_replacement, content, flags=re.MULTILINE)
    
    # Step 10: Replace MiniPlayer JSX
    print("10. Replacing MiniPlayer component...")
    mini_player_pattern = r'\{/\* Search results embedded player \*/\}[\s\S]*?</div>\s*\)\s*\}\s*</div>'
    mini_player_replacement = '''{/* Mini Player */}
        <MiniPlayer
          videoId={state.currentVideoId}
          showMiniPlayer={state.showMiniPlayer}
        />'''
    content = re.sub(mini_player_pattern, mini_player_replacement, content)
    
    # Step 11: Replace SearchButton JSX
    print("11. Replacing SearchButton component...")
    search_button_pattern = r'\{/\* Responsive search button \*/\}[\s\S]*?</Button>\s*</div>'
    search_button_replacement = '''{/* Search Button */}
        <SearchButton
          onClick={() =>
            setState((prev) => ({
              ...prev,
              isSearchOpen: true,
              showKeyboard: true,
              showSearchResults: false,
            }))
          }
        />'''
    content = re.sub(search_button_pattern, search_button_replacement, content)
    
    # Step 12: Replace UpcomingQueue JSX (Coming Up ticker + Test Mode)
    print("12. Replacing UpcomingQueue component...")
    upcoming_pattern = r'\{/\* Test Mode Indicator - positioned above Coming Up ticker \*/\}[\s\S]*?</div>\s*</div>'
    upcoming_replacement = '''{/* Upcoming Queue */}
        <UpcomingQueue
          upcomingTitles={getUpcomingTitles()}
          testMode={state.testMode}
        />'''
    content = re.sub(upcoming_pattern, upcoming_replacement, content)
    
    # Step 13: Replace FooterControls JSX
    print("13. Replacing FooterControls component...")
    footer_pattern = r'\{/\* Responsive admin button \*/\}[\s\S]*?</Button>\s*</div>'
    footer_replacement = '''{/* Footer Controls */}
        <FooterControls
          onOpenAdmin={() =>
            setState((prev) => ({ ...prev, isAdminOpen: true }))
          }
        />'''
    content = re.sub(footer_pattern, footer_replacement, content)
    
    # Write the modified content
    print(f"\nWriting changes to {file_path}...")
    write_file(file_path, content)
    
    new_lines = len(content.splitlines())
    reduction = original_lines - new_lines
    percentage = (reduction / original_lines) * 100
    
    print(f"\n✅ INTEGRATION COMPLETE!")
    print(f"Original lines: {original_lines}")
    print(f"New lines: {new_lines}")
    print(f"Reduction: {reduction} lines ({percentage:.1f}%)")

if __name__ == '__main__':
    main()
