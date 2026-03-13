# Downloader Hub

Installable downloader workspace for:

- Pinterest photos and videos
- YouTube videos and Shorts
- TikTok videos

It supports single URL input, batch URLs, extract URL mode, queue preview, local folder selection, duplicate handling, download history, and PWA install flow.

## Run

```bash
npm.cmd install
npm.cmd start
```

Open [http://localhost:4173](http://localhost:4173).

## Desktop App

```bash
npm.cmd run start:desktop
```

## Publish

This repo includes [render.yaml](C:\Users\Sayon\Documents\Tool Downloads Pin\render.yaml) for Render Blueprint deploys.

1. Push the project to GitHub.
2. Create a Render Blueprint using `render.yaml`.
3. Let Render run `npm install` and `npm start`.
4. Open the generated HTTPS URL and install the PWA.

## Verify

```bash
npm.cmd run check
```

## Notes

- The PWA shell opens offline, but internet is still required to validate and fetch media.
- Direct folder saving in browser mode depends on the File System Access API. Other browsers fall back to browser-managed downloads.
- The YouTube and TikTok extractors use `yt-dlp` metadata at runtime and download the helper binary automatically on first use.
