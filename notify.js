/* Pocket Ledger — offline local notifications helper.
   Fully offline: uses Capacitor LocalNotifications on Android APK,
   falls back to Web Notification API when app is open, else in-app toast.
   No server, no internet needed. */
(function () {
  function capPlugin() {
    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
        return window.Capacitor.Plugins.LocalNotifications;
      }
    } catch (e) {}
    return null;
  }
  function canWebNotify() {
    try { return ('Notification' in window); } catch (e) { return false; }
  }
  async function requestPermission() {
    var cap = capPlugin();
    if (cap && cap.requestPermissions) {
      try {
        var r = await cap.requestPermissions();
        return (r && (r.display === 'granted' || r.display === true)) || true;
      } catch (e) { return false; }
    }
    if (canWebNotify()) {
      try {
        if (Notification.permission === 'granted') return true;
        var p = await Notification.requestPermission();
        return p === 'granted';
      } catch (e) { return false; }
    }
    return false;
  }
  async function permissionState() {
    var cap = capPlugin();
    if (cap && cap.checkPermissions) {
      try { return await cap.checkPermissions(); } catch (e) {}
    }
    if (canWebNotify()) return { display: Notification.permission };
    return { display: 'unavailable' };
  }
  async function instant(id, title, body) {
    var cap = capPlugin();
    if (cap && cap.schedule) {
      try {
        await cap.schedule({ notifications: [{ id: id, title: title, body: body, schedule: { at: new Date(Date.now() + 500) }, smallIcon: 'ic_launcher', sound: 'default' }] });
        return 'native';
      } catch (e) { return 'native-error:' + (e && e.message); }
    }
    if (!canWebNotify()) return 'no-api';
    try { if (Notification.permission === 'denied') return 'denied'; } catch (e) {}
    try { if (Notification.permission !== 'granted') return 'need-permission:' + Notification.permission; } catch (e) {}
    // Try service worker with timeout (serviceWorker.ready hangs forever on file:// with no SW).
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.ready && location.protocol !== 'file:') {
        var reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise(function (_, rej) { setTimeout(function () { rej(new Error('sw-timeout')); }, 2000); })
        ]);
        if (reg && reg.showNotification) {
          await reg.showNotification(title, { body: body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
          return 'web-sw';
        }
      }
    } catch (e) { /* fall through to plain Notification */ }
    try {
      new Notification(title, { body: body, icon: 'icons/icon-192.png' });
      return 'web';
    } catch (e) { return 'web-error:' + (e && e.message); }
  }
  async function scheduleDaily(id, title, body, hour, minute) {
    var cap = capPlugin();
    if (cap && cap.schedule) {
      try {
        try { await cap.cancel({ notifications: [{ id: id }] }); } catch (e) {}
        await cap.schedule({
          notifications: [{ id: id, title: title, body: body, schedule: { on: { hour: hour, minute: minute }, every: 'day', allowWhileIdle: true }, smallIcon: 'ic_launcher', sound: 'default', autoCancel: true }]
        });
        return 'native';
      } catch (e) { return 'error:' + (e && e.message); }
    }
    return 'unavailable-web';
  }
  async function cancel(ids) {
    var cap = capPlugin();
    if (cap && cap.cancel) {
      try { await cap.cancel({ notifications: ids.map(function (i) { return { id: i }; }) }); } catch (e) {}
    }
  }
  window.PLNotify = {
    requestPermission: requestPermission,
    permissionState: permissionState,
    instant: instant,
    scheduleDaily: scheduleDaily,
    cancel: cancel,
    isNative: function () { return !!capPlugin(); },
    canWebNotify: canWebNotify
  };
})();
