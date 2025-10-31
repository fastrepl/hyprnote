# Documentation Guide

This directory contains all documentation for Hyprnote.

## Creating Documentation

1. Create a new MDX file: `my-doc.mdx`

2. Add frontmatter:

```yaml
---
title: "Getting Started"
summary: "Quick start guide"  # Optional
author: "Your Name"
created: "2025-10-30"
updated: "2025-11-01"  # Optional: only if different from created
category: "Basics"  # Optional: for grouping
---
```

**Note**: The slug is automatically derived from the filename. For example, `getting-started.mdx` becomes slug `getting-started`.

3. Write your documentation using Markdown/MDX

## Documentation Structure

Organize docs by purpose:
- **Getting Started** - Setup and installation
- **Guides** - How-to guides and tutorials
- **Reference** - API and configuration reference
- **Troubleshooting** - Common issues and solutions

## Adding Images

Store documentation assets in `/public/docs/`:

```
/public/docs/
  architecture.png
  setup-screenshot.png
  feature-diagram.svg
```

Reference in MDX:

```markdown
![Architecture Diagram](/docs/architecture.png)
```

## Frontmatter Fields

### Required
- `title` - Page title
- `author` - Author name
- `created` - Creation date (ISO format: YYYY-MM-DD)

### Optional
- `summary` - Brief description for previews
- `updated` - Last update date (ISO format: YYYY-MM-DD)
- `category` - Grouping category for sidebar organization

### Auto-Generated
- `slug` - Automatically derived from filename (e.g., `getting-started.mdx` → `getting-started`)

## Features

### Sidebar Navigation
- Automatically generated from all docs
- Shows active document
- Mobile-friendly with collapsible menu

### Heading Anchors
All headings automatically get:
- Unique IDs for linking
- Clickable anchor links

Link to a specific section:
```markdown
[See Installation](#installation)
```

## Markdown Features

All GitHub Flavored Markdown (GFM) is supported:

### Tables
```markdown
| Command | Description |
|---------|-------------|
| `npm start` | Start the app |
```

### Code Blocks
````markdown
```bash
npm install hyprnote
```
````

### Callouts (using blockquotes)
```markdown
> **Note:** This is important information.
```

## Best Practices

1. **Structure**: Use clear hierarchy with H2 and H3 headings
2. **Code Examples**: Always include working examples
3. **Screenshots**: Use screenshots for UI-heavy features
4. **Links**: Link to related documentation
5. **Versioning**: Update version number for major changes
6. **Categories**: Group related docs together

## Viewing Your Docs

- Collection page: `http://localhost:3000/docs`
- Document page: `http://localhost:3000/docs/{slug}`

The sidebar automatically updates when you add new docs.
