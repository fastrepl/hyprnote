import { ARTICLE_FIELD_ORDER, createMdxFormatter } from "./mdx-format-core.js";

const { parse, stringify } = createMdxFormatter(window.jsyaml);

CMS.registerCustomFormat("mdx-custom", "mdx", {
  fromFile: (content) => {
    const { frontmatter, body } = parse(content);
    return { ...frontmatter, body };
  },
  toFile: (data) => {
    const { body, ...frontmatter } = data;
    return stringify(frontmatter, body || "", ARTICLE_FIELD_ORDER);
  },
});

CMS.registerEditorComponent({
  id: "mdx-image",
  label: "Image",
  fields: [
    { name: "src", label: "Source", widget: "string" },
    { name: "alt", label: "Alt Text", widget: "string" },
  ],
  pattern: /^<Image\s+src="([^"]+)"\s+alt="([^"]+)"\s*\/>$/,
  fromBlock: function (match) {
    return { src: match[1], alt: match[2] };
  },
  toBlock: function (data) {
    return `<Image src="${data.src}" alt="${data.alt}"/>`;
  },
  toPreview: function (data) {
    return `<img src="${data.src}" alt="${data.alt}" style="max-width:100%;" />`;
  },
});

CMS.registerEditorComponent({
  id: "cta-card",
  label: "CTA Card",
  fields: [],
  pattern: /^<CtaCard\s*\/>$/,
  fromBlock: function () {
    return {};
  },
  toBlock: function () {
    return `<CtaCard/>`;
  },
  toPreview: function () {
    return `<div style="padding:20px;border:2px dashed #666;text-align:center;border-radius:8px;background:#f5f5f5;">[CTA Card]</div>`;
  },
});

