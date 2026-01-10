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
