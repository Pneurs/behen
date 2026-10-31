// Behen.pk browser push notifications worker (push only — no page caching).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const title = data.title || "Behen.pk";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "You have a new message",
      icon: "/favicon.png",
      badge: "/favicon.png",
      tag: data.tag,
      renotify: true,
      data: { url: data.url || "/all-chats" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if ("focus" in c) { await c.focus(); if ("navigate" in c) return c.navigate(url); return; }
      }
      return self.clients.openWindow(url);
    })()
  );
});
