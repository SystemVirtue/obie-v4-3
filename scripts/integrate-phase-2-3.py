#!/usr/bin/env python3
"""
Automated integration script for Phase 2.3
Safely integrates hooks and components into Index.tsx
"""

import re
import sys

def read_file(filepath):
    """Read file contents"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(filepath, content):
    """Write file contents"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def integrate_phase_2_3(index_path):
    """Integrate hooks and components into Index.tsx"""
    
    print("Reading Index.tsx...")
    content = read_file(index_path)
    original_lines = len(content.split('\n'))
    
    # Step 1: Add hook imports after useApiKeyRotation
    print("Step 1: Adding hook imports...")
    hook_imports = '''import { useDisplayConfirmation } from "@/hooks/useDisplayConfirmation";
import { useStorageSync } from "@/hooks/useStorageSync";
import { usePlayerInitialization } from "@/hooks/usePlayerInitialization";'''
    
    content = content.replace(
        'import { useApiKeyRotation } from "@/hooks/useApiKeyRotation";',
        'import { useApiKeyRotation } from "@/hooks/useApiKeyRotation";\n' + hook_imports
    )
    
    # Step 2: Add component imports after CreditsDisplay
    print("Step 2: Adding component imports...")
    component_imports = '''import { NowPlayingTicker } from "@/components/NowPlayingTicker";
import { PlayerClosedNotification } from "@/components/PlayerClosedNotification";
import { MiniPlayer } from "@/components/MiniPlayer";
import { SearchButton } from "@/components/SearchButton";
import { UpcomingQueue } from "@/components/UpcomingQueue";
import { FooterControls } from "@/components/FooterControls";'''
    
    content = content.replace(
        'import { CreditsDisplay } from "@/components/CreditsDisplay";',
        'import { CreditsDisplay } from "@/components/CreditsDisplay";\n' + component_imports
    )
    
    # Step 3: Replace display confirmation logic with hook
    print("Step 3: Replacing display confirmation logic...")
    old_display_logic = r'''  // Display confirmation callbacks - must be defined before usePlayerManager
  const \[pendingDisplayConfirmation, setPendingDisplayConfirmation\] = useState<\{
    displayInfo: DisplayInfo;
    onConfirm: \(useFullscreen: boolean, rememberChoice: boolean\) => void;
    onCancel: \(\) => void;
  \} \| null>\(null\);

  const handleDisplayConfirmationNeeded = useCallback\(
    \(
      displayInfo: DisplayInfo,
      onConfirm: \(useFullscreen: boolean, rememberChoice: boolean\) => void,
      onCancel: \(\) => void,
    \) => \{
      setPendingDisplayConfirmation\(\{ displayInfo, onConfirm, onCancel \}\);
    \},
    \[\],
  \);

  const handleDisplayConfirmationResponse = useCallback\(
    \(useFullscreen: boolean, rememberChoice: boolean\) => \{
      if \(pendingDisplayConfirmation\) \{
        pendingDisplayConfirmation\.onConfirm\(useFullscreen, rememberChoice\);
        setPendingDisplayConfirmation\(null\);
      \}
    \},
    \[pendingDisplayConfirmation\],
  \);

  const handleDisplayConfirmationCancel = useCallback\(\(\) => \{
    if \(pendingDisplayConfirmation\) \{
      pendingDisplayConfirmation\.onCancel\(\);
      setPendingDisplayConfirmation\(null\);
    \}
  \}, \[pendingDisplayConfirmation\]\);'''
    
    new_display_logic = '''  // Display confirmation hook
  const displayConfirmation = useDisplayConfirmation();'''
    
    content = re.sub(old_display_logic, new_display_logic, content, flags=re.MULTILINE | re.DOTALL)
    
    # Step 4: Update usePlayerManager call
    print("Step 4: Updating usePlayerManager call...")
    content = content.replace(
        'handleDisplayConfirmationNeeded,',
        'displayConfirmation.handleDisplayConfirmationNeeded,'
    )
    
    # Step 5: Add storage sync and player initialization hooks
    print("Step 5: Adding storage sync and player initialization hooks...")
    hooks_addition = '''
  // Storage synchronization hook (player window communication)
  useStorageSync({
    state,
    setState,
    addLog,
    handleVideoEnded,
    toast,
  });

  // Player initialization hook (auto-start first song)
  usePlayerInitialization({
    state,
    initializePlayer,
    playNextSong,
  });'''
    
    content = content.replace(
        '  } = useApiKeyRotation(state, setState, toast);',
        '  } = useApiKeyRotation(state, setState, toast);\n' + hooks_addition
    )
    
    print("Writing changes back to Index.tsx...")
    write_file(index_path, content)
    
    new_lines = len(content.split('\n'))
    print(f"\n✅ Integration complete!")
    print(f"Original lines: {original_lines}")
    print(f"New lines: {new_lines}")
    print(f"Change: {new_lines - original_lines:+d} lines")
    
    print("\n⚠️  Manual steps still required:")
    print("1. Remove old player initialization logic (~74 lines)")
    print("2. Remove old storage sync logic (~282 lines)")
    print("3. Update DisplayConfirmationDialog props")
    print("4. Replace UI component JSX")
    print("\nSee PHASE2.3_INTEGRATION_GUIDE.md for details")

if __name__ == "__main__":
    index_path = "/Users/mikeclarkin/Documents/GitHub/obie-v4-3/src/pages/Index.tsx"
    
    try:
        integrate_phase_2_3(index_path)
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)
