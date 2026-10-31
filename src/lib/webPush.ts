import { supabase } from "@/integrations/supabase/client";

// Public VAPID key (safe to ship); private half lives in backend secrets.
export const VAPID_PUBLIC_KEY =
  "BGY5p3G8avri2Vcnn9caXumgVeTrjRAf-qxhd96P89j5rh2g6ry_HqvG9QDQTjalgBuLcxvFYXqnLxLczX6WxUI";

export const isWebPushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window &&
  window.self === window.top; // not inside the editor preview iframe

const toUint8 = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Registers the push worker, subscribes this browser and saves it for the signed-in user. */
export async function subscribeWebPush(): Promise<boolean> {
  if (!isWebPushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toUint8(VAPID_PUBLIC_KEY),
    });
  }
  const j = sub.toJSON();
  const { error } = await supabase.functions.invoke("web-push", {
    body: { action: "subscribe", subscription: { endpoint: j.endpoint, keys: j.keys } },
  });
  return !error;
}

export const notifyChatPush = (conversationId: string) =>
  supabase.functions
    .invoke("web-push", { body: { action: "notify", conversation_id: conversationId } })
    .catch(() => {});
