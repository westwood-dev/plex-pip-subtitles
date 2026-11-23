# PiP Subtitles for Plex

Firefox add-on that shows Plex web player subtitles in Firefox's Picture-in-Picture window, including when you switch to another tab.

Works on app.plex.tv, `*.plex.direct`, and any self-hosted server address you add on the options page.

## Install

```sh
./install.sh           # build, sign (if needed) and open the .xpi in Firefox
./install.sh --run     # try it temporarily in a fresh Firefox (needs Node)
./install.sh --build   # just build dist/plex-pip-subtitles-<version>.zip
```

Release Firefox only installs signed add-ons permanently. To sign, get AMO API credentials from <https://addons.mozilla.org/developers/addon/api/key/> and export them first:

```sh
export WEB_EXT_API_KEY=user:12345:67
export WEB_EXT_API_SECRET=...
./install.sh
```

Each signed version is unique on AMO, so bump `version` in `src/manifest.json` before signing a new build.

For development, load `src/manifest.json` from `about:debugging#/runtime/this-firefox`.

## Layout

- `src/` — the extension (submitted to AMO as-is, no build step)
- `LISTING.md` — addons.mozilla.org listing text and reviewer notes
- `install.sh` — build / sign / install

## Limitations

Text subtitles only. Image-based subtitles (PGS, VobSub) and burned-in subtitles can't be shown. See `LISTING.md` for details.

Not affiliated with or endorsed by Plex, Inc. MIT licensed.
