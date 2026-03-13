const { randomUUID } = require("crypto");

const { getVideoInfo } = require("./yt-dlp-client");
const {
  formatDuration,
  isYouTubeHost,
  sanitizeFilename,
  uniqueBy,
} = require("./utils");

function extractYouTubeUrls(text = "") {
  const matches = String(text).match(/https?:\/\/[^\s"'<>]+/gi) || [];
  const cleaned = matches
    .map((value) => value.replace(/[),.;]+$/g, ""))
    .map((value) => normalizeYouTubeUrl(value))
    .filter((entry) => entry.ok)
    .map((entry) => entry.url);

  return uniqueBy(cleaned, (value) => value);
}

function normalizeYouTubeUrl(rawUrl = "") {
  try {
    const initial = rawUrl.trim();
    const parsed = new URL(/^https?:\/\//i.test(initial) ? initial : `https://${initial}`);

    if (!isYouTubeHost(parsed.hostname)) {
      return { ok: false, error: "invalid link" };
    }

    let videoId = parsed.searchParams.get("v");
    let typeHint = "video";

    if (/^youtu\.be$/i.test(parsed.hostname)) {
      videoId = parsed.pathname.split("/").filter(Boolean)[0] || videoId;
    } else if (/\/shorts\//i.test(parsed.pathname)) {
      videoId = parsed.pathname.split("/").filter(Boolean)[1] || videoId;
      typeHint = "short";
    } else if (/\/embed\//i.test(parsed.pathname)) {
      videoId = parsed.pathname.split("/").filter(Boolean)[1] || videoId;
    } else if (/\/live\//i.test(parsed.pathname)) {
      videoId = parsed.pathname.split("/").filter(Boolean)[1] || videoId;
    }

    if (!videoId) {
      return { ok: false, error: "invalid link" };
    }

    const normalized = typeHint === "short"
      ? `https://www.youtube.com/shorts/${videoId}`
      : `https://www.youtube.com/watch?v=${videoId}`;

    return {
      ok: true,
      url: normalized,
      videoId,
      typeHint,
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
  const validation = normalizeYouTubeUrl(rawUrl);
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
    const videoType = classifyVideoType(validation, info, variants);
    const primaryDimensions = pickLargestVideoVariant(variants);
    const durationSeconds = Number(info.duration) || null;

    return {
      ok: true,
      normalizedUrl: info.webpage_url || validation.url,
      items: [{
        id: randomUUID(),
        platform: "youtube",
        platformLabel: "YouTube",
        sourceUrl: rawUrl,
        normalizedUrl: info.webpage_url || validation.url,
        resourceId: info.id || validation.videoId || "unknown",
        resourceKind: "video",
        pinId: info.id || validation.videoId || "unknown",
        pinTitle: sanitizeFilename(info.title || "YouTube video", "YouTube video"),
        title: sanitizeFilename(info.title || "YouTube video", "YouTube video"),
        creatorName: sanitizeFilename(info.channel || info.uploader || "Unknown channel", "Unknown channel"),
        boardName: "",
        channelName: sanitizeFilename(info.channel || info.uploader || "Unknown channel", "Unknown channel"),
        createdAt: info.upload_date || null,
        containerType: "single",
        index: 1,
        mediaType: defaultVariant.mediaType,
        contentType: videoType,
        contentTypeLabel: videoType.toUpperCase(),
        directUrl: defaultVariant.directUrl,
        downloadVariants: variants,
        defaultVariantKey: defaultVariant.key,
        thumbnailUrl: pickThumbnail(info),
        resolution: defaultVariant.resolution || (primaryDimensions ? primaryDimensions.resolution : "Unknown"),
        width: defaultVariant.width || (primaryDimensions ? primaryDimensions.width : null),
        height: defaultVariant.height || (primaryDimensions ? primaryDimensions.height : null),
        qualityLabel: defaultVariant.qualityLabel,
        availableQualities: uniqueBy(variants.filter((variant) => variant.hasVideo).map((variant) => variant.qualityLabel), (value) => value),
        fileSize: defaultVariant.fileSize,
        fileType: inferMimeFromExtension(defaultVariant.extension),
        extension: defaultVariant.extension,
        duration: durationSeconds,
        durationLabel: formatDuration(durationSeconds),
        status: "Pending",
        error: null,
        selected: true,
        audioOnlySupported: variants.some((variant) => variant.audioOnly),
      }],
    };
  } catch (error) {
    const message = classifyYouTubeError(error);
    return {
      ok: false,
      normalizedUrl: validation.url,
      error: message,
      items: [buildFailureItem(rawUrl, validation.url, message)],
    };
  }
}

function buildDownloadVariants(info) {
  const formats = Array.isArray(info.formats) ? info.formats : [];
  const variants = [];

  formats.forEach((format) => {
    if (!format || !format.url || !/^https?:/i.test(format.url)) {
      return;
    }
    if (isStreamingManifest(format)) {
      return;
    }

    const hasVideo = format.vcodec && format.vcodec !== "none";
    const hasAudio = format.acodec && format.acodec !== "none";
    if (!hasVideo && !hasAudio) {
      return;
    }

    const extension = normalizeExtension(format.ext, hasVideo);
    if (!extension) {
      return;
    }

    variants.push({
      key: String(format.format_id || randomUUID()),
      formatId: String(format.format_id || ""),
      directUrl: format.url,
      requestHeaders: buildRequestHeaders(format),
      extension,
      fileSize: format.filesize || format.filesize_approx || null,
      mediaType: hasVideo ? "video" : "audio",
      hasVideo,
      hasAudio,
      audioOnly: !hasVideo && hasAudio,
      width: format.width || null,
      height: format.height || null,
      qualityValue: resolveQualityValue(format.width, format.height),
      resolution: format.width && format.height ? `${format.width} x ${format.height}` : "Unknown",
      qualityLabel: buildQualityLabel(format, hasVideo, hasAudio),
      sortHeight: Number(format.height) || 0,
      sortAudio: Number(format.abr || format.asr || 0),
    });
  });

  const uniqueVariants = uniqueBy(variants, (variant) => `${variant.formatId}::${variant.extension}`);
  return uniqueVariants.sort((left, right) => {
    if (left.audioOnly !== right.audioOnly) {
      return left.audioOnly ? 1 : -1;
    }
    if (left.hasAudio !== right.hasAudio) {
      return left.hasAudio ? -1 : 1;
    }
    if (left.sortHeight !== right.sortHeight) {
      return right.sortHeight - left.sortHeight;
    }
    return right.sortAudio - left.sortAudio;
  });
}

function chooseDefaultVariant(variants) {
  return variants.find((variant) => variant.hasVideo && variant.hasAudio && variant.extension === ".mp4")
    || variants.find((variant) => variant.hasVideo && variant.hasAudio)
    || variants.find((variant) => variant.hasVideo && variant.extension === ".mp4")
    || variants.find((variant) => variant.hasVideo)
    || variants.find((variant) => variant.audioOnly)
    || variants[0];
}

function pickLargestVideoVariant(variants) {
  return variants
    .filter((variant) => variant.hasVideo)
    .sort((left, right) => ((right.width || 0) * (right.height || 0)) - ((left.width || 0) * (left.height || 0)))[0] || null;
}

function buildFailureItem(sourceUrl, normalizedUrl, error) {
  return {
    id: randomUUID(),
    platform: "youtube",
    platformLabel: "YouTube",
    sourceUrl,
    normalizedUrl,
    resourceId: "unknown",
    resourceKind: "video",
    pinId: "unknown",
    pinTitle: "Unavailable YouTube video",
    title: "Unavailable YouTube video",
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
    audioOnlySupported: false,
  };
}

function classifyVideoType(validation, info, variants) {
  if (validation.typeHint === "short" || /\/shorts\//i.test(info.webpage_url || "")) {
    return "short";
  }

  const largest = pickLargestVideoVariant(variants);
  if (largest && largest.height && largest.width && largest.height > largest.width && Number(info.duration || 0) <= 180) {
    return "short";
  }

  return "video";
}

function buildQualityLabel(format, hasVideo, hasAudio) {
  if (!hasVideo && hasAudio) {
    return `${format.abr || "Audio"} kbps audio`;
  }

  const resolution = resolveQualityValue(format.width, format.height)
    ? `${resolveQualityValue(format.width, format.height)}p`
    : format.format_note || "Best";
  return `${resolution}${hasAudio ? " + audio" : " video only"}`;
}

function pickThumbnail(info) {
  if (Array.isArray(info.thumbnails) && info.thumbnails.length) {
    return [...info.thumbnails].sort((left, right) => (right.width || 0) - (left.width || 0))[0].url;
  }

  return info.thumbnail || null;
}

function normalizeExtension(extension, hasVideo) {
  const value = String(extension || "").toLowerCase();
  if (value === "mp4") {
    return ".mp4";
  }
  if (!hasVideo && value === "m4a") {
    return ".m4a";
  }
  if (value === "webm") {
    return hasVideo ? ".webm" : ".webm";
  }
  return hasVideo ? ".mp4" : null;
}

function inferMimeFromExtension(extension) {
  const map = {
    ".mp4": "video/mp4",
    ".m4a": "audio/mp4",
    ".webm": "video/webm",
  };
  return map[extension] || null;
}

function buildRequestHeaders(format) {
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

function isStreamingManifest(format) {
  const protocol = String(format.protocol || "");
  return /m3u8|dash/i.test(protocol) || /\/manifest\//i.test(format.url || "");
}

function classifyYouTubeError(error) {
  const message = String((error && error.message) || "").toLowerCase();
  if (message.includes("private")) {
    return "private content";
  }
  if (message.includes("age")) {
    return "restricted video";
  }
  if (message.includes("unavailable") || message.includes("removed")) {
    return "deleted content";
  }
  if (message.includes("timeout")) {
    return "network timeout";
  }
  return "failed stream extraction";
}

module.exports = {
  analyzeUrls,
  extractYouTubeUrls,
  normalizeYouTubeUrl,
};
