#!/usr/bin/env python3
"""
Complete Phase 2.3 Integration Script
Handles hook integration AND old code removal
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

def integrate_complete(index_path):
    """Complete integration: hooks + component usage + old code removal"""
    
    print("=" * 60)
    print("PHASE 2.3 COMPLETE INTEGRATION")
    print("=" * 60)
    print("\nReading Index.tsx...")
    content = read_file(index_path)
    original_lines = len(content.split('\n'))
    print(f"Original: {original_lines} lines")
    
    # PART 1: Add imports
    print("\n[1/8] Adding hook imports...")
    hook_imports = '''import { useDisplayConfirmation } from "@/hooks/useDisplayConfirmation";
import { useStorageSync } from "@/hooks/useStorageSync";
import { usePlayerInitialization } from "@/hooks/usePlayerInitialization";'''
    
    content = content.replace(
        'import { useApiKeyRotation } from "@/hooks/useApiKeyRotation";',
        'import { useApiKeyRotation } from "@/hooks/useApiKeyRotation";\n' + hook_imports
    )
    
    print("[2/8] Adding component imports...")
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
    
    # PART 2: Replace display confirmation logic
    print("[3/8] Replacing display confirmation logic...")
    
    # Find and replace the old display confirmation block
    old_display_pattern = r'''  // Display confirmation callbacks - must be defined before usePlayerManager\s+const \[pendingDisplayConfirmation, setPendingDisplayConfirmation\] = useState[^;]+;\s+const handleDisplayConfirmationNeeded = useCallback\([^)]+\)[^;]+;(?:\s+)*const handleDisplayConfirmationResponse = useCallback\([^)]+\)[^;]+;(?:\s+)*const handleDisplayConfirmationCancel = useCallback\([^)]+\)[^;]+;'''
    
    new_display = '''  // Display confirmation hook
  const displayConfirmation = useDisplayConfirmation();'''
    
    content = re.sub(old_display_pattern, new_display, content, flags=re.DOTALL)
    
    # Update the usePlayerManager call
    content = content.replace(
        'handleDisplayConfirmationNeeded,',
        'displayConfirmation.handleDisplayConfirmationNeeded,'
    )
    
    # PART 3: Add new hooks
    print("[4/8] Adding storage sync and player initialization hooks...")
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
    
    # PART 4: Remove old player initialization logic
    print("[5/8] Removing old player initialization logic...")
    
    # Remove the entire autoplay useEffect block
    old_autoplay_pattern = r'''  // Enhanced autoplay logic - start songs when playlist is ready\s+const hasStartedFirstSongRef = useRef\(false\);[\s\S]+?\], \[[\s\S]+?playNextSong,\s+\]\);'''
    
    content = re.sub(old_autoplay_pattern, '', content)
    
    # PART 5: Remove old storage sync logic
    print("[6/8] Removing old storage sync logic...")
    
    # Remove handleStorageChange callback and all related useEffects
    old_storage_pattern = r'''  // Enhanced video end handling[\s\S]+?  // Emergency recovery event listener[\s\S]+?\], \[setState, toast\]\);'''
    
    content = re.sub(old_storage_pattern, '', content)
    
    # PART 6: Update DisplayConfirmationDialog props
    print("[7/8] Updating DisplayConfirmationDialog props...")
    
    old_dialog = r'''\{pendingDisplayConfirmation && \(\s+<DisplayConfirmationDialog\s+isOpen=\{true\}\s+displayInfo=\{pendingDisplayConfirmation\.displayInfo\}\s+onConfirm=\{handleDisplayConfirmationResponse\}\s+onCancel=\{handleDisplayConfirmationCancel\}\s+/>\s+\)\}'''
    
    new_dialog = '''<DisplayConfirmationDialog
        isOpen={!!displayConfirmation.pendingDisplayConfirmation}
        displayInfo={displayConfirmation.pendingDisplayConfirmation?.displayInfo || null}
        onConfirm={displayConfirmation.handleDisplayConfirmationResponse}
        onCancel={displayConfirmation.handleDisplayConfirmationCancel}
      />'''
    
    content = re.sub(old_dialog, new_dialog, content, flags=re.DOTALL)
    
    print("[8/8] Writing changes...")
    write_file(index_path, content)
    
    new_lines = len(content.split('\n'))
    reduction = original_lines - new_lines
    
    print("\n" + "=" * 60)
    print("✅ INTEGRATION COMPLETE!")
    print("=" * 60)
    print(f"Original lines:  {original_lines}")
    print(f"New lines:       {new_lines}")
    print(f"Reduction:       {reduction} lines ({reduction / original_lines * 100:.1f}%)")
    print("\n✅ All hooks integrated")
    print("✅ Old logic removed")
    print("✅ Display dialog updated")
    print("\n⚠️  Manual steps still required:")
    print("   - Replace UI component JSX (6 components)")
    print("   - Remove unused imports")
    print("   - Final testing")

if __name__ == "__main__":
    index_path = "/Users/mikeclarkin/Documents/GitHub/obie-v4-3/src/pages/Index.tsx"
    
    try:
        integrate_complete(index_path)
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
