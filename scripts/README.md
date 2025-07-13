# Local AI Changelog Generator

This directory contains a standalone script to run the AI changelog generator locally, without needing GitHub Actions.

## Quick Start

1. **Install dependencies**:
   ```bash
   cd scripts
   npm install
   ```

2. **Set environment variables**:
   ```bash
   export GITHUB_TOKEN="your_github_token"
   export OPENROUTER_API_KEY="your_openrouter_key"
   ```

3. **Run the generator**:
   ```bash
   # Test with last 10 commits
   npm run changelog:test
   
   # Or run directly
   node generate-changelog-local.js --test-mode
   ```

## Environment Variables

### Required
- `GITHUB_TOKEN` - GitHub Personal Access Token with repo access
- `OPENROUTER_API_KEY` - OpenRouter API key (same as GitHub Actions)

### Optional
- `GITHUB_REPOSITORY` - Repository name (e.g., "user/repo") - auto-detected if running in git repo

## Usage Options

```bash
# Basic usage (analyzes commits since last release)
node generate-changelog-local.js

# Test mode (last 10 commits only)
node generate-changelog-local.js --test-mode

# Use different AI model
node generate-changelog-local.js --model anthropic/claude-opus-4

# Analyze more commits in detail
node generate-changelog-local.js --commits 50

# Show help
node generate-changelog-local.js --help
```

## NPM Scripts

```bash
npm run changelog       # Generate changelog from releases
npm run changelog:test  # Generate from last 10 commits
npm run help           # Show help information
```

## Output Files

The script generates three files:

1. **`changelog-YYYY-MM-DD-local.md`** - Full changelog with metadata header
2. **`changelog.md`** - Raw AI-generated changelog (same as GitHub Actions)
3. **`changelog-metadata.json`** - Generation metadata and commit details

## Authentication Setup

### GitHub Token
1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Generate a new token with `repo` scope
3. Export as environment variable: `export GITHUB_TOKEN="ghp_your_token"`

### OpenRouter API Key
1. You already have this configured in GitHub Secrets
2. Get your key from [OpenRouter](https://openrouter.ai)
3. Export as environment variable: `export OPENROUTER_API_KEY="sk-or-your_key"`

## Advantages of Local Execution

- **Faster iteration** - No need to trigger GitHub Actions
- **More control** - Customize parameters easily
- **Debugging** - Better error messages and logging
- **Testing** - Safe to experiment without commits
- **Offline development** - Work with local commits

## Example Session

```bash
$ cd scripts
$ npm install
$ export GITHUB_TOKEN="ghp_your_token"
$ export OPENROUTER_API_KEY="sk-or-your_key"
$ npm run changelog:test

🚀 Starting local changelog generation...
📂 Repository: user/hyprnote
🧠 Model: anthropic/claude-sonnet-4
📊 Commits to analyze in detail: 20

📁 Auto-detected repository: user/hyprnote
🧪 TEST MODE: Getting last 10 commits
✅ Found 10 commits to analyze
📥 Fetching detailed commit information...
   Fetching commit 10/10: a1b2c3d4
✅ Commit details fetched
🤖 Generating changelog with AI...
📋 Using model: anthropic/claude-sonnet-4

🎉 Changelog generated successfully!

📄 Files created:
   changelog-2025-01-15-local.md - Full changelog with metadata
   changelog.md - Raw AI-generated changelog
   changelog-metadata.json - Generation metadata

📖 Preview:
============================================================
# Release Changelog

## Breaking Changes
- Modified authentication flow in user management system
...
============================================================
```

## Troubleshooting

### Common Issues

1. **"Missing required packages"**
   ```bash
   cd scripts
   npm install
   ```

2. **"Missing required environment variables"**
   ```bash
   export GITHUB_TOKEN="your_token"
   export OPENROUTER_API_KEY="your_key"
   ```

3. **"Could not auto-detect repository"**
   ```bash
   export GITHUB_REPOSITORY="username/repo-name"
   ```

4. **API rate limits**
   - Use `--commits 10` to analyze fewer commits
   - Check your GitHub token has proper permissions

5. **OpenRouter API errors**
   - Verify your API key is correct
   - Check your OpenRouter account has sufficient credits

### Debug Mode

Add debugging by modifying the script or using Node.js debugging:

```bash
DEBUG=* node generate-changelog-local.js --test-mode
```

## Comparison with GitHub Actions

| Feature | Local Script | GitHub Actions |
|---------|--------------|----------------|
| Setup time | ~2 minutes | ~10 minutes |
| Iteration speed | Instant | 2-3 minutes per run |
| Email delivery | No | Yes |
| File output | Yes | Yes |
| Debugging | Excellent | Limited |
| Cost | Free (your machine) | Free (GitHub minutes) |
| Integration | Manual | Automatic on release |

## Next Steps

Once you're happy with the local results, the GitHub Actions workflow will work the same way but with email delivery and automatic triggering on releases.