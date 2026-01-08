const AUTHOR_AVATARS = {
  "John Jeong": "/api/images/team/john.png",
  Harshika: "/api/images/team/harshika.jpeg",
  "Yujong Lee": "/api/images/team/yujong.png",
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const ArticlePreview = createClass({
  render: function () {
    const entry = this.props.entry;
    const title =
      entry.getIn(["data", "display_title"]) ||
      entry.getIn(["data", "meta_title"]) ||
      "Untitled";
    const author = entry.getIn(["data", "author"]);
    const created = entry.getIn(["data", "created"]);
    const avatarUrl = author ? AUTHOR_AVATARS[author] : null;

    return h(
      "div",
      { className: "blog-preview" },
      h(
        "header",
        { className: "blog-preview-header" },
        h("div", { className: "blog-preview-back" }, h("span", {}, "\u2190"), h("span", {}, "Back to Blog")),
        h("h1", { className: "blog-preview-title" }, title),
        author &&
        h(
          "div",
          { className: "blog-preview-author" },
          avatarUrl && h("img", { src: avatarUrl, alt: author, className: "blog-preview-author-avatar" }),
          h("span", { className: "blog-preview-author-name" }, author)
        ),
        created && h("time", { className: "blog-preview-date" }, formatDate(created))
      ),
      h("article", { className: "blog-preview-content" }, this.props.widgetFor("body"))
    );
  },
});

CMS.registerPreviewTemplate("articles", ArticlePreview);

const HandbookPreview = createClass({
  render: function () {
    const entry = this.props.entry;
    const title = entry.getIn(["data", "title"]) || "Untitled";
    const section = entry.getIn(["data", "section"]);
    const summary = entry.getIn(["data", "summary"]);

    return h(
      "div",
      { className: "blog-preview" },
      h(
        "header",
        { className: "blog-preview-header" },
        section && h("div", { className: "blog-preview-back" }, section),
        h("h1", { className: "blog-preview-title" }, title),
        summary && h("p", { style: { color: "#525252", fontSize: "18px", marginTop: "16px" } }, summary)
      ),
      h("article", { className: "blog-preview-content" }, this.props.widgetFor("body"))
    );
  },
});

CMS.registerPreviewTemplate("handbook", HandbookPreview);
