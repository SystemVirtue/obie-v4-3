// Clear localStorage and force iframe_search method
// Run this in browser console (F12) if search still shows CORS errors

console.log("🔧 Fixing search method...");

// Get current preferences
const prefs = localStorage.getItem('USER_PREFERENCES');

if (prefs) {
  try {
    const parsed = JSON.parse(prefs);
    console.log("📋 Current searchMethod:", parsed.searchMethod);
    
    // Update to iframe_search
    parsed.searchMethod = "iframe_search";
    localStorage.setItem('USER_PREFERENCES', JSON.stringify(parsed));
    
    console.log("✅ Updated searchMethod to: iframe_search");
    console.log("🔄 Reloading page...");
    
    // Reload the page
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (e) {
    console.error("❌ Error updating preferences:", e);
  }
} else {
  console.log("ℹ️ No USER_PREFERENCES found - default will be used");
  console.log("✅ Default is already set to iframe_search");
}
