/*
 * PiP Subtitles for Plex
 *
 * Firefox's Picture-in-Picture (PiP) window shows subtitles from a video's
 * standard subtitle tracks. The Plex web player doesn't use those: it draws
 * subtitles itself (with the libjass library) into a ".libjass-subs" element
 * on top of the video. This script copies whatever Plex is currently showing
 * into a standard subtitle track on the video, which PiP then displays.
 *
 * Only text subtitles (SRT, ASS/SSA as plain text) can be copied. Image-based
 * (PGS/VobSub) or burned-in subtitles have no text to copy.
 */
"use strict";

// The same page can be matched twice (e.g. a *.plex.direct address that was
// also added on the options page); only run once per page.
(function () {
  if (window.__pipSubtitlesForPlexLoaded) {
    return;
  }
  window.__pipSubtitlesForPlexLoaded = true;

  const TRACK_LABEL = "Plex subtitles (PiP)";
  const pageWindow = window.wrappedJSObject;

  /*
   * Part 1: keep Plex's subtitle clock running while the tab is hidden.
   *
   * libjass advances subtitles with requestAnimationFrame, which browsers pause
   * in hidden tabs. That's exactly when PiP is in use, so subtitles would freeze.
   * While the tab is hidden, the page's animation-frame requests are served by
   * short timers instead; while visible, they go straight to the real thing.
   */
  (function keepAnimationFramesRunningWhenHidden() {
    const nativeRequest = window.requestAnimationFrame.bind(window);
    const nativeCancel = window.cancelAnimationFrame.bind(window);
    const HIDDEN_INTERVAL_MS = 100;
    const pending = new Map(); // our id -> { callback, nativeId, timerId }
    let nextId = 1;

    function run(id, timestamp) {
      const entry = pending.get(id);
      if (!entry) {
        return;
      }
      pending.delete(id);
      try {
        entry.callback(timestamp);
      } catch (error) {
        console.error(error);
      }
    }

    function schedule(id, entry) {
      entry.nativeId = null;
      entry.timerId = null;
      if (document.hidden) {
        entry.timerId = setTimeout(() => run(id, performance.now()), HIDDEN_INTERVAL_MS);
      } else {
        entry.nativeId = nativeRequest(timestamp => run(id, timestamp));
      }
    }

    function unschedule(entry) {
      if (entry.nativeId !== null) {
        nativeCancel(entry.nativeId);
      }
      if (entry.timerId !== null) {
        clearTimeout(entry.timerId);
      }
    }

    exportFunction(
      function requestAnimationFrame(callback) {
        const id = nextId++;
        const entry = { callback };
        pending.set(id, entry);
        schedule(id, entry);
        return id;
      },
      pageWindow,
      { defineAs: "requestAnimationFrame" }
    );

    exportFunction(
      function cancelAnimationFrame(id) {
        const entry = pending.get(id);
        if (entry) {
          pending.delete(id);
          unschedule(entry);
        }
      },
      pageWindow,
      { defineAs: "cancelAnimationFrame" }
    );

    // Requests made just before the tab was hidden would otherwise wait for a
    // frame that never comes, so move everything pending to the other method.
    document.addEventListener("visibilitychange", () => {
      for (const [id, entry] of pending) {
        unschedule(entry);
        schedule(id, entry);
      }
    });
  })();

  /*
   * Part 2: copy Plex's on-screen subtitle text into a subtitle track.
   */
  const tracks = new WeakMap(); // <video> -> TextTrack
  const watchedVideos = new WeakSet();

  function findVideo() {
    // Plex has one main player <video>; pick the largest one if there are more.
    let best = null;
    let bestArea = 0;
    for (const video of document.querySelectorAll("video")) {
      const rect = video.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area > bestArea || (!best && video.readyState > 0)) {
        best = video;
        bestArea = area;
      }
    }
    return best;
  }

  function getTrack(video) {
    let track = tracks.get(video);
    if (!track) {
      track = video.addTextTrack("subtitles", TRACK_LABEL, "und");
      tracks.set(video, track);
    }
    // PiP only shows tracks in "showing" mode. page.css hides it on the page.
    if (track.mode !== "showing") {
      track.mode = "showing";
    }
    return track;
  }

  function currentSubtitleText() {
    const parts = [];
    for (const element of document.querySelectorAll(".libjass-subs")) {
      const text = element.innerText.trim();
      if (text) {
        parts.push(text);
      }
    }
    return parts.join("\n");
  }

  let lastText = null;

  function update(force = false) {
    const video = findVideo();
    if (!video) {
      return;
    }
    watchVideo(video);
    const text = currentSubtitleText();
    if (!force && text === lastText) {
      return;
    }
    lastText = text;

    const track = getTrack(video);
    for (const cue of Array.from(track.cues || [])) {
      track.removeCue(cue);
    }
    if (text) {
      // The cue starts "now" and runs until Plex shows something else, at
      // which point it is replaced.
      const now = video.currentTime;
      track.addCue(new VTTCue(Math.max(0, now - 0.05), now + 24 * 60 * 60, text));
    }
  }

  function watchVideo(video) {
    if (watchedVideos.has(video)) {
      return;
    }
    watchedVideos.add(video);
    // After a seek, re-place the cue at the new position.
    video.addEventListener("seeked", () => update(true));
  }

  let updateQueued = false;
  function queueUpdate() {
    if (!updateQueued) {
      updateQueued = true;
      queueMicrotask(() => {
        updateQueued = false;
        update();
      });
    }
  }

  function isInsideSubtitles(node) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return !!element && !!element.closest(".libjass-subs, .libjass-wrapper");
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (isInsideSubtitles(mutation.target)) {
        queueUpdate();
        return;
      }
      for (const node of mutation.removedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE &&
            (node.matches(".libjass-subs, .libjass-wrapper") ||
             node.querySelector(".libjass-subs"))) {
          queueUpdate();
          return;
        }
      }
    }
  });

  function start() {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    update(true);
  }

  if (document.documentElement) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  }
})();
