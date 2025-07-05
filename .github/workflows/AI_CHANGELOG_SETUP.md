# AI Changelog Generator Setup

This document explains how to set up and use the AI-powered changelog generator for hyprnote releases.

## Overview

The AI Changelog Generator automatically:
- Analyzes code changes since the last release
- Uses OpenRouter API with Claude Sonnet 4 for intelligent analysis
- Generates professional, technical changelog drafts
- **Two output modes**: Email delivery or file generation for testing

## Quick Start (Testing without Email Setup)

**Want to test immediately without configuring email?**

1. Go to **Actions** tab → **AI Changelog Generator** → **Run workflow**
2. Set **output_mode** to `file`
3. Set **test_mode** to `true`
4. Click **Run workflow**
5. After completion, check your repository root for the generated `CHANGELOG_YYYYMMDD_HHMMSS.md` file

This generates a changelog from your last 10 commits and commits it to the repository - no email setup required!

## Local Execution Alternative

**Prefer running locally for testing?** 

Check out the standalone script in `scripts/generate-changelog-local.js` - it runs the same AI analysis locally without GitHub Actions:

```bash
cd scripts
npm install
export GITHUB_TOKEN="your_token"
export OPENROUTER_API_KEY="your_key"
npm run changelog:test
```

See `scripts/README.md` for complete local setup instructions.

## Required Secrets

Add these secrets to your GitHub repository settings:

### 1. OPENROUTER_API_KEY
- **Status**: ✅ Already configured
- **Description**: API key for OpenRouter service
- **Usage**: Powers the AI changelog generation

### 2. EMAIL_USERNAME
- **Status**: ⚠️ Needs to be added
- **Description**: Gmail address for sending emails
- **Example**: `your-email@gmail.com`

### 3. EMAIL_PASSWORD
- **Status**: ⚠️ Needs to be added
- **Description**: Gmail App Password (not your regular password)
- **Setup Instructions**:
  1. Go to [Google Account Settings](https://myaccount.google.com/)
  2. Enable 2-Factor Authentication
  3. Go to App Passwords section
  4. Generate a new app password for "Mail"
  5. Use this 16-character password as the secret value

## Workflow Triggers

### Automatic Trigger
- **When**: Release is published
- **Action**: Analyzes commits since previous release
- **Email**: Sent to `plyght@peril.lol`

### Manual Trigger
- **When**: Manually run from Actions tab
- **Options**:
  - `output_mode`: Choose between `email` or `file` output
  - `email_recipients`: Custom email addresses (comma-separated)
  - `ai_model`: OpenRouter model to use (default: `anthropic/claude-sonnet-4`)
  - `test_mode`: Use last 10 commits instead of since last release

## Usage

### Testing with File Output (No Email Setup Required)
1. Go to Actions tab in GitHub
2. Select "AI Changelog Generator"
3. Click "Run workflow"
4. Set `output_mode` to `file`
5. Set `test_mode` to `true`
6. Optionally customize AI model
7. Click "Run workflow"
8. **Result**: Changelog file will be committed to the repository

### Testing with Email Output
1. Go to Actions tab in GitHub
2. Select "AI Changelog Generator"
3. Click "Run workflow"
4. Set `output_mode` to `email` (or leave default)
5. Set `test_mode` to `true`
6. Optionally customize email recipients and AI model
7. Click "Run workflow"
8. **Result**: Email sent to specified recipients

### Production Usage
- Workflow runs automatically when you publish a release
- Default mode is email delivery to `plyght@peril.lol`
- Check workflow artifacts for raw changelog and metadata

## AI Analysis Features

### Deep Code Analysis
- Examines actual code changes, not just commit messages
- Identifies breaking changes and API modifications
- Analyzes dependency updates and their implications
- Assesses security and performance impacts

### Professional Standards
- Zero tolerance for casual language or emojis
- Technical precision in descriptions
- Enterprise-grade formatting
- Categorized by change type (Breaking, Features, Improvements, etc.)

### Context Awareness
- Understands hyprnote's architecture (Tauri + React)
- Recognizes patterns in the codebase
- Maps changes to specific components/modules
- Identifies configuration and infrastructure changes

## Output Formats

### Email Format
The generated email includes:
- **Professional HTML formatting** with clean styling
- **Executive summary** of the release
- **Generated changelog** in markdown format
- **Metadata** including commit count, model used, generation time
- **Attachments** with raw changelog and detailed metadata
- **Workflow link** for debugging and review

### File Output Format
When using file mode, a timestamped changelog file is created:
- **Filename**: `CHANGELOG_YYYYMMDD_HHMMSS.md`
- **Header**: Generation metadata and workflow details
- **Content**: AI-generated professional changelog
- **Committed**: Automatically committed to the repository
- **Preview**: First 50 lines shown in workflow logs

## Troubleshooting

### Common Issues

1. **Email not sending**
   - Check `EMAIL_USERNAME` and `EMAIL_PASSWORD` secrets
   - Ensure Gmail App Password is correctly generated
   - Verify 2FA is enabled on Gmail account

2. **AI generation fails**
   - Check `OPENROUTER_API_KEY` secret
   - Verify OpenRouter account has sufficient credits
   - Check workflow logs for specific error messages

3. **No commits found**
   - Ensure there are commits since the last release
   - In test mode, ensure repository has commits
   - Check if release tags are properly created

4. **File mode not creating file**
   - Check workflow permissions (should have `contents: write`)
   - Verify the workflow completes successfully
   - Look for git configuration issues in logs

5. **Changelog file not visible**
   - File is committed to the current branch
   - Check repository root for `CHANGELOG_YYYYMMDD_HHMMSS.md`
   - Review git history for recent commits by GitHub Action

### Debug Steps
1. Check workflow run logs in Actions tab
2. Download artifacts for raw changelog and metadata
3. Review email delivery status in workflow logs
4. Verify all secrets are properly configured

## Customization

### Changing AI Model
Available models via OpenRouter:
- `anthropic/claude-sonnet-4` (default, best for code analysis)
- `anthropic/claude-opus-4` (most advanced)
- `openai/gpt-4.1` (alternative option)

### Modifying Email Recipients
- Default: `plyght@peril.lol`
- Manual runs: Use `email_recipients` input
- Multiple recipients: Comma-separated list

### Adjusting Analysis Depth
The workflow analyzes up to 20 commits in detail to balance thoroughness with performance. This can be adjusted in the workflow file if needed.

## Maintenance

### Regular Tasks
- Monitor OpenRouter API usage and costs
- Review generated changelogs for quality
- Update AI model selection as new models become available
- Adjust prompt engineering for better results

### Monitoring
- Workflow artifacts are retained for 30 days
- Email delivery confirmations in workflow logs
- AI generation costs tracked via OpenRouter dashboard

## Support

For issues or questions:
1. Check workflow run logs in GitHub Actions
2. Review this documentation
3. Test with manual workflow runs
4. Verify all secrets are properly configured