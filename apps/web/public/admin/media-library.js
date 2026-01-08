const createGitHubMediaLibrary = () => {
  let modal = null;
  let handleInsert = null;
  let allowMultiple = false;
  let selectedImages = new Set();

  const GITHUB_REPO = "fastrepl/hyprnote";
  const GITHUB_BRANCH = "main";
  const IMAGES_PATH = "apps/web/public/images";

  async function fetchImagesFromGitHub(path = IMAGES_PATH) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    return response.json();
  }

  async function fetchAllImages(path = IMAGES_PATH) {
    const contents = await fetchImagesFromGitHub(path);
    const images = [];

    for (const item of contents) {
      if (item.type === "dir") {
        const subImages = await fetchAllImages(item.path);
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

    return images;
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
          max-height: 80vh;
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
        .gml-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          line-height: 1;
        }
        .gml-close:hover {
          color: #333;
        }
        .gml-toolbar {
          padding: 12px 20px;
          border-bottom: 1px solid #e5e5e5;
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .gml-folder-filter {
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
      </style>
      <div class="gml-modal">
        <div class="gml-header">
          <h2>Select Image</h2>
          <button class="gml-close" aria-label="Close">&times;</button>
        </div>
        <div class="gml-toolbar">
          <select class="gml-folder-filter">
            <option value="">All folders</option>
          </select>
          <input type="text" class="gml-search" placeholder="Search images...">
        </div>
        <div class="gml-content">
          <div class="gml-loading">Loading images...</div>
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

  async function show(config = {}) {
    allowMultiple = config.allowMultiple || false;
    selectedImages.clear();

    modal = createModal();
    document.body.appendChild(modal);

    const content = modal.querySelector(".gml-content");
    const folderFilter = modal.querySelector(".gml-folder-filter");
    const searchInput = modal.querySelector(".gml-search");
    const closeBtn = modal.querySelector(".gml-close");
    const cancelBtn = modal.querySelector(".gml-cancel");
    const insertBtn = modal.querySelector(".gml-insert");

    closeBtn.addEventListener("click", hide);
    cancelBtn.addEventListener("click", hide);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hide();
    });

    try {
      const images = await fetchAllImages();

      const folders = [...new Set(images.map((img) => img.folder))].sort();
      folders.forEach((folder) => {
        const option = document.createElement("option");
        option.value = folder;
        option.textContent = folder || "/";
        folderFilter.appendChild(option);
      });

      renderImages(images, content);

      folderFilter.addEventListener("change", () => {
        renderImages(images, content, folderFilter.value, searchInput.value);
      });

      searchInput.addEventListener("input", () => {
        renderImages(images, content, folderFilter.value, searchInput.value);
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
      content.innerHTML = `<div class="gml-error">Failed to load images: ${error.message}</div>`;
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
