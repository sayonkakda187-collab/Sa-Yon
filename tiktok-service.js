const { randomUUID } = require("crypto");

const { getVideoInfo } = require("./yt-dlp-client");
const {
  formatDuration,
  isTikTokHost,
  sanitizeFilename,
  uniqueBy,
} = require("./utils");

function extractTikTokUrls(text = "") {
  const matches = String(text).match(/https?:\/\/[^\s"'<>]+/gi) || [];
  const cleaned = matches
    .map((value) => value.replace(/[),.;]+$/g, ""))
    .map((value) => normalizeTikTokUrl(value))
    .filter((entry) => entry.ok)
    .map((entry) => entry.url);

  return uniqueBy(cleaned, (value) => value);
}

function normalizeTikTokUrl(rawUrl = "") {
  try {
    const initial = rawUrl.trim();
    const parsed = new URL(/^https?:\/\//i.test(initial) ? initial : `https://${initial}`);
    if (!isTikTokHost(parsed.hostname)) {
      return { ok: false, error: "invalid link" };
    }

    parsed.hash = "";
    return {
      ok: true,
      url: parsed.toString(),
    };
  } catch {
    return { ok: false, error: "invalid link" };
  }
}

async function analyzeUrls(urls = []) {
  const normalizedInput = uniqueBy(
    urls.map((value) => String(value || "").trim()).filter(Boolean),
    (value) => value,
  );

  const items = [];
  const bySource = [];

  for (const rawUrl of normalizedInput) {
    const analysis = await analyzeUrl(rawUrl);
    items.push(...analysis.items);
    bySource.push({
      sourceUrl: rawUrl,
      normalizedUrl: analysis.normalizedUrl || null,
      ok: analysis.ok,
      mediaCount: analysis.items.filter((item) => Boolean(item.directUrl)).length,
      error: analysis.error || null,
    });
  }

  return {
    items,
    bySource,
    summary: {
      totalUrls: normalizedInput.length,
      ready: items.filter((item) => item.directUrl).length,
      failed: items.filter((item) => item.status === "Failed").length,
    },
  };
}

async function analyzeUrl(rawUrl) {
  const validation = normalizeTikTokUrl(rawUrl);
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.error,
      items: [buildFailureItem(rawUrl, null, validation.error)],
    };
  }

  try {
    const info = await getVideoInfo(validation.url);
    const variants = buildDownloadVariants(info);
    if (!variants.length) {
      return {
        ok: false,
        normalizedUrl: info.webpage_url || validation.url,
        error: "failed stream extraction",
        items: [buildFailureItem(rawUrl, info.webpage_url || validation.url, "failed stream extraction")],
      };
    }

    const defaultVariant = chooseDefaultVariant(variants);
    const durationSeconds = Number(info.duration) || null;
    const videoType = durationSeconds > 90 ? "video" : "short";

    return {
      ok: true,
      normalizedUrl: info.webpage_url || validation.url,
      items: [{
        id: randomUUID(),
        platform: "tiktok",
        platformLabel: "TikTok",
        sourceUrl: rawUrl,
        normalizedUrl: info.webpage_url || validation.url,
        resourceId: info.id || "unknown",
        resourceKind: "video",
        pinId: info.id || "unknown",
        pinTitle: sanitizeFilename(info.title || "TikTok video", "TikTok video"),
        title: sanitizeFilename(info.title || "TikTok video", "TikTok video"),
        creatorName: sanitizeFilename(info.channel || info.uploader || info.creator || "Unknown creator", "Unknown creator"),
        boardName: "",
        channelName: "",
        createdAt: info.upload_date || null,
        containerType: "single",
        index: 1,
        mediaType: "video",
        contentType: videoType,
        contentTypeLabel: videoType.toUpperCase(),
        directUrl: defaultVariant.directUrl,
        downloadVariants: variants,
        defaultVariantKey: defaultVariant.key,
        thumbnailUrl: pickThumbnail(info),
        resolution: defaultVariant.resolution,
        width: defaultVariant.width,
        height: defaultVariant.height,
        qualityLabel: defaultVariant.qualityLabel,
        availableQualities: uniqueBy(variants.filter((variant) => variant.hasVideo).map((variant) => variant.qualityLabel), (value) => value),
        fileSize: defaultVariant.fileSize,
        fileType: "video/mp4",
        extension: defaultVariant.extension,
        duration: durationSeconds,
        durationLabel: formatDuration(durationSeconds),
        status: "Pending",
        error: null,
        selected: true,
        watermarkSupported: variants.some((variant) => variant.watermark !== "unknown"),
      }],
    };
  } catch (error) {
    const message = classifyTikTokError(error);
    return {
      ok: false,
      normalizedUrl: validation.url,
      error: message,
      items: [buildFailureItem(rawUrl, validation.url, message)],
    };
  }
}

