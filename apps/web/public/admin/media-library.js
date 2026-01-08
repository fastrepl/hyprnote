const createGitHubMediaLibrary = () => {
  let modal = null;
  let handleInsert = null;
  let allowMultiple = false;
  let selectedImages = new Set();
  let cachedImages = null;
  let cacheTimestamp = null;
  const CACHE_DURATION = 5 * 60 * 1000;

  const GITHUB_REPO = "fastrepl/hyprnote";
  const GITHUB_BRANCH = "main";
  const IMAGES_PATH = "apps/web/public/images";
  const FOLDERS = [
    { value: "apps/web/public/images", label: "/images (root)" },
    { value: "apps/web/public/images/blog", label: "/images/blog" },
    { value: "apps/web/public/images/handbook", label: "/images/handbook" },
  ];

  function getGitHubToken() {
    return localStorage.getItem("github_media_token");
  }

  function setGitHubToken(token) {
    localStorage.setItem("github_media_token", token);
  }

  async function fetchImagesFromGitHub(path = IMAGES_PATH) {
    const token = getGitHubToken();
    const headers = token ? { Authorization: `token ${token}` } : {};
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    return response.json();
  }

  async function fetchAllImages(path = IMAGES_PATH, forceRefresh = false) {
    if (!forceRefresh && cachedImages && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return cachedImages;
    }

    const contents = await fetchImagesFromGitHub(path);
    const images = [];

    for (const item of contents) {
      if (item.type === "dir") {
        const subImages = await fetchAllImages(item.path, true);
        images.push(...subImages);
      } else if (item.type === "file" && isImageFile(item.name)) {
        const publicPath = item.path.replace("apps/web/public", "");
        images.push({
          name: item.name,
          path: publicPath,
          fullPath: item.path,
          folder: item.path.replace(`/${item.name}`, "").replace("apps/web/public/images", "") || "/",
          url: item.download_url,
        });
      }
    }

    if (path === IMAGES_PATH) {
      cachedImages = images;
      cacheTimestamp = Date.now();
    }

    return images;
  }

  async function uploadToGitHub(file, folder) {
    const token = getGitHubToken();
    if (!token) {
      throw new Error("GitHub token required for uploads. Click the gear icon to set it.");
    }

    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase();
    const path = `${folder}/${filename}`;

    const base64Content = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.readAsDataURL(file);
    });

    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Upload ${filename} via Decap CMS`,
        content: base64Content,
        branch: GITHUB_BRANCH,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Upload failed: ${response.status}`);
    }

    const result = await response.json();
    cachedImages = null;

    return {
      name: filename,
      path: path.replace("apps/web/public", ""),
      fullPath: path,
      folder: folder.replace("apps/web/public/images", "") || "/",
      url: result.content.download_url,
    };
  }

  function isImageFile(filename) {
    const ext = filename.toLowerCase().split(".").pop();
    return ["jpg", "jpeg", "png", "gif", "svg", "webp", "avif"].includes(ext);
  }

  function createModal() {
    const overlay = document.createElement("div");
    overlay.id = "github-media-library-overlay";
    overlay.innerHTML = `
      <style>
        #github-media-library-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gml-modal {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 900px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .gml-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e5e5e5;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .gml-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        .gml-header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .gml-close, .gml-settings {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
          padding: 4px;
          line-height: 1;
        }
        .gml-close:hover, .gml-settings:hover {
          color: #333;
        }
        .gml-tabs {
          display: flex;
          border-bottom: 1px solid #e5e5e5;
        }
        .gml-tab {
          padding: 12px 20px;
          border: none;
          background: none;
          font-size: 14px;
          cursor: pointer;
          color: #666;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
        }
        .gml-tab:hover {
          color: #333;
        }
        .gml-tab.active {
          color: #0066cc;
          border-bottom-color: #0066cc;
        }
        .gml-toolbar {
          padding: 12px 20px;
          border-bottom: 1px solid #e5e5e5;
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .gml-folder-filter, .gml-upload-folder {
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          min-width: 150px;
        }
        .gml-search {
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          flex: 1;
        }
        .gml-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        .gml-loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }
        .gml-error {
          text-align: center;
          padding: 40px;
          color: #dc3545;
        }
        .gml-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 16px;
        }
        .gml-image-item {
          border: 2px solid transparent;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.15s ease;
          background: #f5f5f5;
        }
        .gml-image-item:hover {
          border-color: #0066cc;
        }
        .gml-image-item.selected {
          border-color: #0066cc;
          box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.3);
        }
        .gml-image-wrapper {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #fafafa;
        }
        .gml-image-wrapper img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .gml-image-info {
          padding: 8px;
          font-size: 11px;
          color: #666;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          border-top: 1px solid #eee;
        }
        .gml-image-folder {
          font-size: 10px;
          color: #999;
          margin-top: 2px;
        }
        .gml-footer {
          padding: 16px 20px;
          border-top: 1px solid #e5e5e5;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .gml-selected-count {
          font-size: 14px;
          color: #666;
        }
        .gml-actions {
          display: flex;
          gap: 8px;
        }
        .gml-btn {
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          border: 1px solid #ddd;
          background: white;
        }
        .gml-btn:hover {
          background: #f5f5f5;
        }
        .gml-btn-primary {
          background: #0066cc;
          color: white;
          border-color: #0066cc;
        }
        .gml-btn-primary:hover {
          background: #0052a3;
        }
        .gml-btn-primary:disabled {
          background: #ccc;
          border-color: #ccc;
          cursor: not-allowed;
        }
        .gml-empty {
          text-align: center;
          padding: 40px;
          color: #666;
        }
        .gml-upload-zone {
          border: 2px dashed #ddd;
          border-radius: 8px;
          padding: 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .gml-upload-zone:hover, .gml-upload-zone.dragover {
          border-color: #0066cc;
          background: #f0f7ff;
        }
        .gml-upload-zone input {
          display: none;
        }
        .gml-upload-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .gml-upload-text {
          font-size: 16px;
          color: #333;
          margin-bottom: 8px;
        }
        .gml-upload-hint {
          font-size: 14px;
          color: #666;
        }
        .gml-upload-progress {
          margin-top: 20px;
          padding: 16px;
          background: #f5f5f5;
          border-radius: 8px;
        }
        .gml-upload-progress-text {
          font-size: 14px;
          color: #333;
          margin-bottom: 8px;
        }
        .gml-upload-progress-bar {
          height: 4px;
          background: #ddd;
          border-radius: 2px;
          overflow: hidden;
        }
        .gml-upload-progress-fill {
          height: 100%;
          background: #0066cc;
          transition: width 0.3s ease;
        }
        .gml-panel {
          display: none;
        }
        .gml-panel.active {
          display: block;
        }
        .gml-settings-panel {
          padding: 20px;
        }
        .gml-settings-field {
          margin-bottom: 16px;
        }
        .gml-settings-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 6px;
        }
        .gml-settings-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .gml-settings-hint {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }
        .gml-token-status {
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .gml-token-status.set {
          background: #d4edda;
          color: #155724;
        }
        .gml-token-status.not-set {
          background: #fff3cd;
          color: #856404;
        }
        .gml-uploaded-preview {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #d4edda;
          border-radius: 8px;
          margin-top: 16px;
        }
        .gml-uploaded-preview img {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 4px;
        }
        .gml-uploaded-info {
          flex: 1;
        }
        .gml-uploaded-name {
          font-weight: 500;
          margin-bottom: 4px;
        }
        .gml-uploaded-path {
          font-size: 12px;
          color: #666;
        }
      </style>
      <div class="gml-modal">
        <div class="gml-header">
          <h2>Media Library</h2>
          <div class="gml-header-actions">
            <button class="gml-settings" aria-label="Settings" title="Settings">&#9881;</button>
            <button class="gml-close" aria-label="Close">&times;</button>
          </div>
        </div>
        <div class="gml-tabs">
          <button class="gml-tab active" data-tab="browse">Browse</button>
          <button class="gml-tab" data-tab="upload">Upload</button>
          <button class="gml-tab" data-tab="settings" style="display:none;">Settings</button>
        </div>
        <div class="gml-panel active" data-panel="browse">
          <div class="gml-toolbar">
            <select class="gml-folder-filter">
              <option value="">All folders</option>
            </select>
            <input type="text" class="gml-search" placeholder="Search images...">
          </div>
          <div class="gml-content">
            <div class="gml-loading">Loading images...</div>
          </div>
        </div>
        <div class="gml-panel" data-panel="upload">
          <div class="gml-toolbar">
            <label style="font-size:14px;color:#666;">Upload to:</label>
            <select class="gml-upload-folder">
              ${FOLDERS.map((f) => `<option value="${f.value}">${f.label}</option>`).join("")}
            </select>
          </div>
          <div class="gml-content">
            <div class="gml-upload-zone">
              <input type="file" accept="image/*" multiple>
              <div class="gml-upload-icon">📁</div>
              <div class="gml-upload-text">Drop images here or click to browse</div>
              <div class="gml-upload-hint">Supports JPG, PNG, GIF, SVG, WebP</div>
            </div>
            <div class="gml-upload-result"></div>
          </div>
        </div>
        <div class="gml-panel" data-panel="settings">
          <div class="gml-settings-panel">
            <div class="gml-token-status not-set">
              GitHub token not set. Uploads will not work.
            </div>
            <div class="gml-settings-field">
              <label class="gml-settings-label">GitHub Personal Access Token</label>
              <input type="password" class="gml-settings-input gml-token-input" placeholder="ghp_...">
              <div class="gml-settings-hint">
                Required for uploading images. Create a token with "repo" scope at
                <a href="https://github.com/settings/tokens" target="_blank">github.com/settings/tokens</a>
              </div>
            </div>
            <button class="gml-btn gml-btn-primary gml-save-token">Save Token</button>
          </div>
        </div>
        <div class="gml-footer">
          <span class="gml-selected-count">0 selected</span>
          <div class="gml-actions">
            <button class="gml-btn gml-cancel">Cancel</button>
            <button class="gml-btn gml-btn-primary gml-insert" disabled>Insert</button>
          </div>
        </div>
      </div>
    `;

    return overlay;
  }

  function renderImages(images, container, filterFolder = "", searchQuery = "") {
    let filtered = images;

    if (filterFolder) {
      filtered = filtered.filter((img) => img.folder === filterFolder);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((img) => img.name.toLowerCase().includes(query));
    }

    if (filtered.length === 0) {
      container.innerHTML = '<div class="gml-empty">No images found</div>';
      return;
    }

    container.innerHTML = `<div class="gml-grid">${filtered
      .map(
        (img) => `
        <div class="gml-image-item ${selectedImages.has(img.path) ? "selected" : ""}" data-path="${img.path}">
          <div class="gml-image-wrapper">
            <img src="${img.url}" alt="${img.name}" loading="lazy">
          </div>
          <div class="gml-image-info">
            ${img.name}
            <div class="gml-image-folder">${img.folder}</div>
          </div>
        </div>
      `,
      )
      .join("")}</div>`;

    container.querySelectorAll(".gml-image-item").forEach((item) => {
      item.addEventListener("click", () => {
        const path = item.dataset.path;

        if (!allowMultiple) {
          selectedImages.clear();
          container.querySelectorAll(".gml-image-item").forEach((el) => el.classList.remove("selected"));
        }

        if (selectedImages.has(path)) {
          selectedImages.delete(path);
          item.classList.remove("selected");
        } else {
          selectedImages.add(path);
          item.classList.add("selected");
        }

        updateSelectedCount();
      });
    });
  }

  function updateSelectedCount() {
    const countEl = modal.querySelector(".gml-selected-count");
    const insertBtn = modal.querySelector(".gml-insert");
    countEl.textContent = `${selectedImages.size} selected`;
    insertBtn.disabled = selectedImages.size === 0;
  }

  function switchTab(tabName) {
    modal.querySelectorAll(".gml-tab").forEach((t) => t.classList.remove("active"));
    modal.querySelectorAll(".gml-panel").forEach((p) => p.classList.remove("active"));
    modal.querySelector(`.gml-tab[data-tab="${tabName}"]`).classList.add("active");
    modal.querySelector(`.gml-panel[data-panel="${tabName}"]`).classList.add("active");
  }

  function updateTokenStatus() {
    const token = getGitHubToken();
    const status = modal.querySelector(".gml-token-status");
    if (token) {
      status.className = "gml-token-status set";
      status.textContent = "GitHub token is set. Uploads are enabled.";
    } else {
      status.className = "gml-token-status not-set";
      status.textContent = "GitHub token not set. Uploads will not work.";
    }
  }

  async function show(config = {}) {
    allowMultiple = config.allowMultiple || false;
    selectedImages.clear();

    modal = createModal();
    document.body.appendChild(modal);

    const browseContent = modal.querySelector('[data-panel="browse"] .gml-content');
    const folderFilter = modal.querySelector(".gml-folder-filter");
    const searchInput = modal.querySelector(".gml-search");
    const closeBtn = modal.querySelector(".gml-close");
    const cancelBtn = modal.querySelector(".gml-cancel");
    const insertBtn = modal.querySelector(".gml-insert");
    const settingsBtn = modal.querySelector(".gml-settings");
    const uploadZone = modal.querySelector(".gml-upload-zone");
    const uploadInput = modal.querySelector('.gml-upload-zone input[type="file"]');
    const uploadFolder = modal.querySelector(".gml-upload-folder");
    const uploadResult = modal.querySelector(".gml-upload-result");
    const tokenInput = modal.querySelector(".gml-token-input");
    const saveTokenBtn = modal.querySelector(".gml-save-token");

    modal.querySelectorAll(".gml-tab").forEach((tab) => {
      tab.addEventListener("click", () => switchTab(tab.dataset.tab));
    });

    settingsBtn.addEventListener("click", () => switchTab("settings"));

    closeBtn.addEventListener("click", hide);
    cancelBtn.addEventListener("click", hide);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hide();
    });

    updateTokenStatus();
    tokenInput.value = getGitHubToken() || "";

    saveTokenBtn.addEventListener("click", () => {
      setGitHubToken(tokenInput.value.trim());
      updateTokenStatus();
      switchTab("browse");
    });

    uploadZone.addEventListener("click", () => uploadInput.click());
    uploadZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadZone.classList.add("dragover");
    });
    uploadZone.addEventListener("dragleave", () => {
      uploadZone.classList.remove("dragover");
    });
    uploadZone.addEventListener("drop", async (e) => {
      e.preventDefault();
      uploadZone.classList.remove("dragover");
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (files.length > 0) {
        await handleUpload(files, uploadFolder.value, uploadResult);
      }
    });
    uploadInput.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        await handleUpload(files, uploadFolder.value, uploadResult);
      }
    });

    async function handleUpload(files, folder, resultContainer) {
      resultContainer.innerHTML = `
        <div class="gml-upload-progress">
          <div class="gml-upload-progress-text">Uploading ${files.length} file(s)...</div>
          <div class="gml-upload-progress-bar">
            <div class="gml-upload-progress-fill" style="width: 0%"></div>
          </div>
        </div>
      `;

      const progressFill = resultContainer.querySelector(".gml-upload-progress-fill");
      const progressText = resultContainer.querySelector(".gml-upload-progress-text");
      const uploaded = [];

      for (let i = 0; i < files.length; i++) {
        try {
          progressText.textContent = `Uploading ${files[i].name}... (${i + 1}/${files.length})`;
          const result = await uploadToGitHub(files[i], folder);
          uploaded.push(result);
          progressFill.style.width = `${((i + 1) / files.length) * 100}%`;
        } catch (error) {
          resultContainer.innerHTML = `<div class="gml-error">${error.message}</div>`;
          return;
        }
      }

      resultContainer.innerHTML = uploaded
        .map(
          (img) => `
        <div class="gml-uploaded-preview">
          <img src="${img.url}" alt="${img.name}">
          <div class="gml-uploaded-info">
            <div class="gml-uploaded-name">${img.name}</div>
            <div class="gml-uploaded-path">${img.path}</div>
          </div>
          <button class="gml-btn gml-btn-primary gml-insert-uploaded" data-path="${img.path}">Insert</button>
        </div>
      `,
        )
        .join("");

      resultContainer.querySelectorAll(".gml-insert-uploaded").forEach((btn) => {
        btn.addEventListener("click", () => {
          handleInsert({ path: btn.dataset.path, url: btn.dataset.path });
          hide();
        });
      });

      cachedImages = null;
    }

    try {
      const images = await fetchAllImages();

      const folders = [...new Set(images.map((img) => img.folder))].sort();
      folders.forEach((folder) => {
        const option = document.createElement("option");
        option.value = folder;
        option.textContent = folder || "/";
        folderFilter.appendChild(option);
      });

      renderImages(images, browseContent);

      folderFilter.addEventListener("change", () => {
        renderImages(images, browseContent, folderFilter.value, searchInput.value);
      });

      searchInput.addEventListener("input", () => {
        renderImages(images, browseContent, folderFilter.value, searchInput.value);
      });

      insertBtn.addEventListener("click", () => {
        if (selectedImages.size > 0) {
          const assets = Array.from(selectedImages).map((path) => ({
            path,
            url: path,
          }));
          handleInsert(assets.length === 1 ? assets[0] : assets);
          hide();
        }
      });
    } catch (error) {
      console.error("Failed to fetch images:", error);
      browseContent.innerHTML = `<div class="gml-error">Failed to load images: ${error.message}</div>`;
    }
  }

  function hide() {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
      modal = null;
    }
    selectedImages.clear();
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
