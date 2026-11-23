"use strict";

const form = document.getElementById("add-form");
const input = document.getElementById("server");
const message = document.getElementById("message");
const list = document.getElementById("servers");

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

// "http://192.168.1.10:32400/web" -> "http://192.168.1.10/*"
// (Firefox match patterns can't include a port; they match every port.)
function toPattern(address) {
  let text = address.trim();
  if (!/^[a-z]+:\/\//i.test(text)) {
    text = "http://" + text;
  }
  const url = new URL(text);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Use an http:// or https:// address.");
  }
  return `${url.protocol}//${url.hostname}/*`;
}

async function getServers() {
  const { servers = [] } = await browser.storage.local.get("servers");
  return servers;
}

async function render() {
  const servers = await getServers();
  list.replaceChildren();
  for (const pattern of servers) {
    const item = document.createElement("li");
    const label = document.createElement("code");
    label.textContent = pattern.replace(/\/\*$/, "");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", async () => {
      const remaining = (await getServers()).filter(p => p !== pattern);
      await browser.storage.local.set({ servers: remaining });
      await browser.permissions.remove({ origins: [pattern] });
      showMessage("Removed. Reload any open Plex tabs on that server.");
      render();
    });
    item.append(label, remove);
    list.append(item);
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  let pattern;
  try {
    pattern = toPattern(input.value);
  } catch (error) {
    showMessage(error.message || "That doesn't look like a web address.", true);
    return;
  }
  // Must be called straight from the click so Firefox shows its prompt.
  const granted = await browser.permissions.request({ origins: [pattern] });
  if (!granted) {
    showMessage("Firefox didn't allow access, so the server wasn't added.", true);
    return;
  }
  const servers = await getServers();
  if (!servers.includes(pattern)) {
    servers.push(pattern);
    await browser.storage.local.set({ servers });
  }
  input.value = "";
  showMessage("Added. Reload any open Plex tabs on that server.");
  render();
});

render();
