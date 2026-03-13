const os = require("os");
const path = require("path");

const PLATFORM_CONFIG = {
  pinterest: {
    label: "Pinterest",
    folderName: "Pinterest_Downloader",
    prefix: "Pinterest",
  },
  youtube: {
    label: "YouTube",
    folderName: "YouTube_Downloader",
    prefix: "YouTube",
  },
  tiktok: {
    label: "TikTok",
    folderName: "TikTok_Downloader",
    prefix: "TikTok",
  },
};

function getPlatformConfig(platform = "pinterest") {
  return PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.pinterest;
}

function getDefaultDownloadFolder(platform = "pinterest") {
  return path.join(os.homedir(), "Downloads", getPlatformConfig(platform).folderName);
}

function sanitizeFilename(value, fallback = "untitled") {
  const cleaned = String(value || "")
    .normalize("NFKD")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned ? cleaned.slice(0, 110) : fallback;
}

function formatDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}${month}${day}`;
}

function decodeBoardName(boardUrl = "") {
  const segments = boardUrl.split("/").filter(Boolean);
  const slug = segments[segments.length - 1] || "";
  try {
    return sanitizeFilename(decodeURIComponent(slug).replace(/-/g, " "), "board");
  } catch {
    return sanitizeFilename(slug.replace(/-/g, " "), "board");
  }
}

function extractPinIdFromUrl(urlString = "") {
  try {
    const parsed = new URL(urlString);
    const match = parsed.pathname.match(/\/pin\/(?:[^/]*--)?(\d+)/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function isPinterestHost(hostname = "") {
  return hostname.toLowerCase() === "pin.it" || /(^|\.)pinterest\.[a-z.]+$/i.test(hostname);
}

function isYouTubeHost(hostname = "") {
  return /(^|\.)youtube\.com$/i.test(hostname) || /^youtu\.be$/i.test(hostname);
}

function isTikTokHost(hostname = "") {
  return /(^|\.)tiktok\.com$/i.test(hostname) || /(^|\.)vm\.tiktok\.com$/i.test(hostname) || /(^|\.)vt\.tiktok\.com$/i.test(hostname);
}

function formatDuration(totalSeconds) {
  const seconds = Number(totalSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "Unknown";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = Math.floor(seconds % 60);

  if (hours > 0) {
    return [hours, minutes, remainder].map((value, index) => `${value}`.padStart(index === 0 ? 1 : 2, "0")).join(":");
  }

  return [minutes, remainder].map((value) => `${value}`.padStart(2, "0")).join(":");
}

function uniqueBy(values, selector) {
  const seen = new Set();
  return values.filter((value) => {
    const key = selector(value);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

module.exports = {
  decodeBoardName,
  extractPinIdFromUrl,
  formatDateStamp,
  formatDuration,
  getDefaultDownloadFolder,
  getPlatformConfig,
  isTikTokHost,
  isPinterestHost,
  isYouTubeHost,
  sanitizeFilename,
  uniqueBy,
};
