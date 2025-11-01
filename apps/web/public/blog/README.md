# Blog Assets Directory

This directory contains all images and assets for blog articles.

## Directory Structure

```
/public/blog/
  /{article-slug}/
    cover.webp          ← Recommended: best compression
    cover.png           ← Alternative: lossless quality  
    cover.jpg           ← Alternative: good for photos
    image1.png
    image2.jpg
    diagram.svg
```

## Cover Images

### Automatic Detection & Generation

Cover images work in two modes:

#### 1. Static Images (Priority 1)
Place a file named `cover.{ext}` in `/public/blog/{article-slug}/`:

**Format Priority** (checked in order):
1. `cover.webp` - Modern format, best compression
2. `cover.png` - Lossless, good for graphics
3. `cover.jpg` - Good for photos
4. `cover.jpeg` - Alternative JPG extension

The first format found will be used.

#### 2. Auto-Generated Images (Priority 2)
If no static cover image exists, Hyprnote automatically generates a beautiful Open Graph image using:
- Article title
- Summary text
- Hyprnote branding
- Consistent design system colors

**No action required!** Every article gets a professional cover image automatically.

### When to Use Each Approach

**Use Static Images When:**
- You want custom graphics or illustrations
- Article has specific visual content
- You need precise brand/design control

**Use Auto-Generated When:**
- Writing quickly without design resources
- Text-heavy articles without specific imagery
- Wanting consistent branded look
- Prototyping or drafting content

### Cover Image Specifications

- **Dimensions**: 1200x630px (optimal for all platforms)
- **Aspect Ratio**: 1.91:1
- **File Size**: Keep under 1MB for fast loading
- **Format**: WebP recommended for best quality/size ratio

### Social Media Display

Cover images appear on:
- **Blog Collection Page**: Card preview with hover effect
- **Article Page**: Hero image at top
- **Twitter/X**: Twitter Card (summary_large_image)
- **Facebook/LinkedIn**: Open Graph image
- **Slack/Discord**: Link previews

### Manual Override

You can manually specify any image path in frontmatter:

```yaml
---
title: "My Article"
summary: "Article summary"
author: "Your Name"
created: "2025-10-30"
coverImage: "/blog/custom-image.png"  # Override auto-detection
---
```

## Adding Other Images

Store all article assets in the article's directory:

```
/public/blog/my-article/
  cover.webp           ← Cover image
  screenshot1.png      ← Additional images
  screenshot2.png
  diagram.svg
  chart.png
```

Reference in MDX:

```markdown
![Screenshot](/blog/my-article/screenshot1.png)
![Diagram](/blog/my-article/diagram.svg)
```

## Best Practices

1. **WebP First**: Use WebP format for best compression
2. **Descriptive Names**: Use clear file names (not DSC_1234.jpg)
3. **Optimize**: Compress images before uploading
4. **Alt Text**: Always include descriptive alt text in markdown
5. **Organize**: Keep each article's assets in its own directory
6. **Test**: Preview on multiple platforms (Twitter, LinkedIn, etc.)

## Supported Formats

- **WebP** (.webp) - Recommended
- **PNG** (.png) - Lossless
- **JPEG** (.jpg, .jpeg) - Lossy compression
- **SVG** (.svg) - Vector graphics
- **GIF** (.gif) - Animated images

## Examples

### Minimal Setup (Auto-Generated)
```
/content/articles/
  my-article.mdx

# No cover image needed! Auto-generates from title/summary
```

### With Custom Cover
```
/content/articles/
  my-article.mdx

/public/blog/my-article/
  cover.webp          ← Custom cover image
```

### Full Asset Suite
```
/content/articles/
  my-article.mdx

/public/blog/my-article/
  cover.webp
  hero-image.png
  screenshot-1.png
  screenshot-2.png
  diagram.svg
  chart.png
```

## Troubleshooting

**Cover image not showing?**
- Check filename is exactly `cover.{ext}`
- Verify directory name matches article slug
- Check file format is supported
- Fallback to auto-generated will work anyway

**Generated image looks wrong?**
- Title/summary shows correct content automatically
- Create a static image for full control
- Contact team if you need template customization
