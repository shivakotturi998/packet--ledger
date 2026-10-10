Pocket Ledger — run it the right way

DO NOT double-click index.html.
Browsers block notifications + service worker on file://.

EASIEST (Linux):
  Double-click start-server.sh  OR  right-click > Run
  If it asks, choose "Run" / "Run in Terminal".
  It opens http://localhost:8080/index.html automatically.
  Keep that terminal open while using the app.

ALTERNATIVE (VS Code):
  Right-click index.html > Open with Live Server
  Opens http://127.0.0.1:5500/... — notifications work there.

THEN:
  1. Ctrl+Shift+R to reload fresh.
  2. Scroll to Notifications & alerts.
  3. Tick Enable notifications.
  4. Click Enable notifications button > Allow.
  5. Click Send test > you get a system notification.

ANDROID APK (for closed-app reminders):
  Needs Android Studio once:
    npm install
    npx cap add android
    npx cap sync android
    npx cap open android
  Add POST_NOTIFICATIONS / SCHEDULE_EXACT_ALARM / RECEIVE_BOOT_COMPLETED
  permissions, build APK.

