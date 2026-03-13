const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");

const YTDlpWrap = require("yt-dlp-wrap").default;

const CACHE_DIR = path.join(__dirname, "..", ".cache", "yt-dlp");
const BINARY_NAME = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
const BINARY_PATH = path.join(CACHE_DIR, BINARY_NAME);

let ensureBinaryPromise = null;
let wrapInstance = null;

async function ensureYtDlpBinary() {
  if (fs.existsSync(BINARY_PATH)) {
    await ensureExecutable();
    return BINARY_PATH;
  }

  if (!ensureBinaryPromise) {
    ensureBinaryPromise = (async () => {
      await fsPromises.mkdir(CACHE_DIR, { recursive: true });
      await YTDlpWrap.downloadFromGithub(BINARY_PATH);
      await ensureExecutable();
      return BINARY_PATH;
    })();
  }

  return ensureBinaryPromise;
}

async function getYtDlp() {
  await ensureYtDlpBinary();
  if (!wrapInstance) {
    wrapInstance = new YTDlpWrap(BINARY_PATH);
  }
  return wrapInstance;
}

async function getVideoInfo(url, extraArgs = []) {
  const ytDlp = await getYtDlp();
  const stdout = await ytDlp.execPromise([
    url,
    "--dump-single-json",
    "--no-warnings",
    "--skip-download",
    "--no-playlist",
    "--js-runtimes",
    "node",
    ...extraArgs,
  ]);

  return JSON.parse(stdout);
}

async function downloadToFile({ sourceUrl, formatId, outputPath }) {
  const ytDlp = await getYtDlp();
  const args = [
    sourceUrl,
    "--no-warnings",
    "--no-playlist",
    "--force-overwrites",
    "-o",
    outputPath,
  ];

  if (formatId) {
    args.push("-f", formatId);
  }

  await ytDlp.execPromise(args);
  return outputPath;
}

async function ensureExecutable() {
  if (process.platform !== "win32") {
    await fsPromises.chmod(BINARY_PATH, 0o755);
  }
}

module.exports = {
  ensureYtDlpBinary,
  downloadToFile,
  getVideoInfo,
};
