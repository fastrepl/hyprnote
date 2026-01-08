const createGitHubMediaLibrary = () => {
  let modal = null;
  let handleInsert = null;
  let allowMultiple = false;
  let selectedItems = new Set();
  let currentPath = "";
  let viewMode = "grid";
  let allItems = [];
  let uploadingFiles = [];
  let isUploading = false;
  let isEditorMode = false;

  const GITHUB_REPO = "fastrepl/hyprnote";
  const GITHUB_BRANCH = "main";
  const IMAGES_PATH = "apps/web/public/images";

  let cachedData = {};
  let cacheTimestamp = {};
  const CACHE_DURATION = 5 * 60 * 1000;

  async function fetchFolder(path = IMAGES_PATH) {
    const cacheKey = path;
    if (cachedData[cacheKey] && cacheTimestamp[cacheKey] && Date.now() - cacheTimestamp[cacheKey] < CACHE_DURATION) {
      return cachedData[cacheKey];
    }

    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    const data = await response.json();
    cachedData[cacheKey] = data;
    cacheTimestamp[cacheKey] = Date.now();
    return data;
  }

  async function uploadViaAPI(file, folder) {
    const base64Content = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.readAsDataURL(file);
    });

    const response = await fetch("/api/media-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        content: base64Content,
        folder: folder || IMAGES_PATH,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || `Upload failed: ${response.status}`);
    }

    delete cachedData[folder || IMAGES_PATH];
    return result;
  }

  function isImageFile(filename) {
    const ext = filename.toLowerCase().split(".").pop();
    return ["jpg", "jpeg", "png", "gif", "svg", "webp", "avif"].includes(ext);
  }

  function getPublicPath(fullPath) {
    return fullPath.replace("apps/web/public", "");
  }

  function createModal() {
    const overlay = document.createElement("div");
    overlay.id = "gml-overlay";
    overlay.innerHTML = `
      <style>
        #gml-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gml-modal {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 960px;
          height: 80vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }

        /* Header */
        .gml-header {
          padding: 12px 16px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fafafa;
        }
        .gml-title {
          font-size: 15px;
          font-weight: 600;
          color: #333;
        }
        .gml-header-actions {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        .gml-icon-btn {
          background: none;
          border: 1px solid transparent;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          font-size: 16px;
          text-decoration: none;
        }
        .gml-icon-btn:hover {
          background: #e8e8e8;
        }
        .gml-icon-btn.active {
          background: #e0e0e0;
          border-color: #ccc;
        }
        .gml-view-toggle {
          display: flex;
          border: 1px solid #ddd;
          border-radius: 6px;
          overflow: hidden;
        }
        .gml-view-toggle .gml-icon-btn {
          border: none;
          border-radius: 0;
        }
        .gml-view-toggle .gml-icon-btn:first-child {
          border-right: 1px solid #ddd;
        }

        /* Search */
        .gml-search-bar {
          padding: 12px 16px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
        }
        .gml-search-icon {
          color: #999;
          font-size: 14px;
        }
        .gml-search-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 14px;
          background: transparent;
        }
        .gml-search-input::placeholder {
          color: #999;
        }

        /* Breadcrumb */
        .gml-breadcrumb {
          padding: 8px 16px;
          border-bottom: 1px solid #e0e0e0;
          font-size: 13px;
          color: #666;
          background: #fafafa;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .gml-breadcrumb-item {
          color: #0066cc;
          cursor: pointer;
          text-decoration: none;
        }
        .gml-breadcrumb-item:hover {
          text-decoration: underline;
        }
        .gml-breadcrumb-sep {
          color: #999;
        }
        .gml-breadcrumb-current {
          color: #333;
        }

        /* Content / Finder View */
        .gml-content {
          flex: 1;
          overflow-y: auto;
          background: white;
        }
        .gml-loading, .gml-empty, .gml-error {
          padding: 60px;
          text-align: center;
          color: #666;
        }
        .gml-error {
          color: #dc3545;
        }

        /* Grid View */
        .gml-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px;
          padding: 16px;
        }
        .gml-grid-item {
          border: 2px solid transparent;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.1s ease;
          background: #f8f8f8;
        }
        .gml-grid-item:hover {
          border-color: #0066cc;
        }
        .gml-grid-item.selected {
          border-color: #0066cc;
          background: #e8f0fe;
        }
        .gml-grid-thumb {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #f0f0f0;
        }
        .gml-grid-thumb img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .gml-grid-thumb.folder {
          font-size: 48px;
        }
        .gml-grid-name {
          padding: 8px;
          font-size: 11px;
          color: #333;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
        }

        /* List View */
        .gml-list {
          display: flex;
          flex-direction: column;
        }
        .gml-list-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
          transition: background 0.1s ease;
        }
        .gml-list-item:hover {
          background: #f5f5f5;
        }
        .gml-list-item.selected {
          background: #e8f0fe;
        }
        .gml-list-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
        }
        .gml-list-icon img {
          width: 32px;
          height: 32px;
          object-fit: cover;
          border-radius: 4px;
        }
        .gml-list-info {
          flex: 1;
          min-width: 0;
        }
        .gml-list-name {
          font-size: 14px;
          color: #333;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .gml-list-path {
          font-size: 12px;
          color: #999;
        }

        /* Toolbar */
        .gml-toolbar {
          padding: 12px 16px;
          border-top: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fafafa;
          min-height: 56px;
        }
        .gml-toolbar-left {
          font-size: 14px;
          color: #666;
        }
        .gml-toolbar-right {
          display: flex;
          gap: 8px;
        }
        .gml-btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          border: 1px solid #ddd;
          background: white;
        }
        .gml-btn:hover {
          background: #f0f0f0;
        }
        .gml-btn-primary {
          background: #0066cc;
          color: white;
          border-color: #0066cc;
        }
        .gml-btn-primary:hover {
          background: #0055aa;
        }
        .gml-btn-danger {
          color: #dc3545;
          border-color: #dc3545;
        }
        .gml-btn-danger:hover {
          background: #dc3545;
          color: white;
        }
        .gml-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Drop zone */
        .gml-content.dragover {
          background: #e8f4ff;
        }
        .gml-content.dragover::after {
          content: "Drop files here to upload";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 18px;
          color: #0066cc;
          pointer-events: none;
        }
      </style>

      <div class="gml-modal">
        <div class="gml-header">
          <span class="gml-title">Media Library</span>
          <div class="gml-header-actions">
            <div class="gml-view-toggle">
              <button class="gml-icon-btn gml-view-list" title="List view">☰</button>
              <button class="gml-icon-btn gml-view-grid active" title="Grid view">⊞</button>
            </div>
            <a href="/admin/media.html" target="_blank" class="gml-icon-btn" title="Open full screen">⛶</a>
            <button class="gml-icon-btn gml-close" title="Close">✕</button>
          </div>
        </div>

        <div class="gml-search-bar">
          <span class="gml-search-icon">🔍</span>
          <input type="text" class="gml-search-input" placeholder="Search files...">
        </div>

        <div class="gml-breadcrumb">
          <span class="gml-breadcrumb-item" data-path="">images</span>
        </div>

        <div class="gml-content">
          <div class="gml-loading">Loading...</div>
        </div>

        <div class="gml-toolbar">
          <div class="gml-toolbar-left"></div>
          <div class="gml-toolbar-right">
            <label class="gml-btn gml-btn-primary gml-upload-btn">
              Upload asset
              <input type="file" accept="image/*" multiple style="display:none;">
            </label>
          </div>
        </div>
      </div>
    `;

    return overlay;
  }

  function renderBreadcrumb() {
    const breadcrumb = modal.querySelector(".gml-breadcrumb");
    const parts = currentPath ? currentPath.split("/") : [];

    let html = `<span class="gml-breadcrumb-item" data-path="">images</span>`;
    let path = "";

    for (let i = 0; i < parts.length; i++) {
      path += (path ? "/" : "") + parts[i];
      html += `<span class="gml-breadcrumb-sep">/</span>`;
      if (i === parts.length - 1) {
        html += `<span class="gml-breadcrumb-current">${parts[i]}</span>`;
      } else {
        html += `<span class="gml-breadcrumb-item" data-path="${path}">${parts[i]}</span>`;
      }
    }

    breadcrumb.innerHTML = html;

    breadcrumb.querySelectorAll(".gml-breadcrumb-item").forEach((item) => {
      item.addEventListener("click", () => {
        currentPath = item.dataset.path;
        loadFolder();
      });
    });
  }

  function renderItems(items, searchQuery = "") {
    const content = modal.querySelector(".gml-content");

    let filtered = items;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = items.filter((item) => item.name.toLowerCase().includes(query));
    }

    const folders = filtered.filter((item) => item.type === "dir");
    const files = filtered.filter((item) => item.type === "file" && isImageFile(item.name));
    const sorted = [...folders, ...files];

    if (sorted.length === 0) {
      content.innerHTML = '<div class="gml-empty">No files found</div>';
      return;
    }

    if (viewMode === "grid") {
      content.innerHTML = `<div class="gml-grid">${sorted
        .map((item) => {
          const isFolder = item.type === "dir";
          const publicPath = isFolder ? "" : getPublicPath(item.path);
          const isSelected = selectedItems.has(publicPath);
          return `
            <div class="gml-grid-item ${isSelected ? "selected" : ""}" data-path="${item.path}" data-type="${item.type}" data-public="${publicPath}">
              <div class="gml-grid-thumb ${isFolder ? "folder" : ""}">
                ${isFolder ? "📁" : `<img src="${item.download_url}" loading="lazy">`}
              </div>
              <div class="gml-grid-name">${item.name}</div>
            </div>
          `;
        })
        .join("")}</div>`;
    } else {
      content.innerHTML = `<div class="gml-list">${sorted
        .map((item) => {
          const isFolder = item.type === "dir";
          const publicPath = isFolder ? "" : getPublicPath(item.path);
          const isSelected = selectedItems.has(publicPath);
          return `
            <div class="gml-list-item ${isSelected ? "selected" : ""}" data-path="${item.path}" data-type="${item.type}" data-public="${publicPath}">
              <div class="gml-list-icon">
                ${isFolder ? "📁" : `<img src="${item.download_url}" loading="lazy">`}
              </div>
              <div class="gml-list-info">
                <div class="gml-list-name">${item.name}</div>
                ${!isFolder ? `<div class="gml-list-path">${publicPath}</div>` : ""}
              </div>
            </div>
          `;
        })
        .join("")}</div>`;
    }

    content.querySelectorAll(".gml-grid-item, .gml-list-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        const type = item.dataset.type;
        const path = item.dataset.path;
        const publicPath = item.dataset.public;

        if (type === "dir") {
          currentPath = path.replace(IMAGES_PATH + "/", "").replace(IMAGES_PATH, "");
          loadFolder();
        } else {
          if (e.metaKey || e.ctrlKey || allowMultiple) {
            if (selectedItems.has(publicPath)) {
              selectedItems.delete(publicPath);
              item.classList.remove("selected");
            } else {
              selectedItems.add(publicPath);
              item.classList.add("selected");
            }
          } else {
            selectedItems.clear();
            content.querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));
            selectedItems.add(publicPath);
            item.classList.add("selected");
          }
          updateToolbar();
        }
      });

      item.addEventListener("dblclick", () => {
        const type = item.dataset.type;
        const publicPath = item.dataset.public;
        if (type === "file" && publicPath) {
          handleInsert({ path: publicPath, url: publicPath });
          hide();
        }
      });
    });
  }

  function updateToolbar() {
    const toolbarLeft = modal.querySelector(".gml-toolbar-left");
    const toolbarRight = modal.querySelector(".gml-toolbar-right");

    if (isUploading) {
      toolbarLeft.textContent = `${uploadingFiles.length} file${uploadingFiles.length > 1 ? "s" : ""}`;
      toolbarRight.innerHTML = `<button class="gml-btn" disabled>Uploading...</button>`;
    } else if (isEditorMode) {
      toolbarLeft.textContent = selectedItems.size > 0 ? `${selectedItems.size} selected` : "";
      toolbarRight.innerHTML = `
        <button class="gml-btn gml-cancel-btn">Cancel</button>
        <button class="gml-btn gml-btn-primary gml-insert-btn" ${selectedItems.size === 0 ? "disabled" : ""}>Insert</button>
      `;

      toolbarRight.querySelector(".gml-insert-btn").addEventListener("click", () => {
        if (selectedItems.size > 0) {
          const assets = Array.from(selectedItems).map((path) => ({ path, url: path }));
          handleInsert(assets.length === 1 ? assets[0] : assets);
          hide();
        }
      });

      toolbarRight.querySelector(".gml-cancel-btn").addEventListener("click", hide);
    } else if (selectedItems.size > 0) {
      toolbarLeft.textContent = `${selectedItems.size} selected`;
      toolbarRight.innerHTML = `
        <button class="gml-btn gml-cancel-select">Cancel</button>
      `;

      toolbarRight.querySelector(".gml-cancel-select").addEventListener("click", () => {
        selectedItems.clear();
        modal.querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));
        updateToolbar();
      });
    } else {
      toolbarLeft.textContent = "";
      toolbarRight.innerHTML = `
        <label class="gml-btn gml-btn-primary gml-upload-btn">
          Upload asset
          <input type="file" accept="image/*" multiple style="display:none;">
        </label>
      `;

      toolbarRight.querySelector('input[type="file"]').addEventListener("change", async (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
          await handleUpload(files);
        }
      });
    }
  }

  async function handleUpload(files) {
    isUploading = true;
    uploadingFiles = files;
    updateToolbar();

    const folder = currentPath ? `${IMAGES_PATH}/${currentPath}` : IMAGES_PATH;

    for (const file of files) {
      try {
        await uploadViaAPI(file, folder);
      } catch (error) {
        console.error("Upload failed:", error);
        alert(`Failed to upload ${file.name}: ${error.message}`);
      }
    }

    isUploading = false;
    uploadingFiles = [];
    await loadFolder();
    updateToolbar();
  }

  async function loadFolder() {
    const content = modal.querySelector(".gml-content");
    content.innerHTML = '<div class="gml-loading">Loading...</div>';

    renderBreadcrumb();

    try {
      const path = currentPath ? `${IMAGES_PATH}/${currentPath}` : IMAGES_PATH;
      allItems = await fetchFolder(path);
      renderItems(allItems);
      updateToolbar();
    } catch (error) {
      console.error("Failed to load folder:", error);
      content.innerHTML = `<div class="gml-error">Failed to load: ${error.message}</div>`;
    }
  }

  async function show(config = {}) {
    allowMultiple = config.allowMultiple || false;
    isEditorMode = !!handleInsert;
    selectedItems.clear();
    currentPath = "";
    viewMode = "grid";

    modal = createModal();
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector(".gml-close");
    const searchInput = modal.querySelector(".gml-search-input");
    const viewListBtn = modal.querySelector(".gml-view-list");
    const viewGridBtn = modal.querySelector(".gml-view-grid");
    const content = modal.querySelector(".gml-content");

    closeBtn.addEventListener("click", hide);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hide();
    });

    viewListBtn.addEventListener("click", () => {
      viewMode = "list";
      viewListBtn.classList.add("active");
      viewGridBtn.classList.remove("active");
      renderItems(allItems, searchInput.value);
    });

    viewGridBtn.addEventListener("click", () => {
      viewMode = "grid";
      viewGridBtn.classList.add("active");
      viewListBtn.classList.remove("active");
      renderItems(allItems, searchInput.value);
    });

    searchInput.addEventListener("input", () => {
      renderItems(allItems, searchInput.value);
    });

    content.addEventListener("dragover", (e) => {
      e.preventDefault();
      content.classList.add("dragover");
    });
    content.addEventListener("dragleave", () => {
      content.classList.remove("dragover");
    });
    content.addEventListener("drop", async (e) => {
      e.preventDefault();
      content.classList.remove("dragover");
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (files.length > 0) {
        await handleUpload(files);
      }
    });

    await loadFolder();
  }

  function hide() {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
      modal = null;
    }
    selectedItems.clear();
  }

  return {
    name: "github-images",
    init: ({ handleInsert: insertFn }) => {
      handleInsert = insertFn;
      return {
        show,
        hide,
        enableStandalone: () => true,
      };
    },
  };
};

window.GitHubMediaLibrary = createGitHubMediaLibrary();
