const platformApi = window.pinterestDownloader || window.pinterestDownloaderWeb;
const STORAGE_KEY = "downloader-hub-preferences-v2";
const HISTORY_STORAGE_KEY = "downloader-hub-history-v2";

const PLATFORM_CONFIG = {
  pinterest: {
    label: "Pinterest Photos & Videos",
    shortLabel: "Pinterest",
    heroLead: "Validate public pins, preview every photo or video asset, and save them into platform-aware folders.",
    singleLabel: "Single Pinterest pin URL",
    singlePlaceholder: "https://www.pinterest.com/pin/123456789/",
    multiLabel: "Multiple Pinterest URLs",
    multiPlaceholder: "Paste one Pinterest pin URL per line",
    extractLabel: "Paste text, page source, or imported content",
    extractPlaceholder: "Paste raw text, page source, or a copied list of Pinterest URLs",
    extractEmpty: "No extracted Pinterest URLs yet.",
    inputHelp: "Single URL, multi-URL batch mode, and extract mode all feed the same preview queue.",
    filterOptions: [
      { value: "all", label: "All Pins" },
      { value: "video", label: "Videos" },
      { value: "image", label: "Images / Galleries" },
    ],
    previewFilters: [
      { value: "all", label: "All" },
      { value: "video", label: "Videos" },
      { value: "image", label: "Images" },
      { value: "gallery", label: "Galleries" },
    ],
    qualityOptions: [{ value: "original", label: "Original media" }],
    saveHint: "Default folder: Downloads/Pinterest_Downloader",
  },
  youtube: {
    label: "YouTube Videos",
    shortLabel: "YouTube",
    heroLead: "Collect Shorts and normal videos, preview the detected stream options, and download the format that matches your quality and audio choices.",
    singleLabel: "Single YouTube URL",
    singlePlaceholder: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    multiLabel: "Multiple YouTube URLs",
    multiPlaceholder: "Paste one YouTube watch, shorts, or youtu.be URL per line",
    extractLabel: "Paste text, page source, or imported content",
    extractPlaceholder: "Paste copied text, a notes file, or a list containing YouTube links",
    extractEmpty: "No extracted YouTube URLs yet.",
    inputHelp: "Shorts and standard watch links are validated automatically, then classified as SHORT or VIDEO.",
    filterOptions: [
      { value: "all", label: "Download All Supported Videos" },
      { value: "short", label: "Download Shorts" },
      { value: "video", label: "Download Normal Videos" },
    ],
    previewFilters: [
      { value: "all", label: "All" },
      { value: "short", label: "Shorts" },
      { value: "video", label: "Videos" },
      { value: "failed", label: "Failed" },
    ],
    qualityOptions: [
      { value: "best", label: "Best available" },
      { value: "1080", label: "1080p" },
      { value: "720", label: "720p" },
      { value: "480", label: "480p" },
      { value: "360", label: "360p" },
    ],
    saveHint: "Default folder: Downloads/YouTube_Downloader",
  },
  tiktok: {
    label: "TikTok Videos",
    shortLabel: "TikTok",
    heroLead: "Queue TikTok posts, separate short-form clips from longer videos, and save the best supported MP4 straight into your selected folder.",
    singleLabel: "Single TikTok URL",
    singlePlaceholder: "https://www.tiktok.com/@scout2015/video/6718335390845095173",
    multiLabel: "Multiple TikTok URLs",
    multiPlaceholder: "Paste one TikTok URL per line",
    extractLabel: "Paste text, page source, or imported content",
    extractPlaceholder: "Paste copied text or a saved list containing TikTok links",
    extractEmpty: "No extracted TikTok URLs yet.",
    inputHelp: "TikTok links are classified as SHORT or VIDEO based on the detected media metadata.",
    filterOptions: [
      { value: "all", label: "Download All Supported Videos" },
      { value: "short", label: "Download Short Videos" },
      { value: "video", label: "Download Normal Videos" },
    ],
    previewFilters: [
      { value: "all", label: "All" },
      { value: "short", label: "Shorts" },
      { value: "video", label: "Videos" },
      { value: "failed", label: "Failed" },
    ],
    qualityOptions: [
      { value: "best", label: "Best available" },
      { value: "720", label: "720p" },
      { value: "540", label: "540p" },
    ],
    saveHint: "Default folder: Downloads/TikTok_Downloader",
  },
};

const MENU_CONFIG = {
  home: {
    step: "Home",
    title: "Multi-platform downloader workspace",
    lead: "Switch between Pinterest, YouTube, and TikTok modules, keep history in one place, and install the tool for faster access.",
  },
  history: {
    step: "Download History",
    title: "Review completed batches",
    lead: "Every finished batch is logged locally so you can audit what was saved, what failed, and which platform it came from.",
  },
  settings: {
    step: "Settings",
    title: "Tune global and platform defaults",
    lead: "Adjust folder structure, duplicate handling, naming behavior, and platform-specific defaults without changing the shared workflow.",
  },
};

const DEFAULT_GLOBAL_SETTINGS = {
  duplicatePolicy: "rename",
  concurrency: 2,
  subfolderByPlatform: true,
  subfolderByDate: false,
  subfolderByCreator: false,
  subfolderByContentType: true,
  useTitle: true,
  useCreator: false,
  addDate: false,
  rememberLastMenu: true,
  openFolderAfterComplete: false,
  autoRetryFailed: false,
};

const DEFAULT_PLATFORM_SETTINGS = {
  pinterest: { contentFilter: "all", quality: "original", customPrefix: "Pinterest" },
  youtube: { contentFilter: "all", quality: "best", includeAudio: true, audioOnly: false, customPrefix: "YouTube" },
  tiktok: { contentFilter: "all", quality: "best", watermarkMode: "without", customPrefix: "TikTok" },
};

const state = {
  currentMenu: "home",
  lastPlatform: "pinterest",
  activeDownloadPlatform: null,
  environment: {
    runtime: window.pinterestDownloader ? "desktop" : "web",
    canSelectFolder: true,
    canOpenFolder: true,
    saveMode: "browser-download",
    saveModeLabel: "Browser Downloads",
    saveHint: "",
  },
  globalSettings: { ...DEFAULT_GLOBAL_SETTINGS },
  platformSettings: {
    pinterest: { ...DEFAULT_PLATFORM_SETTINGS.pinterest },
    youtube: { ...DEFAULT_PLATFORM_SETTINGS.youtube },
    tiktok: { ...DEFAULT_PLATFORM_SETTINGS.tiktok },
  },
  platforms: {
    pinterest: createPlatformState("pinterest"),
    youtube: createPlatformState("youtube"),
    tiktok: createPlatformState("tiktok"),
  },
  history: [],
  message: null,
};

const elements = {
  runtimeLabel: document.getElementById("runtime-label"),
  heroStep: document.getElementById("hero-step"),
  heroTitle: document.getElementById("hero-title"),
  heroLead: document.getElementById("hero-lead"),
  heroPlatformBadge: document.getElementById("hero-platform-badge"),
  heroSaveBadge: document.getElementById("hero-save-badge"),
  queueCount: document.getElementById("queue-count"),
  queueDetail: document.getElementById("queue-detail"),
  completedCount: document.getElementById("completed-count"),
  completedDetail: document.getElementById("completed-detail"),
  failedCount: document.getElementById("failed-count"),
  failedDetail: document.getElementById("failed-detail"),
  speedCount: document.getElementById("speed-count"),
  remainingCount: document.getElementById("remaining-count"),
  messageBanner: document.getElementById("message-banner"),
  pageContent: document.getElementById("page-content"),
  menuButtons: [...document.querySelectorAll("[data-menu]")],
};

const unsubscribeDownloadEvents = platformApi.onDownloadEvent(handleDownloadEvent);

window.addEventListener("beforeunload", () => {
  if (typeof unsubscribeDownloadEvents === "function") {
    unsubscribeDownloadEvents();
  }
});

boot();

async function boot() {
  loadStoredState();
  bindEvents();
  await Promise.all(Object.keys(PLATFORM_CONFIG).map((platform) => ensurePlatformFolder(platform)));
  await refreshEnvironment(getMenuPlatform());
  render();
}

