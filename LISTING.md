# addons.mozilla.org listing — PiP Subtitles for Plex

Copy each section into the matching field when you submit the version
"On this site" in the Developer Hub.

## Name
PiP Subtitles for Plex

## Add-on URL (slug)
pip-subtitles-for-plex

## Summary (max 250 characters)
Shows subtitles from the Plex web player in Firefox's Picture-in-Picture window, including when you switch to another tab.

## Description
Firefox's Picture-in-Picture (PiP) window shows subtitles for many sites, but not for Plex: the Plex web player draws its subtitles itself, so they never reach the PiP window.

This add-on copies the subtitles Plex is showing into the video's standard subtitle track, so Firefox displays them in the PiP window, styled and sized by Firefox's own PiP subtitle settings.

**How to use it**
1. Play something in the Plex web player with subtitles turned on.
2. Open Picture-in-Picture as usual.
3. Subtitles appear in the PiP window and keep updating when you switch tabs.

**Where it works**
- app.plex.tv
- Plex's secure *.plex.direct addresses
- Your own server address or domain (for example http://192.168.1.10:32400/web): add it on the add-on's options page. Firefox asks for permission for that one site only.

**Limitations**
- Text subtitles only (SRT and similar). Styled ASS/SSA subtitles are shown as plain text.
- Image-based subtitles (PGS, VobSub) and subtitles burned into the video can't be shown, because there is no text to copy.
- If Plex changes how its web player draws subtitles, the add-on may need an update.

**Privacy**
The add-on collects no data and makes no network requests. It only reads the subtitle text on the Plex page you're watching.

This add-on is not affiliated with or endorsed by Plex, Inc.

## Category
Photos, Music & Videos

## Tags
picture-in-picture, subtitles, plex, video

## License
MIT License

## Privacy policy
Not needed: the add-on collects and transmits no data (declared as "none" in the manifest).

## Support email / website
Fill in your own (a support email or a GitHub issues page).

## Screenshots (recommended)
1. A Plex video in the PiP window with subtitles showing.
2. The options page with a local server added.

## Notes to reviewer
- No data collection, no network requests, no remote code.
- `content.js` runs on app.plex.tv, *.plex.direct and any server the user adds on the options page (via `optional_permissions`, requested per origin from a button click; registered with `contentScripts.register` in `background.js`).
- It adds a standard `TextTrack` to Plex's `<video>` and keeps one `VTTCue` updated with the text Plex currently shows in its `.libjass-subs` element. Firefox's built-in PiP window displays that track. `page.css` hides the duplicate on the page itself (`video::cue`).
- Plex's subtitle renderer (libjass) is driven by `requestAnimationFrame`, which stops in hidden tabs, which is exactly when PiP is used. While `document.hidden` is true, the page's `requestAnimationFrame`/`cancelAnimationFrame` are served by 100 ms timers instead (installed with `exportFunction`). In visible tabs, calls go straight to the native functions.
- The source is not minified or generated; the submitted files are the source.
- To test: play any title with SRT subtitles at app.plex.tv, open PiP, then switch tabs.
