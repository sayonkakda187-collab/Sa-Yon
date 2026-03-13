const pinterestService = require("./pinterest-service");
const youtubeService = require("./youtube-service");
const tiktokService = require("./tiktok-service");
const { formatDuration } = require("./utils");

const PLATFORM_SERVICES = {
  pinterest: {
    label: "Pinterest",
    analyzeUrls: pinterestService.analyzeUrls,
    extractUrls: pinterestService.extractPinterestUrls,
    normalizeItems: normalizePinterestItems,
  },
  youtube: {
    label: "YouTube",
    analyzeUrls: youtubeService.analyzeUrls,
    extractUrls: youtubeService.extractYouTubeUrls,
    normalizeItems: identityItems,
  },
  tiktok: {
    label: "TikTok",
    analyzeUrls: tiktokService.analyzeUrls,
    extractUrls: tiktokService.extractTikTokUrls,
    normalizeItems: identityItems,
  },
};

function analyzeUrls(platform, urls = []) {
  const service = PLATFORM_SERVICES[platform];
  if (!service) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return service.analyzeUrls(urls).then((result) => ({
    ...result,
    items: service.normalizeItems(result.items || []),
  }));
}

function extractUrls(platform, text = "") {
  const service = PLATFORM_SERVICES[platform];
  if (!service) {
    return [];
  }

  return service.extractUrls(text);
}

function identityItems(items) {
  return items;
}

function normalizePinterestItems(items) {
  return items.map((item) => {
    const contentType = item.containerType === "gallery"
      ? "gallery"
      : item.mediaType === "video"
        ? "video"
        : item.mediaType === "image"
          ? "image"
          : "image";

    const variant = item.directUrl
      ? [{
        key: "default",
        directUrl: item.directUrl,
        requestHeaders: {},
        extension: item.extension || (item.mediaType === "video" ? ".mp4" : ".jpg"),
        fileSize: item.fileSize,
        mediaType: item.mediaType,
        hasVideo: item.mediaType === "video",
        hasAudio: item.mediaType === "video",
        audioOnly: false,
        width: item.width,
        height: item.height,
        resolution: item.resolution,
        qualityLabel: item.resolution || "Original",
      }]
      : [];

    return {
      ...item,
      platform: "pinterest",
      platformLabel: "Pinterest",
      resourceId: item.pinId || "unknown",
      resourceKind: item.mediaType === "video" ? "video" : "image",
      title: item.pinTitle,
      creatorName: item.boardName || "",
      channelName: "",
      contentType,
      contentTypeLabel: contentType.toUpperCase(),
      qualityLabel: variant[0] ? variant[0].qualityLabel : "Original",
      availableQualities: variant[0] ? [variant[0].qualityLabel] : [],
      durationLabel: formatDuration(item.duration),
      downloadVariants: variant,
      defaultVariantKey: variant[0] ? variant[0].key : null,
      audioOnlySupported: false,
      watermarkSupported: false,
    };
  });
}

module.exports = {
  PLATFORM_SERVICES,
  analyzeUrls,
  extractUrls,
};