function createPlatformState(platform) {
  return {
    platform,
    mode: "single",
    singleInput: "",
    multiInput: "",
    extractInput: "",
    importedFilePath: "",
    extractedUrls: [],
    queueItems: [],
    folderPath: "",
    previewFilter: "all",
    progress: createProgress(),
    latestSummary: createDetailedSummary(),
    downloadLog: [],
    isAnalyzing: false,
    isDownloading: false,
  };
}

function createProgress() {
  return { total: 0, completed: 0, failed: 0, skipped: 0, remaining: 0, speedBps: 0 };
}

function createDetailedSummary() {
  return {
    total: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    shortDownloaded: 0,
    videoDownloaded: 0,
    imageDownloaded: 0,
    galleryDownloaded: 0,
  };
}

function bindEvents() {
  document.body.addEventListener("click", handleClick);
  document.body.addEventListener("change", handleChange);
  document.body.addEventListener("input", handleInput);
}

async function handleClick(event) {
  const menuButton = event.target.closest("[data-menu]");
  if (menuButton) {
    await switchMenu(menuButton.dataset.menu);
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) {
    return;
  }

  const action = actionButton.dataset.action;
  const platform = actionButton.dataset.platform || getMenuPlatform();

  switch (action) {
    case "open-platform":
      await switchMenu(actionButton.dataset.platform);
      break;
    case "set-mode":
      state.platforms[platform].mode = actionButton.dataset.mode;
      clearMessage();
      render();
      break;
    case "find-url":
      await handleFindUrl(platform);
      break;
    case "extract-url":
      handleExtractUrls(platform);
      break;
    case "add-extracted":
      await addSelectedExtractedUrls(platform);
      break;
    case "clear-input":
      clearCurrentInput(platform);
      break;
    case "import-file":
      await importTextFile(platform);
      break;
    case "select-folder":
      await selectFolder(platform);
      break;
    case "open-folder":
      await openFolder(platform);
      break;
    case "start-download":
      await startDownload(platform);
      break;
    case "select-all":
      updateAllSelection(platform, true);
      break;
    case "unselect-all":
      updateAllSelection(platform, false);
      break;
    case "remove-selected":
      removeSelectedItems(platform);
      break;
    case "retry-failed":
      await retryFailedItems(platform);
      break;
    case "export-log":
      await exportLog(platform);
      break;
    case "remove-item":
      removeItem(platform, actionButton.dataset.id);
      break;
    case "retry-item":
      await retryItem(platform, actionButton.dataset.id);
      break;
    case "select-extracted":
      updateAllExtractedSelection(platform, true);
      break;
    case "remove-extracted":
      removeUncheckedExtracted(platform);
      break;
    case "set-preview-filter":
      state.platforms[platform].previewFilter = actionButton.dataset.filter;
      render();
      break;
    case "clear-history":
      state.history = [];
      saveHistory();
      render();
      showMessage("Download history cleared.", "success");
      break;
    case "switch-settings-tab":
      state.lastPlatform = actionButton.dataset.platform;
      render();
      break;
    default:
      break;
  }
}

function handleChange(event) {
  const selection = event.target;

  if (selection.matches("[data-select-item]")) {
    const platform = selection.dataset.platform;
    const item = findQueueItem(platform, selection.dataset.id);
    if (item) {
      item.selected = selection.checked;
      render();
    }
    return;
  }

  if (selection.matches("[data-select-extracted]")) {
    const platform = selection.dataset.platform;
    const extracted = state.platforms[platform].extractedUrls.find((item) => item.id === selection.dataset.id);
    if (extracted) {
      extracted.selected = selection.checked;
      render();
    }
    return;
  }

  if (!selection.dataset.settingScope) {
    return;
  }

  applySettingInput(selection);
  savePreferences();
  render();
}

function handleInput(event) {
  const sourceField = event.target.dataset.sourceField;
  if (sourceField) {
    const platform = event.target.dataset.platform;
    state.platforms[platform][sourceField] = event.target.value;
    return;
  }

  if (!event.target.dataset.settingScope) {
    return;
  }

  applySettingInput(event.target);
  savePreferences();
  if (event.target.dataset.liveRender === "true") {
    render();
  }
}

async function switchMenu(menu) {
  if (!menu || state.currentMenu === menu) {
    return;
  }

  state.currentMenu = menu;
  if (PLATFORM_CONFIG[menu]) {
    state.lastPlatform = menu;
    await ensurePlatformFolder(menu);
  }

  await refreshEnvironment(getMenuPlatform());
  savePreferences();
  clearMessage();
  render();
}

function getMenuPlatform() {
  if (PLATFORM_CONFIG[state.currentMenu]) {
    return state.currentMenu;
  }
  return state.lastPlatform || "pinterest";
}

async function ensurePlatformFolder(platform) {
  if (!state.platforms[platform].folderPath) {
    state.platforms[platform].folderPath = await platformApi.getDefaultFolder(platform);
  }
}

async function refreshEnvironment(platform) {
  if (typeof platformApi.getEnvironment === "function") {
    state.environment = await platformApi.getEnvironment(platform);
    elements.runtimeLabel.textContent = state.environment.runtime === "desktop" ? "Desktop" : "Web / PWA";
  }
}

async function handleFindUrl(platform) {
  const platformState = state.platforms[platform];
  if (platformState.mode === "extract") {
    showMessage("Use Extract URL in extract mode, then add the selected results to the queue.", "info");
    return;
  }

  const urls = platformState.mode === "single"
    ? [platformState.singleInput.trim()].filter(Boolean)
    : dedupeLines(platformState.multiInput);

  if (!urls.length) {
    showMessage(`Paste at least one ${PLATFORM_CONFIG[platform].shortLabel} URL first.`, "error");
    return;
  }

  await analyzeAndQueue(platform, urls);
}

function handleExtractUrls(platform) {
  const platformState = state.platforms[platform];
  if (platformState.mode !== "extract") {
    showMessage("Switch to Extract URLs mode to scan pasted text or an imported file.", "info");
    return;
  }

  const extracted = platformApi.extractUrls(platformState.extractInput, platform);
  platformState.extractedUrls = extracted.map((url) => ({ id: createLocalId(url), url, selected: true }));

  if (!platformState.extractedUrls.length) {
    showMessage(`No ${PLATFORM_CONFIG[platform].shortLabel} URLs were detected in the pasted content.`, "error");
  } else {
    showMessage(`${platformState.extractedUrls.length} ${PLATFORM_CONFIG[platform].shortLabel} URL${platformState.extractedUrls.length === 1 ? "" : "s"} extracted and ready to review.`, "success");
  }

  render();
}

async function addSelectedExtractedUrls(platform) {
  const urls = state.platforms[platform].extractedUrls.filter((item) => item.selected).map((item) => item.url);
  if (!urls.length) {
    showMessage("Select at least one extracted URL to add it to the queue.", "error");
    return;
  }
  await analyzeAndQueue(platform, urls);
}

async function analyzeAndQueue(platform, urls) {
  const platformState = state.platforms[platform];
  const settings = collectSettings(platform);

  platformState.isAnalyzing = true;
  render();
  showMessage(`Validating ${urls.length} URL${urls.length === 1 ? "" : "s"} and fetching media details...`, "info");

  try {
    const result = await platformApi.analyzeUrls({ platform, urls });
    const filteredItems = result.items.filter((item) => item.status === "Failed" || matchesDownloadFilter(item, settings.contentFilter));
    mergeQueueItems(platform, filteredItems);

    const readyCount = filteredItems.filter((item) => item.directUrl).length;
    const failedCount = filteredItems.filter((item) => item.status === "Failed").length;
    const filteredOut = result.items.length - filteredItems.length;

    if (readyCount) {
      showMessage(
        `Added ${readyCount} item${readyCount === 1 ? "" : "s"} to the ${PLATFORM_CONFIG[platform].shortLabel} queue.${failedCount ? ` ${failedCount} item${failedCount === 1 ? "" : "s"} failed validation.` : ""}${filteredOut ? ` ${filteredOut} item${filteredOut === 1 ? " was" : "s were"} skipped by the current download-type filter.` : ""}`,
        "success",
      );
    } else {
      showMessage("No downloadable media matched the submitted URLs and current filter.", "error");
    }
  } catch (error) {
    showMessage(`Analysis failed: ${error.message}`, "error");
  } finally {
    platformState.isAnalyzing = false;
    render();
  }
}