function buildDownloadVariants(info) {
  const candidates = [];
  const formats = Array.isArray(info.formats) ? info.formats : [];
  const requestedDownload = Array.isArray(info.requested_downloads) ? info.requested_downloads[0] : null;

  if (info.url) {
    candidates.push({
      key: `default::${info.format_id || "best"}`,
      formatId: info.format_id || null,
      directUrl: info.url,
      requestHeaders: buildRequestHeaders(requestedDownload),
      extension: ".mp4",
      fileSize: info.filesize || info.filesize_approx || null,
      mediaType: "video",
      hasVideo: true,
      hasAudio: true,
      audioOnly: false,
      width: info.width || null,
      height: info.height || null,
      qualityValue: resolveQualityValue(info.width, info.height),
      resolution: info.width && info.height ? `${info.width} x ${info.height}` : "Unknown",
      qualityLabel: resolveQualityValue(info.width, info.height) ? `${resolveQualityValue(info.width, info.height)}p` : "Best",
      watermark: "without",
      sortScore: ((info.width || 0) * (info.height || 0)) || 0,
    });
  }

  formats.forEach((format) => {
    if (!format || !format.url || !/^https?:/i.test(format.url)) {
      return;
    }

    const hasVideo = format.vcodec && format.vcodec !== "none";
    const hasAudio = format.acodec && format.acodec !== "none";
    if (!hasVideo) {
      return;
    }

    candidates.push({
      key: String(format.format_id || randomUUID()),
      formatId: String(format.format_id || ""),
      directUrl: format.url,
      requestHeaders: buildRequestHeaders(format),
      extension: ".mp4",
      fileSize: format.filesize || format.filesize_approx || null,
      mediaType: "video",
      hasVideo: true,
      hasAudio,
      audioOnly: false,
      width: format.width || null,
      height: format.height || null,
      qualityValue: resolveQualityValue(format.width, format.height),
      resolution: format.width && format.height ? `${format.width} x ${format.height}` : "Unknown",
      qualityLabel: resolveQualityValue(format.width, format.height) ? `${resolveQualityValue(format.width, format.height)}p` : "Best",
      watermark: inferWatermarkMode(format),
      sortScore: ((format.width || 0) * (format.height || 0)) || 0,
    });
  });

  return uniqueBy(candidates, (variant) => `${variant.directUrl}::${variant.watermark}`)
    .sort((left, right) => right.sortScore - left.sortScore);
}

function chooseDefaultVariant(variants) {
  return variants.find((variant) => variant.watermark === "without")
    || variants[0];
}

function inferWatermarkMode(format) {
  const formatId = String(format.format_id || "");
  if (formatId.endsWith("-0")) {
    return "with";
  }
  if (formatId.endsWith("-1")) {
    return "without";
  }
  return "unknown";
}

function pickThumbnail(info) {
  if (Array.isArray(info.thumbnails) && info.thumbnails.length) {
    return [...info.thumbnails].sort((left, right) => (right.width || 0) - (left.width || 0))[0].url;
  }

  return info.thumbnail || null;
}

function buildRequestHeaders(format) {
  if (!format) {
    return {};
  }

  const headers = { ...(format.http_headers || {}) };
  if (format.cookies) {
    headers.Cookie = format.cookies;
  }
  return headers;
}

function resolveQualityValue(width, height) {
  const safeWidth = Number(width) || 0;
  const safeHeight = Number(height) || 0;
  if (!safeWidth && !safeHeight) {
    return 0;
  }
  return safeHeight > safeWidth ? safeWidth : safeHeight;
}

function buildFailureItem(sourceUrl, normalizedUrl, error) {
  return {
    id: randomUUID(),
    platform: "tiktok",
    platformLabel: "TikTok",
    sourceUrl,
    normalizedUrl,
    resourceId: "unknown",
    resourceKind: "video",
    pinId: "unknown",
    pinTitle: "Unavailable TikTok video",
    title: "Unavailable TikTok video",
    creatorName: "",
    boardName: "",
    channelName: "",
    createdAt: null,
    containerType: "single",
    index: 1,
    mediaType: "unknown",
    contentType: "video",
    contentTypeLabel: "VIDEO",
    directUrl: null,
    downloadVariants: [],
    defaultVariantKey: null,
    thumbnailUrl: null,
    resolution: "Unknown",
    width: null,
    height: null,
    qualityLabel: "Unavailable",
    availableQualities: [],
    fileSize: null,
    fileType: null,
    extension: null,
    duration: null,
    durationLabel: "Unknown",
    status: "Failed",
    error,
    selected: false,
    watermarkSupported: false,
  };
}

function classifyTikTokError(error) {
  const message = String((error && error.message) || "").toLowerCase();
  if (message.includes("private")) {
    return "private content";
  }
  if (message.includes("unavailable") || message.includes("removed")) {
    return "deleted content";
  }
  if (message.includes("login")) {
    return "unsupported link";
  }
  if (message.includes("timeout")) {
    return "network timeout";
  }
  return "failed stream extraction";
}

module.exports = {
  analyzeUrls,
  extractTikTokUrls,
  normalizeTikTokUrl,
};
