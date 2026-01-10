# Admin Interface

The admin interface at `/admin` provides content management capabilities for the Hyprnote website.

## Authentication

Access is restricted to whitelisted email addresses. The whitelist is defined in `src/functions/admin.ts`:

- yujonglee@hyprnote.com
- john@hyprnote.com
- harshika@hyprnote.com

Users must be authenticated via Supabase to access admin routes.

## Features

### Media Library (`/admin/media`)

Upload, organize, and manage media assets stored in `apps/web/public/images/`.

- Drag-and-drop file upload
- Folder navigation with breadcrumbs
- Multi-select with batch delete, download, and move
- Context menu for individual file actions (rename, copy as PNG, download, delete)
- Sidebar with search, file type filters, and folder tree navigation

### Google Docs Import (`/admin/import`)

Import blog posts from published Google Docs with automatic HTML-to-Markdown conversion.

1. Publish a Google Doc (File > Share > Publish to web)
2. Paste the published URL
3. Review and edit the generated MDX
4. Fill in metadata (title, author, description, cover image)
5. Select destination folder and save

### Content Management (`/admin/content`)

Browse and view MDX content files across all content folders:

- Articles
- Changelog
- Documentation
- Handbook
- Legal
- Templates

## API Endpoints

All API endpoints require admin authentication.

### Media APIs

- `GET /api/admin/media/list` - List files in a directory
- `POST /api/admin/media/upload` - Upload files
- `POST /api/admin/media/delete` - Delete files
- `POST /api/admin/media/move` - Move/rename files
- `POST /api/admin/media/create-folder` - Create folders

### Import APIs

- `POST /api/admin/import/google-docs` - Parse published Google Doc
- `POST /api/admin/import/save` - Save MDX file to repository

### Content APIs

- `GET /api/admin/content/list` - List content files in a folder

## Environment Variables

The following environment variables are required:

- `GITHUB_TOKEN` - GitHub personal access token with repo write access
- Supabase environment variables for authentication

## Development

The admin interface uses TanStack Router with file-based routing. Routes are defined in:

- `src/routes/admin/` - Page components
- `src/routes/api/admin/` - API endpoints

Admin authentication is handled by the `fetchAdminUser()` function which checks if the current user's email is in the whitelist.