async function startDownload(platform, itemsOverride = null, attempt = 0) {
  const platformState = state.platforms[platform];
  const settings = collectSettings(platform);
  const candidateItems = itemsOverride || platformState.queueItems.filter((item) => item.selected);
  const selectedItems = [];
  let incompatibleCount = 0;

  candidateItems.forEach((item) => {
    if (!item.selected) {
      return;
    }

    const prepared = prepareDownloadItem(item, settings);
    if (!prepared.directUrl) {
      const queueItem = findQueueItem(platform, item.id);
      if (queueItem) {
        queueItem.status = "Failed";
        queueItem.error = "unsupported format";
      }
      incompatibleCount += 1;
      return;
    }

    selectedItems.push(prepared);
  });

  if (!selectedItems.length) {
    showMessage(incompatibleCount ? "No compatible items matched the current download settings." : "Select at least one valid queue item before starting the batch download.", "error");
    render();
    return;
  }

  platformState.isDownloading = true;
  state.activeDownloadPlatform = platform;
  platformState.progress = {
    total: selectedItems.length,
    completed: 0,
    failed: 0,
    skipped: 0,
    remaining: selectedItems.length,
    speedBps: 0,
  };

  const selectedIds = new Set(selectedItems.map((item) => item.id));
  selectedItems.forEach((item) => {
    const queueItem = findQueueItem(platform, item.id);
    if (queueItem && queueItem.status !== "Saved") {
      queueItem.status = "Pending";
      queueItem.error = null;
      queueItem.savedPath = null;
      queueItem.bytesDownloaded = 0;
      queueItem.selectedVariantKey = item.selectedVariantKey;
      queueItem.selectedFormatId = item.selectedFormatId || null;
      queueItem.directUrl = item.directUrl;
      queueItem.requestHeaders = item.requestHeaders || {};
      queueItem.extension = item.extension;
      queueItem.fileSize = item.fileSize;
      queueItem.mediaType = item.mediaType;
      queueItem.qualityLabel = item.qualityLabel;
      queueItem.resolution = item.resolution;
    }
  });

  render();

  try {
    const result = await platformApi.startDownloads({
      platform,
      saveFolder: platformState.folderPath,
      items: selectedItems,
      settings,
    });

    platformState.downloadLog = result.log || [];
    platformState.latestSummary = buildBatchSummary(platformState.queueItems, selectedIds);

    const retryItems = state.globalSettings.autoRetryFailed && attempt === 0
      ? platformState.queueItems.filter((item) => selectedIds.has(item.id) && item.status === "Failed" && item.directUrl)
      : [];

    if (retryItems.length) {
      showMessage(`Retrying ${retryItems.length} failed item${retryItems.length === 1 ? "" : "s"} once automatically...`, "info");
      platformState.isDownloading = false;
      render();
      await startDownload(platform, retryItems, attempt + 1);
      return;
    }

    appendHistory(platform, platformState, result, selectedIds);

    if (state.globalSettings.openFolderAfterComplete && state.environment.canOpenFolder) {
      await openFolder(platform, true);
    }

    showMessage("Batch download finished. Review the summary below or open the folder directly.", "success");
  } catch (error) {
    showMessage(`Download failed: ${error.message}`, "error");
  } finally {
    platformState.isDownloading = false;
    state.activeDownloadPlatform = null;
    render();
  }
}

async function retryFailedItems(platform) {
  const platformState = state.platforms[platform];
  const failedAnalysis = platformState.queueItems.filter((item) => item.status === "Failed" && !item.downloadVariants.length);
  const failedDownloads = platformState.queueItems.filter((item) => item.status === "Failed" && item.downloadVariants.length);

  if (!failedAnalysis.length && !failedDownloads.length) {
    showMessage("There are no failed items to retry right now.", "info");
    return;
  }

  if (failedAnalysis.length) {
    const urls = [...new Set(failedAnalysis.map((item) => item.sourceUrl).filter(Boolean))];
    platformState.queueItems = platformState.queueItems.filter((item) => !(item.status === "Failed" && !item.downloadVariants.length));
    await analyzeAndQueue(platform, urls);
  }

  if (failedDownloads.length) {
    failedDownloads.forEach((item) => {
      item.selected = true;
      item.status = "Pending";
      item.error = null;
    });
    await startDownload(platform, failedDownloads);
  }
}

async function retryItem(platform, itemId) {
  const item = findQueueItem(platform, itemId);
  if (!item) {
    return;
  }

  if (item.downloadVariants.length) {
    item.selected = true;
    item.status = "Pending";
    item.error = null;
    await startDownload(platform, [item]);
    return;
  }

  if (item.sourceUrl) {
    removeItem(platform, itemId, false);
    await analyzeAndQueue(platform, [item.sourceUrl]);
  }
}

async function selectFolder(platform) {
  const result = await platformApi.selectFolder();
  if (result.canceled) {
    return;
  }
  if (result.error) {
    showMessage(`Could not select folder: ${result.error}`, "error");
    return;
  }
  if (result.unsupported) {
    await refreshEnvironment(platform);
    state.platforms[platform].folderPath = await platformApi.getDefaultFolder(platform);
    render();
    showMessage("This browser uses browser-managed downloads instead of direct folder access.", "info");
    return;
  }

  state.platforms[platform].folderPath = result.folderPath;
  await refreshEnvironment(platform);
  render();
  showMessage("Save folder updated.", "success");
}

async function openFolder(platform, silent = false) {
  const folderPath = state.platforms[platform].folderPath;
  if (!folderPath) {
    showMessage("Choose a folder first.", "error");
    return;
  }
  const result = await platformApi.openFolder(folderPath);
  if (!result.ok && !silent) {
    showMessage(`Could not open folder: ${result.error}`, "error");
  }
}

async function importTextFile(platform) {
  const result = await platformApi.importTextFile();
  if (result.canceled) {
    return;
  }

  const platformState = state.platforms[platform];
  platformState.importedFilePath = result.filePath;
  platformState.extractInput = `${platformState.extractInput.trim()}\n${result.content}`.trim();
  platformState.mode = "extract";
  showMessage("Imported file content into extract mode. Run Extract URL to scan it.", "success");
  render();
}

async function exportLog(platform) {
  const platformState = state.platforms[platform];
  if (!platformState.downloadLog.length) {
    showMessage("There is no download log to export yet.", "error");
    return;
  }

  const result = await platformApi.exportLog({
    platform,
    summary: platformState.latestSummary,
    log: platformState.downloadLog,
  });

  if (!result.canceled) {
    showMessage(`Download log exported to ${result.filePath}.`, "success");
  }
}

function handleDownloadEvent(event) {
  const platform = state.activeDownloadPlatform;
  if (!platform) {
    return;
  }

  const platformState = state.platforms[platform];

  if (event.summary) {
    platformState.progress = event.summary;
  }

  if (event.type === "item-progress") {
    const item = findQueueItem(platform, event.itemId);
    if (item) {
      item.status = event.status;
      item.bytesDownloaded = event.bytesDownloaded || 0;
      item.totalBytes = event.totalBytes || item.fileSize || null;
    }
  }

  if (event.type === "item-status") {
    const item = findQueueItem(platform, event.itemId);
    if (item) {
      item.status = event.status;
      item.error = event.error || null;
      item.savedPath = event.savedPath || null;
      if (typeof event.bytesDownloaded === "number") {
        item.bytesDownloaded = event.bytesDownloaded;
      }
    }
    if (event.logEntry) {
      platformState.downloadLog = replaceOrAppendLogEntry(platformState.downloadLog, event.logEntry);
    }
  }

  if (event.type === "queue-start") {
    platformState.downloadLog = [];
  }

  if (event.type === "queue-complete") {
    platformState.downloadLog = event.log || platformState.downloadLog;
  }

  render();
}

