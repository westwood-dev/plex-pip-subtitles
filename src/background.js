/*
 * Runs the subtitle script on Plex servers the user has added on the options
 * page (for example http://192.168.1.10:32400/web). app.plex.tv and
 * *.plex.direct are covered by the manifest; anything else needs the user to
 * add it and grant access to that one site.
 *
 * Saved in storage.local as { servers: ["http://192.168.1.10/*", ...] }.
 */
"use strict";

const registrations = new Map(); // match pattern -> registered content script

async function registerServer(pattern) {
  if (registrations.has(pattern)) {
    return;
  }
  const granted = await browser.permissions.contains({ origins: [pattern] });
  if (!granted) {
    return;
  }
  const registration = await browser.contentScripts.register({
    matches: [pattern],
    js: [{ file: "content.js" }],
    css: [{ file: "page.css" }],
    runAt: "document_start",
  });
  registrations.set(pattern, registration);
}

async function unregisterServer(pattern) {
  const registration = registrations.get(pattern);
  if (registration) {
    await registration.unregister();
    registrations.delete(pattern);
  }
}

async function syncRegistrations() {
  const { servers = [] } = await browser.storage.local.get("servers");
  for (const pattern of registrations.keys()) {
    if (!servers.includes(pattern)) {
      await unregisterServer(pattern);
    }
  }
  for (const pattern of servers) {
    await registerServer(pattern);
  }
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.servers) {
    syncRegistrations();
  }
});
browser.permissions.onAdded.addListener(syncRegistrations);
browser.permissions.onRemoved.addListener(async ({ origins = [] }) => {
  for (const pattern of origins) {
    await unregisterServer(pattern);
  }
});

syncRegistrations();