function prepareDownloadItem(item, settings) {
  const variant = selectVariant(item, settings);
  if (!variant) {
    return { ...item, directUrl: null };
  }

  return {
    ...item,
    directUrl: variant.directUrl,
    requestHeaders: variant.requestHeaders || {},
    extension: variant.extension || item.extension,
    fileSize: variant.fileSize || item.fileSize,
    mediaType: variant.mediaType || item.mediaType,
    qualityLabel: variant.qualityLabel || item.qualityLabel,
    resolution: variant.resolution || item.resolution,
    width: variant.width || item.width,
    height: variant.height || item.height,
    selectedVariantKey: variant.key,
    selectedFormatId: variant.formatId || item.selectedFormatId || null,
  };
}

function selectVariant(item, settings) {
  const variants = Array.isArray(item.downloadVariants) ? item.downloadVariants : [];
  if (!variants.length) {
    return item.directUrl ? {
      key: item.selectedVariantKey || "default",
      directUrl: item.directUrl,
      requestHeaders: item.requestHeaders || {},
      extension: item.extension,
      fileSize: item.fileSize,
      mediaType: item.mediaType,
      qualityLabel: item.qualityLabel,
      resolution: item.resolution,
      width: item.width,
      height: item.height,
    } : null;
  }

  if (item.platform === "youtube") {
    if (settings.audioOnly) {
      return pickVariantByQuality(variants.filter((variant) => variant.audioOnly), settings.quality)
        || variants.find((variant) => variant.audioOnly)
        || null;
    }

    if (settings.includeAudio) {
      return pickVariantByQuality(variants.filter((variant) => variant.hasVideo && variant.hasAudio), settings.quality)
        || pickVariantByQuality(variants.filter((variant) => variant.hasVideo), settings.quality)
        || null;
    }

    return pickVariantByQuality(variants.filter((variant) => variant.hasVideo), settings.quality) || null;
  }

  if (item.platform === "tiktok") {
    let pool = variants.filter((variant) => variant.hasVideo);

    if (settings.watermarkMode === "with") {
      const watermarked = pool.filter((variant) => variant.watermark === "with");
      if (watermarked.length) {
        pool = watermarked;
      }
    }

    if (settings.watermarkMode === "without") {
      const withoutWatermark = pool.filter((variant) => variant.watermark === "without");
      if (withoutWatermark.length) {
        pool = withoutWatermark;
      }
    }

    return pickVariantByQuality(pool, settings.quality) || null;
  }

  return variants[0] || null;
}

function pickVariantByQuality(variants, quality) {
  if (!variants.length) {
    return null;
  }

  const sorted = [...variants].sort((left, right) => {
    const leftScore = Number(left.qualityValue || left.height || left.width || 0);
    const rightScore = Number(right.qualityValue || right.height || right.width || 0);
    return rightScore - leftScore;
  });

  if (!quality || quality === "best" || quality === "original") {
    return sorted[0];
  }

  const target = Number(quality);
  if (!Number.isFinite(target)) {
    return sorted[0];
  }

  return sorted.find((variant) => Number(variant.qualityValue || variant.height || variant.width || 0) <= target) || sorted[0];
}

function updateAllSelection(platform, selected) {
  getVisibleQueueItems(platform).forEach((item) => {
    if (item.downloadVariants.length || item.directUrl) {
      item.selected = selected;
    }
  });
  render();
}

function updateAllExtractedSelection(platform, selected) {
  state.platforms[platform].extractedUrls = state.platforms[platform].extractedUrls.map((item) => ({
    ...item,
    selected,
  }));
  render();
}

function removeUncheckedExtracted(platform) {
  state.platforms[platform].extractedUrls = state.platforms[platform].extractedUrls.filter((item) => item.selected);
  render();
}

function removeSelectedItems(platform) {
  const platformState = state.platforms[platform];
  const before = platformState.queueItems.length;
  platformState.queueItems = platformState.queueItems.filter((item) => !item.selected);
  const removed = before - platformState.queueItems.length;
  render();
  showMessage(`${removed} queue item${removed === 1 ? "" : "s"} removed.`, "success");
}

function removeItem(platform, itemId, renderAfter = true) {
  const platformState = state.platforms[platform];
  platformState.queueItems = platformState.queueItems.filter((item) => item.id !== itemId);
  if (renderAfter) {
    render();
  }
}

function clearCurrentInput(platform) {
  const platformState = state.platforms[platform];
  if (platformState.mode === "single") {
    platformState.singleInput = "";
  } else if (platformState.mode === "multiple") {
    platformState.multiInput = "";
  } else {
    platformState.extractInput = "";
    platformState.extractedUrls = [];
    platformState.importedFilePath = "";
  }
  clearMessage();
  render();
}

function mergeQueueItems(platform, items) {
  const platformState = state.platforms[platform];
  const existing = new Map(platformState.queueItems.map((item) => [buildItemKey(item), item]));
  items.forEach((item) => {
    const key = buildItemKey(item);
    const current = existing.get(key);
    existing.set(key, current ? { ...current, ...item, id: current.id } : item);
  });
  platformState.queueItems = [...existing.values()];
}

function buildItemKey(item) {
  return [item.platform, item.sourceUrl, item.resourceId || item.pinId || "unknown", item.index || 1].join("::");
}

function findQueueItem(platform, itemId) {
  return state.platforms[platform].queueItems.find((item) => item.id === itemId);
}

function replaceOrAppendLogEntry(log, entry) {
  const key = [entry.sourceUrl, entry.directUrl || "none", entry.status].join("::");
  const index = log.findIndex((row) => [row.sourceUrl, row.directUrl || "none", row.status].join("::") === key);
  if (index === -1) {
    return [...log, entry];
  }
  const next = [...log];
  next[index] = entry;
  return next;
}

function buildBatchSummary(queueItems, selectedIds) {
  const batchItems = queueItems.filter((item) => selectedIds.has(item.id));
  const summary = createDetailedSummary();
  summary.total = batchItems.length;
  summary.completed = batchItems.filter((item) => item.status === "Saved").length;
  summary.failed = batchItems.filter((item) => item.status === "Failed").length;
  summary.skipped = batchItems.filter((item) => item.status === "Skipped Duplicate").length;
  summary.shortDownloaded = batchItems.filter((item) => item.status === "Saved" && item.contentType === "short").length;
  summary.videoDownloaded = batchItems.filter((item) => item.status === "Saved" && item.contentType === "video").length;
  summary.imageDownloaded = batchItems.filter((item) => item.status === "Saved" && item.contentType === "image").length;
  summary.galleryDownloaded = batchItems.filter((item) => item.status === "Saved" && item.contentType === "gallery").length;
  return summary;
}

function appendHistory(platform, platformState, result, selectedIds) {
  state.history.unshift({
    id: `history-${Date.now()}`,
    platform,
    createdAt: new Date().toISOString(),
    outputFolder: result.outputFolder || platformState.folderPath,
    summary: buildBatchSummary(platformState.queueItems, selectedIds),
    log: result.log || [],
  });
  state.history = state.history.slice(0, 50);
  saveHistory();
}

function collectSettings(platform) {
  return {
    ...state.globalSettings,
    ...state.platformSettings[platform],
  };
}

function applySettingInput(element) {
  const scope = element.dataset.settingScope;
  const setting = element.dataset.setting;
  const target = scope === "global" ? state.globalSettings : state.platformSettings[scope];
  target[setting] = element.type === "checkbox" ? element.checked : element.value;

  if (scope !== "global" && setting === "audioOnly" && element.checked) {
    target.includeAudio = false;
  }
  if (scope !== "global" && setting === "includeAudio" && element.checked) {
    target.audioOnly = false;
  }
}

function loadStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      state.currentMenu = stored.currentMenu || state.currentMenu;
      state.lastPlatform = stored.lastPlatform || state.lastPlatform;
      state.globalSettings = { ...state.globalSettings, ...(stored.globalSettings || {}) };
      platformKeys().forEach((platform) => {
        state.platformSettings[platform] = { ...state.platformSettings[platform], ...((stored.platformSettings || {})[platform] || {}) };
        state.platforms[platform].folderPath = ((stored.folders || {})[platform]) || "";
      });
    }
  } catch {
    // Ignore malformed settings.
  }

  try {
    const historyRaw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (historyRaw) {
      state.history = JSON.parse(historyRaw);
    }
  } catch {
    state.history = [];
  }

  if (!state.globalSettings.rememberLastMenu) {
    state.currentMenu = "home";
  }

  if (!MENU_CONFIG[state.currentMenu] && !PLATFORM_CONFIG[state.currentMenu]) {
    state.currentMenu = "home";
  }
}

function savePreferences() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentMenu: state.globalSettings.rememberLastMenu ? state.currentMenu : "home",
      lastPlatform: state.lastPlatform,
      globalSettings: state.globalSettings,
      platformSettings: state.platformSettings,
      folders: Object.fromEntries(platformKeys().map((platform) => [platform, state.platforms[platform].folderPath])),
    }));
  } catch {
    // Ignore storage failures.
  }
}

function saveHistory() {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history));
  } catch {
    // Ignore storage failures.
  }
}

function render() {
  renderSidebar();
  renderHero();
  renderMessage();
  renderPage();
  savePreferences();
}

function renderSidebar() {
  elements.menuButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.menu === state.currentMenu);
  });
}

function renderHero() {
  const platform = getMenuPlatform();
  const platformState = state.platforms[platform];
  const heroMeta = PLATFORM_CONFIG[state.currentMenu]
    ? {
      step: PLATFORM_CONFIG[state.currentMenu].shortLabel,
      title: PLATFORM_CONFIG[state.currentMenu].label,
      lead: PLATFORM_CONFIG[state.currentMenu].heroLead,
      badge: PLATFORM_CONFIG[state.currentMenu].shortLabel,
    }
    : MENU_CONFIG[state.currentMenu];

  elements.heroStep.textContent = heroMeta.step;
  elements.heroTitle.textContent = heroMeta.title;
  elements.heroLead.textContent = heroMeta.lead;
  elements.heroPlatformBadge.textContent = heroMeta.badge || "Hub";
  elements.heroSaveBadge.textContent = state.environment.saveModeLabel || "Browser Downloads";
  elements.heroSaveBadge.className = `status-pill ${state.environment.saveMode === "direct-folder" ? "saved" : "pending"}`;

  if (PLATFORM_CONFIG[state.currentMenu]) {
    const queued = platformState.queueItems.length;
    const selected = platformState.queueItems.filter((item) => item.selected && (item.downloadVariants.length || item.directUrl)).length;
    const saved = platformState.queueItems.filter((item) => item.status === "Saved").length;
    const failed = platformState.queueItems.filter((item) => item.status === "Failed").length;

    elements.queueCount.textContent = String(queued);
    elements.queueDetail.textContent = selected ? `${selected} selected for download` : "Nothing selected yet";
    elements.completedCount.textContent = String(saved);
    elements.completedDetail.textContent = `${platformState.progress.completed || 0} saved in latest batch`;
    elements.failedCount.textContent = String(failed);
    elements.failedDetail.textContent = failed ? "Some items need attention" : "No failed items";
    elements.speedCount.textContent = formatSpeed(platformState.progress.speedBps || 0);
    elements.remainingCount.textContent = `${platformState.progress.remaining || 0} remaining`;
    return;
  }

  if (state.currentMenu === "history") {
    const totalBatches = state.history.length;
    const totalDownloads = state.history.reduce((sum, entry) => sum + (entry.summary.completed || 0), 0);
    const totalFailed = state.history.reduce((sum, entry) => sum + (entry.summary.failed || 0), 0);

    elements.queueCount.textContent = String(totalBatches);
    elements.queueDetail.textContent = totalBatches ? "Saved batch records" : "No history yet";
    elements.completedCount.textContent = String(totalDownloads);
    elements.completedDetail.textContent = "Downloaded items across all batches";
    elements.failedCount.textContent = String(totalFailed);
    elements.failedDetail.textContent = totalFailed ? "Failures captured in history" : "No failed history items";
    elements.speedCount.textContent = "Archive";
    elements.remainingCount.textContent = `${totalBatches} entries`;
    return;
  }

  const totalQueued = platformKeys().reduce((sum, key) => sum + state.platforms[key].queueItems.length, 0);
  const totalSaved = platformKeys().reduce((sum, key) => sum + state.platforms[key].queueItems.filter((item) => item.status === "Saved").length, 0);
  const totalFailed = platformKeys().reduce((sum, key) => sum + state.platforms[key].queueItems.filter((item) => item.status === "Failed").length, 0);

  elements.queueCount.textContent = String(totalQueued);
  elements.queueDetail.textContent = "Combined items across all platform queues";
  elements.completedCount.textContent = String(totalSaved);
  elements.completedDetail.textContent = "Completed items in the current session";
  elements.failedCount.textContent = String(totalFailed);
  elements.failedDetail.textContent = totalFailed ? "Some queues need attention" : "No failed items";
  elements.speedCount.textContent = state.environment.runtime === "desktop" ? "Direct Save" : "PWA Ready";
  elements.remainingCount.textContent = `${state.history.length} history entries`;
}

function renderMessage() {
  if (!state.message) {
    elements.messageBanner.className = "message-banner hidden";
    elements.messageBanner.textContent = "";
    return;
  }

  elements.messageBanner.className = `message-banner ${state.message.type}`;
  elements.messageBanner.textContent = state.message.text;
}

function renderPage() {
  if (PLATFORM_CONFIG[state.currentMenu]) {
    elements.pageContent.innerHTML = renderPlatformPage(state.currentMenu);
    return;
  }

  if (state.currentMenu === "history") {
    elements.pageContent.innerHTML = renderHistoryPage();
    return;
  }

  if (state.currentMenu === "settings") {
    elements.pageContent.innerHTML = renderSettingsPage();
    return;
  }

  elements.pageContent.innerHTML = renderHomePage();
}

function renderHomePage() {
  const cards = platformKeys().map((platform) => {
    const platformState = state.platforms[platform];
    const completed = platformState.queueItems.filter((item) => item.status === "Saved").length;
    const failed = platformState.queueItems.filter((item) => item.status === "Failed").length;
    const queued = platformState.queueItems.length;

    return `
      <article class="panel home-card">
        <p class="section-step">${escapeHtml(PLATFORM_CONFIG[platform].shortLabel)}</p>
        <h3>${escapeHtml(PLATFORM_CONFIG[platform].label)}</h3>
        <p class="field-note">${escapeHtml(PLATFORM_CONFIG[platform].heroLead)}</p>
        <div class="home-card-stats">
          <span><strong>${queued}</strong> queued</span>
          <span><strong>${completed}</strong> saved</span>
          <span><strong>${failed}</strong> failed</span>
        </div>
        <button class="primary-btn" data-action="open-platform" data-platform="${platform}" type="button">Open ${escapeHtml(PLATFORM_CONFIG[platform].shortLabel)} menu</button>
      </article>
    `;
  }).join("");

  const latest = state.history[0];
  return `
    <section class="home-grid">
      <div class="home-cards">${cards}</div>

      <section class="panel insight-card">
        <div class="panel-head">
          <div>
            <p class="section-step">Quick Start</p>
            <h2>How this hub works</h2>
          </div>
        </div>
        <ol class="flow-list">
          <li>Choose Pinterest, YouTube, or TikTok from the sidebar.</li>
          <li>Paste one URL, a batch of URLs, or extract URLs from raw text or an imported file.</li>
          <li>Review the detected media, choose a folder, then launch the batch download.</li>
          <li>Open history later to review completed batches or export the saved log.</li>
        </ol>
      </section>

      <section class="panel insight-card">
        <div class="panel-head">
          <div>
            <p class="section-step">Recent Activity</p>
            <h2>${latest ? "Latest finished batch" : "No batches finished yet"}</h2>
          </div>
        </div>
        ${latest ? `
          <div class="history-highlight">
            <span class="badge">${escapeHtml(PLATFORM_CONFIG[latest.platform].shortLabel)}</span>
            <strong>${escapeHtml(formatDateTime(latest.createdAt))}</strong>
            <p class="field-note">${latest.summary.completed} downloaded, ${latest.summary.failed} failed, ${latest.summary.skipped} skipped duplicates.</p>
          </div>
        ` : `<p class="field-note">Run a batch download to populate local history and summaries here.</p>`}
      </section>
    </section>
  `;
}

function renderPlatformPage(platform) {
  const config = PLATFORM_CONFIG[platform];
  const platformState = state.platforms[platform];
  const settings = collectSettings(platform);
  const visibleItems = getVisibleQueueItems(platform).map((item) => prepareDownloadItem(item, settings));
  const progress = platformState.progress;
  const processed = (progress.completed || 0) + (progress.failed || 0) + (progress.skipped || 0);
  const progressPercent = progress.total ? Math.min((processed / progress.total) * 100, 100) : 0;

  return `
    <div class="page-grid">
      <section class="panel source-panel">
        <div class="panel-head">
          <div>
            <p class="section-step">1. Input Source</p>
            <h2>Collect ${escapeHtml(config.shortLabel)} URLs</h2>
            <p class="field-note">${escapeHtml(config.inputHelp)}</p>
          </div>
          <div class="mode-switch" role="tablist" aria-label="Input mode">
            ${["single", "multiple", "extract"].map((mode) => `
              <button class="mode-btn ${platformState.mode === mode ? "active" : ""}" data-action="set-mode" data-platform="${platform}" data-mode="${mode}" type="button">
                ${mode === "single" ? "Single Download" : mode === "multiple" ? "Batch Download" : "Extract URLs"}
              </button>
            `).join("")}
          </div>
        </div>

        <div class="filter-row">
          <span class="field-label">Download type</span>
          <div class="pill-group">
            ${config.filterOptions.map((option) => `
              <label class="choice-pill">
                <input data-setting-scope="${platform}" data-setting="contentFilter" type="radio" name="${platform}-content-filter" value="${option.value}" ${settings.contentFilter === option.value ? "checked" : ""} />
                <span>${escapeHtml(option.label)}</span>
              </label>
            `).join("")}
          </div>
        </div>

        <div class="mode-pane ${platformState.mode === "single" ? "active" : ""}">
          <label class="field-label" for="${platform}-single-url">${escapeHtml(config.singleLabel)}</label>
          <input id="${platform}-single-url" class="text-input" data-source-field="singleInput" data-platform="${platform}" type="url" value="${escapeHtml(platformState.singleInput)}" placeholder="${escapeHtml(config.singlePlaceholder)}" />
        </div>

        <div class="mode-pane ${platformState.mode === "multiple" ? "active" : ""}">
          <label class="field-label" for="${platform}-multi-url">${escapeHtml(config.multiLabel)}</label>
          <textarea id="${platform}-multi-url" class="text-area" data-source-field="multiInput" data-platform="${platform}" placeholder="${escapeHtml(config.multiPlaceholder)}">${escapeHtml(platformState.multiInput)}</textarea>
          <p class="field-note">Duplicates are removed automatically before validation.</p>
        </div>

        <div class="mode-pane ${platformState.mode === "extract" ? "active" : ""}">
          <div class="extract-grid">
            <div>
              <label class="field-label" for="${platform}-extract-source">${escapeHtml(config.extractLabel)}</label>
              <textarea id="${platform}-extract-source" class="text-area tall" data-source-field="extractInput" data-platform="${platform}" placeholder="${escapeHtml(config.extractPlaceholder)}">${escapeHtml(platformState.extractInput)}</textarea>
              <div class="inline-actions">
                <button class="ghost-btn" data-action="import-file" data-platform="${platform}" type="button">Import List/File</button>
                <span class="muted">${escapeHtml(platformState.importedFilePath || "No file imported")}</span>
              </div>
            </div>

            <div class="extract-results">
              <div class="extract-head">
                <div>
                  <span class="field-label">Extracted URLs</span>
                  <p class="field-note">${platformState.extractedUrls.length} URL${platformState.extractedUrls.length === 1 ? "" : "s"} detected</p>
                </div>
                <div class="inline-actions compact">
                  <button class="ghost-btn" data-action="select-extracted" data-platform="${platform}" type="button">Select All</button>
                  <button class="ghost-btn" data-action="remove-extracted" data-platform="${platform}" type="button">Remove Unwanted</button>
                </div>
              </div>
              <div class="extract-list ${platformState.extractedUrls.length ? "" : "empty"}">
                ${platformState.extractedUrls.length
                  ? platformState.extractedUrls.map((item) => `
                    <label class="extract-item">
                      <input data-select-extracted data-platform="${platform}" data-id="${item.id}" type="checkbox" ${item.selected ? "checked" : ""} />
                      <span>${escapeHtml(item.url)}</span>
                    </label>
                  `).join("")
                  : `<p>${escapeHtml(config.extractEmpty)}</p>`}
              </div>
            </div>
          </div>
        </div>

        <div class="toolbar">
          <button class="primary-btn" data-action="find-url" data-platform="${platform}" type="button" ${platformState.isAnalyzing || platformState.isDownloading || platformState.mode === "extract" ? "disabled" : ""}>Find URL</button>
          <button class="secondary-btn" data-action="extract-url" data-platform="${platform}" type="button" ${platformState.isAnalyzing || platformState.isDownloading || platformState.mode !== "extract" ? "disabled" : ""}>Extract URL</button>
          <button class="secondary-btn" data-action="add-extracted" data-platform="${platform}" type="button" ${platformState.isAnalyzing || platformState.isDownloading || !platformState.extractedUrls.some((item) => item.selected) ? "disabled" : ""}>Add Selected URLs</button>
          <button class="ghost-btn" data-action="clear-input" data-platform="${platform}" type="button" ${platformState.isAnalyzing || platformState.isDownloading ? "disabled" : ""}>Clear</button>
        </div>
      </section>

      <aside class="panel settings-panel">
        <div class="panel-head">
          <div>
            <p class="section-step">2. Save + Options</p>
            <h2>Choose folder and defaults</h2>
          </div>
        </div>

        <div class="folder-card">
          <span class="field-label">Selected folder</span>
          <div class="inline-meta">
            <span class="status-pill ${state.environment.saveMode === "direct-folder" ? "saved" : "pending"}">${escapeHtml(state.environment.saveModeLabel || "Browser Downloads")}</span>
          </div>
          <div class="folder-path">${escapeHtml(platformState.folderPath || config.saveHint)}</div>
          <div class="inline-actions">
            <button class="primary-btn" data-action="select-folder" data-platform="${platform}" type="button" ${platformState.isAnalyzing || platformState.isDownloading || !state.environment.canSelectFolder ? "disabled" : ""}>Select Folder</button>
            ${state.environment.canOpenFolder ? `<button class="ghost-btn" data-action="open-folder" data-platform="${platform}" type="button" ${platformState.isAnalyzing || platformState.isDownloading ? "disabled" : ""}>Open Folder</button>` : ""}
          </div>
          <p class="field-note">${escapeHtml(state.environment.saveHint || config.saveHint)}</p>
        </div>

        ${renderPlatformSpecificOptions(platform, settings)}

        <div class="settings-group">
          <h3>Shared download behavior</h3>
          <label class="field-label" for="${platform}-duplicate-policy">Duplicate handling</label>
          <select id="${platform}-duplicate-policy" class="select-input" data-setting-scope="global" data-setting="duplicatePolicy">
            <option value="rename" ${state.globalSettings.duplicatePolicy === "rename" ? "selected" : ""}>Rename automatically (Recommended)</option>
            <option value="skip" ${state.globalSettings.duplicatePolicy === "skip" ? "selected" : ""}>Skip duplicate file</option>
            <option value="overwrite" ${state.globalSettings.duplicatePolicy === "overwrite" ? "selected" : ""}>Overwrite existing file</option>
          </select>

          <label class="field-label" for="${platform}-concurrency">Max parallel downloads</label>
          <select id="${platform}-concurrency" class="select-input" data-setting-scope="global" data-setting="concurrency">
            ${[1, 2, 3, 4].map((value) => `<option value="${value}" ${Number(state.globalSettings.concurrency) === value ? "selected" : ""}>${value === 1 ? "Sequential" : `Parallel x${value}`}</option>`).join("")}
          </select>

          <div class="checkbox-grid">
            ${renderCheckbox("global", "subfolderByPlatform", "Create subfolder by platform", state.globalSettings.subfolderByPlatform)}
            ${renderCheckbox("global", "subfolderByDate", "Create subfolder by date", state.globalSettings.subfolderByDate)}
            ${renderCheckbox("global", "subfolderByCreator", "Create subfolder by creator / board", state.globalSettings.subfolderByCreator)}
            ${renderCheckbox("global", "subfolderByContentType", "Create subfolder by content type", state.globalSettings.subfolderByContentType)}
            ${renderCheckbox("global", "useTitle", "Use title in file name", state.globalSettings.useTitle)}
            ${renderCheckbox("global", "useCreator", "Add creator / channel to file name", state.globalSettings.useCreator)}
            ${renderCheckbox("global", "addDate", "Add date to file name", state.globalSettings.addDate)}
          </div>
        </div>

        <button class="cta-btn" data-action="start-download" data-platform="${platform}" type="button" ${platformState.isAnalyzing || platformState.isDownloading || !platformState.queueItems.some((item) => item.selected && (item.downloadVariants.length || item.directUrl)) ? "disabled" : ""}>Start Batch Download</button>
      </aside>

      <section class="panel preview-panel">
        <div class="panel-head">
          <div>
            <p class="section-step">3. Preview List</p>
            <h2>Review queue</h2>
          </div>
          <div class="inline-actions compact">
            <button class="ghost-btn" data-action="select-all" data-platform="${platform}" type="button">Select All</button>
            <button class="ghost-btn" data-action="unselect-all" data-platform="${platform}" type="button">Unselect All</button>
            <button class="ghost-btn" data-action="remove-selected" data-platform="${platform}" type="button">Remove Selected</button>
            <button class="ghost-btn" data-action="retry-failed" data-platform="${platform}" type="button">Retry Failed</button>
          </div>
        </div>

        <div class="filter-row compact">
          <span class="field-label">Preview filter</span>
          <div class="pill-group">
            ${config.previewFilters.map((filter) => `
              <button class="mini-pill ${platformState.previewFilter === filter.value ? "active" : ""}" data-action="set-preview-filter" data-platform="${platform}" data-filter="${filter.value}" type="button">${escapeHtml(filter.label)}</button>
            `).join("")}
          </div>
        </div>

        <div class="progress-strip">
          <div class="progress-head">
            <span>${platformState.isDownloading ? "Batch download in progress" : progress.total ? "Latest batch finished" : "Batch idle"}</span>
            <span>${processed} of ${progress.total || 0} items processed</span>
          </div>
          <div class="progress-bar"><span style="width:${progressPercent}%"></span></div>
        </div>

        <div class="table-frame">
          <table>
            <thead>
              <tr>
                <th>Select</th>
                <th>Preview</th>
                <th>Title / Caption</th>
                <th>Platform / Creator</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Quality</th>
                <th>Source URL</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${visibleItems.length ? visibleItems.map((item) => renderQueueRow(platform, item)).join("") : `<tr class="empty-row"><td colspan="10">No ${escapeHtml(config.shortLabel)} items queued yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel completion-panel">
        <div class="panel-head">
          <div>
            <p class="section-step">4. Download Complete</p>
            <h2>Summary &amp; follow-up actions</h2>
          </div>
        </div>

        <div class="completion-grid">
          <article class="completion-card"><span>Total URLs</span><strong>${platformState.latestSummary.total}</strong></article>
          <article class="completion-card"><span>Downloaded</span><strong>${platformState.latestSummary.completed}</strong></article>
          <article class="completion-card"><span>Shorts</span><strong>${platformState.latestSummary.shortDownloaded}</strong></article>
          <article class="completion-card"><span>Videos</span><strong>${platformState.latestSummary.videoDownloaded}</strong></article>
          <article class="completion-card"><span>Failed</span><strong>${platformState.latestSummary.failed}</strong></article>
          <article class="completion-card"><span>Skipped duplicates</span><strong>${platformState.latestSummary.skipped}</strong></article>
        </div>

        <div class="toolbar">
          ${state.environment.canOpenFolder ? `<button class="secondary-btn" data-action="open-folder" data-platform="${platform}" type="button">Open Folder</button>` : ""}
          <button class="secondary-btn" data-action="retry-failed" data-platform="${platform}" type="button">Retry Failed</button>
          <button class="primary-btn" data-action="export-log" data-platform="${platform}" type="button" ${platformState.downloadLog.length ? "" : "disabled"}>Export Download Log</button>
        </div>
      </section>
    </div>
  `;
}

function renderQueueRow(platform, item) {
  return `
    <tr>
      <td><input data-select-item data-platform="${platform}" data-id="${item.id}" type="checkbox" ${item.selected ? "checked" : ""} ${item.directUrl ? "" : "disabled"} /></td>
      <td>${item.thumbnailUrl ? `<img class="preview-thumb" src="${escapeHtml(item.thumbnailUrl)}" alt="${escapeHtml(item.title || item.pinTitle)}" />` : `<div class="thumb-placeholder">N/A</div>`}</td>
      <td class="title-cell">
        <strong>${escapeHtml(item.title || item.pinTitle)}</strong>
        <div class="title-meta">${escapeHtml(item.resolution || "Unknown")} ${item.fileSize ? `| ${escapeHtml(formatBytes(item.fileSize))}` : ""}</div>
        ${item.error ? `<div class="row-subtle">${escapeHtml(item.error)}</div>` : ""}
      </td>
      <td><span class="badge">${escapeHtml(item.platformLabel)}</span><div class="row-subtle">${escapeHtml(item.creatorName || item.boardName || item.channelName || "-")}</div></td>
      <td><span class="badge">${escapeHtml(item.contentTypeLabel || capitalize(item.mediaType || "media"))}</span></td>
      <td>${escapeHtml(item.durationLabel || "Unknown")}</td>
      <td>${escapeHtml(item.qualityLabel || "Best")}</td>
      <td><a class="source-link" href="${escapeHtml(item.normalizedUrl || item.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.sourceUrl)}</a></td>
      <td><span class="status-pill ${slugifyStatus(item.status)}">${escapeHtml(item.status)}</span></td>
      <td>
        <div class="row-actions">
          <button class="row-btn" data-action="retry-item" data-platform="${platform}" data-id="${item.id}" type="button">Retry</button>
          <button class="row-btn" data-action="remove-item" data-platform="${platform}" data-id="${item.id}" type="button">Remove</button>
        </div>
      </td>
    </tr>
  `;
}

function renderPlatformSpecificOptions(platform, settings) {
  if (platform === "youtube") {
    return `
      <div class="settings-group">
        <h3>YouTube options</h3>
        <label class="field-label" for="youtube-quality">Select video quality</label>
        <select id="youtube-quality" class="select-input" data-setting-scope="youtube" data-setting="quality">
          ${PLATFORM_CONFIG.youtube.qualityOptions.map((option) => `<option value="${option.value}" ${settings.quality === option.value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
        </select>
        <div class="checkbox-grid">
          ${renderCheckbox("youtube", "includeAudio", "Download video with audio", Boolean(settings.includeAudio))}
          ${renderCheckbox("youtube", "audioOnly", "Download audio only if supported", Boolean(settings.audioOnly))}
        </div>
        <label class="field-label" for="youtube-prefix">Custom prefix</label>
        <input id="youtube-prefix" class="text-input" data-setting-scope="youtube" data-setting="customPrefix" data-live-render="true" type="text" value="${escapeHtml(settings.customPrefix)}" />
      </div>
    `;
  }

  if (platform === "tiktok") {
    return `
      <div class="settings-group">
        <h3>TikTok options</h3>
        <label class="field-label" for="tiktok-quality">Select quality</label>
        <select id="tiktok-quality" class="select-input" data-setting-scope="tiktok" data-setting="quality">
          ${PLATFORM_CONFIG.tiktok.qualityOptions.map((option) => `<option value="${option.value}" ${settings.quality === option.value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
        </select>
        <label class="field-label" for="tiktok-watermark">Watermark preference</label>
        <select id="tiktok-watermark" class="select-input" data-setting-scope="tiktok" data-setting="watermarkMode">
          <option value="without" ${settings.watermarkMode === "without" ? "selected" : ""}>Prefer without watermark</option>
          <option value="with" ${settings.watermarkMode === "with" ? "selected" : ""}>Prefer with watermark</option>
          <option value="any" ${settings.watermarkMode === "any" ? "selected" : ""}>Any available version</option>
        </select>
        <label class="field-label" for="tiktok-prefix">Custom prefix</label>
        <input id="tiktok-prefix" class="text-input" data-setting-scope="tiktok" data-setting="customPrefix" data-live-render="true" type="text" value="${escapeHtml(settings.customPrefix)}" />
      </div>
    `;
  }

  return `
    <div class="settings-group">
      <h3>Pinterest options</h3>
      <label class="field-label" for="pinterest-quality">Media quality</label>
      <select id="pinterest-quality" class="select-input" data-setting-scope="pinterest" data-setting="quality">
        <option value="original" selected>Original extracted media</option>
      </select>
      <label class="field-label" for="pinterest-prefix">Custom prefix</label>
      <input id="pinterest-prefix" class="text-input" data-setting-scope="pinterest" data-setting="customPrefix" data-live-render="true" type="text" value="${escapeHtml(settings.customPrefix)}" />
      <p class="field-note">Pinterest pins use the original extracted image or video URL when available.</p>
    </div>
  `;
}

function renderHistoryPage() {
  return `
    <section class="panel history-panel">
      <div class="panel-head">
        <div>
          <p class="section-step">Saved History</p>
          <h2>Completed batch archive</h2>
        </div>
        <div class="inline-actions compact">
          <button class="ghost-btn" data-action="clear-history" type="button" ${state.history.length ? "" : "disabled"}>Clear History</button>
        </div>
      </div>
      <div class="table-frame">
        <table>
          <thead><tr><th>Run Time</th><th>Platform</th><th>Downloaded</th><th>Shorts</th><th>Videos</th><th>Failed</th><th>Skipped</th><th>Folder</th></tr></thead>
          <tbody>
            ${state.history.length ? state.history.map((entry) => `
              <tr>
                <td>${escapeHtml(formatDateTime(entry.createdAt))}</td>
                <td><span class="badge">${escapeHtml(PLATFORM_CONFIG[entry.platform].shortLabel)}</span></td>
                <td>${entry.summary.completed}</td>
                <td>${entry.summary.shortDownloaded}</td>
                <td>${entry.summary.videoDownloaded}</td>
                <td>${entry.summary.failed}</td>
                <td>${entry.summary.skipped}</td>
                <td>${escapeHtml(entry.outputFolder || "-")}</td>
              </tr>
            `).join("") : `<tr class="empty-row"><td colspan="8">No completed downloads yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderSettingsPage() {
  const settingsPlatform = state.lastPlatform || "pinterest";
  return `
    <div class="settings-page">
      <section class="panel settings-page-panel">
        <div class="panel-head">
          <div><p class="section-step">Global Settings</p><h2>Shared defaults</h2></div>
        </div>
        <div class="settings-grid">
          <div class="settings-group">
            <h3>App behavior</h3>
            <div class="checkbox-grid">
              ${renderCheckbox("global", "rememberLastMenu", "Remember last selected menu", state.globalSettings.rememberLastMenu)}
              ${renderCheckbox("global", "openFolderAfterComplete", "Open folder after complete", state.globalSettings.openFolderAfterComplete)}
              ${renderCheckbox("global", "autoRetryFailed", "Auto retry failed downloads once", state.globalSettings.autoRetryFailed)}
            </div>
          </div>
          <div class="settings-group">
            <h3>Folder structure</h3>
            <div class="checkbox-grid">
              ${renderCheckbox("global", "subfolderByPlatform", "Create subfolder by platform", state.globalSettings.subfolderByPlatform)}
              ${renderCheckbox("global", "subfolderByDate", "Create subfolder by date", state.globalSettings.subfolderByDate)}
              ${renderCheckbox("global", "subfolderByCreator", "Create subfolder by creator / board", state.globalSettings.subfolderByCreator)}
              ${renderCheckbox("global", "subfolderByContentType", "Create subfolder by content type", state.globalSettings.subfolderByContentType)}
            </div>
          </div>
          <div class="settings-group">
            <h3>File naming</h3>
            <div class="checkbox-grid">
              ${renderCheckbox("global", "useTitle", "Use title in file name", state.globalSettings.useTitle)}
              ${renderCheckbox("global", "useCreator", "Use creator in file name", state.globalSettings.useCreator)}
              ${renderCheckbox("global", "addDate", "Add date to file name", state.globalSettings.addDate)}
            </div>
            <label class="field-label" for="settings-duplicate">Duplicate handling</label>
            <select id="settings-duplicate" class="select-input" data-setting-scope="global" data-setting="duplicatePolicy">
              <option value="rename" ${state.globalSettings.duplicatePolicy === "rename" ? "selected" : ""}>Rename automatically</option>
              <option value="skip" ${state.globalSettings.duplicatePolicy === "skip" ? "selected" : ""}>Skip duplicate</option>
              <option value="overwrite" ${state.globalSettings.duplicatePolicy === "overwrite" ? "selected" : ""}>Overwrite existing</option>
            </select>
            <label class="field-label" for="settings-concurrency">Max parallel downloads</label>
            <select id="settings-concurrency" class="select-input" data-setting-scope="global" data-setting="concurrency">
              ${[1, 2, 3, 4].map((value) => `<option value="${value}" ${Number(state.globalSettings.concurrency) === value ? "selected" : ""}>${value === 1 ? "Sequential" : `Parallel x${value}`}</option>`).join("")}
            </select>
          </div>
        </div>
      </section>

      <section class="panel settings-page-panel">
        <div class="panel-head">
          <div><p class="section-step">Platform Settings</p><h2>Default menu options</h2></div>
          <div class="inline-actions compact">
            ${platformKeys().map((platform) => `<button class="mini-pill ${settingsPlatform === platform ? "active" : ""}" data-action="switch-settings-tab" data-platform="${platform}" type="button">${escapeHtml(PLATFORM_CONFIG[platform].shortLabel)}</button>`).join("")}
          </div>
        </div>
        ${renderPlatformSpecificOptions(settingsPlatform, collectSettings(settingsPlatform))}
      </section>
    </div>
  `;
}

function getVisibleQueueItems(platform) {
  const platformState = state.platforms[platform];
  return platformState.queueItems.filter((item) => matchesPreviewFilter(item, platformState.previewFilter));
}

function matchesPreviewFilter(item, filter) {
  if (filter === "all") return true;
  if (filter === "failed") return item.status === "Failed";
  if (filter === "image") return item.contentType === "image";
  if (filter === "gallery") return item.contentType === "gallery";
  return item.contentType === filter;
}

function matchesDownloadFilter(item, filter) {
  if (filter === "all") return true;
  if (filter === "image") return item.contentType === "image" || item.contentType === "gallery";
  return item.contentType === filter;
}

function renderCheckbox(scope, setting, label, checked) {
  return `<label class="checkbox-row"><input data-setting-scope="${scope}" data-setting="${setting}" type="checkbox" ${checked ? "checked" : ""} /><span>${escapeHtml(label)}</span></label>`;
}

function showMessage(text, type = "info") {
  state.message = { text, type };
  renderMessage();
}

function clearMessage() {
  state.message = null;
  renderMessage();
}

function dedupeLines(text) {
  return [...new Set(String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
}

function createLocalId(seed) {
  return `local-${toBase64(seed).slice(0, 12)}-${Date.now()}`;
}

function toBase64(value) {
  try {
    return btoa(unescape(encodeURIComponent(value))).replace(/=/g, "");
  } catch {
    return `${Date.now()}`;
  }
}

function platformKeys() {
  return Object.keys(PLATFORM_CONFIG);
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatSpeed(bytesPerSecond) {
  return `${formatBytes(bytesPerSecond)}/s`;
}

function formatDateTime(isoString) {
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
}

function slugifyStatus(status = "") {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function capitalize(value = "") {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "";
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
