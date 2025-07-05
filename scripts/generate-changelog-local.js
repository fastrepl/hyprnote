#!/usr/bin/env node

/**
 * Local AI Changelog Generator for hyprnote
 *
 * This script generates changelogs locally using the same AI analysis
 * as the GitHub Actions workflow.
 *
 * Prerequisites:
 * - Node.js 18+
 * - npm packages: axios, @octokit/rest
 * - Environment variables: GITHUB_TOKEN, OPENROUTER_API_KEY
 * - Git repository with commits
 *
 * Usage:
 *   node scripts/generate-changelog-local.js [options]
 *
 * Options:
 *   --test-mode     Use last 10 commits instead of since last release
 *   --model MODEL   OpenRouter model to use (default: anthropic/claude-sonnet-4)
 *   --commits N     Number of commits to analyze in detail (default: 20)
 *   --help          Show this help
 *
 * Environment Variables:
 *   GITHUB_TOKEN         GitHub personal access token
 *   OPENROUTER_API_KEY   OpenRouter API key
 *   GITHUB_REPOSITORY    Repository name (e.g., user/repo) - optional if running in git repo
 */

const { Octokit } = require("@octokit/rest");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  testMode: args.includes("--test-mode"),
  model: args.includes("--model") ? args[args.indexOf("--model") + 1] : "anthropic/claude-sonnet-4",
  commits: args.includes("--commits") ? parseInt(args[args.indexOf("--commits") + 1]) : 20,
  help: args.includes("--help") || args.includes("-h"),
};

if (options.help) {
  console.log(`
Local AI Changelog Generator for hyprnote

Usage: node scripts/generate-changelog-local.js [options]

Options:
  --test-mode     Use last 10 commits instead of since last release
  --model MODEL   OpenRouter model to use (default: anthropic/claude-sonnet-4)
  --commits N     Number of commits to analyze in detail (default: 20)
  --help, -h      Show this help

Environment Variables:
  GITHUB_TOKEN         GitHub personal access token (required)
  OPENROUTER_API_KEY   OpenRouter API key (required)
  GITHUB_REPOSITORY    Repository name (e.g., user/repo) - auto-detected if in git repo

Examples:
  # Generate changelog from last 10 commits
  node scripts/generate-changelog-local.js --test-mode

  # Use specific model
  node scripts/generate-changelog-local.js --model anthropic/claude-opus-4

  # Analyze more commits in detail
  node scripts/generate-changelog-local.js --commits 50
`);
  process.exit(0);
}

// Validate environment
const requiredEnvVars = ["GITHUB_TOKEN", "OPENROUTER_API_KEY"];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:", missingVars.join(", "));
  console.error("\nPlease set:");
  missingVars.forEach(v => {
    console.error(`  export ${v}="your_${v.toLowerCase()}"`);
  });
  process.exit(1);
}

// Initialize clients
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Auto-detect repository if not provided
let owner, repo;
if (process.env.GITHUB_REPOSITORY) {
  [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
} else {
  try {
    const gitRemote = execSync("git remote get-url origin", { encoding: "utf8" }).trim();
    const match = gitRemote.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/);
    if (match) {
      owner = match[1];
      repo = match[2];
      console.log(`📁 Auto-detected repository: ${owner}/${repo}`);
    } else {
      throw new Error("Could not parse GitHub repository from git remote");
    }
  } catch (error) {
    console.error("❌ Could not auto-detect repository. Please set GITHUB_REPOSITORY environment variable.");
    console.error("   Example: export GITHUB_REPOSITORY=\"username/repo-name\"");
    process.exit(1);
  }
}

async function getCommitsSinceLastRelease() {
  try {
    if (options.testMode) {
      console.log("🧪 TEST MODE: Getting last 10 commits");
      const { data: commits } = await octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 10,
      });
      return commits;
    }

    // Get the current release
    const { data: releases } = await octokit.rest.repos.listReleases({
      owner,
      repo,
      per_page: 2,
    });

    if (releases.length < 2) {
      console.log("⚠️  Not enough releases found, getting last 50 commits");
      const { data: commits } = await octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 50,
      });
      return commits;
    }

    const currentRelease = releases[0];
    const previousRelease = releases[1];

    console.log(`📊 Getting commits between ${previousRelease.tag_name} and ${currentRelease.tag_name}`);

    // Get commits between releases
    const { data: comparison } = await octokit.rest.repos.compareCommits({
      owner,
      repo,
      base: previousRelease.tag_name,
      head: currentRelease.tag_name,
    });

    return comparison.commits;
  } catch (error) {
    console.error("❌ Error getting commits:", error.message);
    // Fallback to last 50 commits
    console.log("🔄 Falling back to last 50 commits");
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 50,
    });
    return commits;
  }
}

async function getCommitDetails(sha) {
  try {
    const { data: commit } = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: sha,
      headers: {
        "Accept": "application/vnd.github.v3.diff",
      },
    });
    return commit;
  } catch (error) {
    console.error(`❌ Error getting commit details for ${sha}:`, error.message);
    return null;
  }
}

async function generateChangelog(commits, commitDetails) {
  const prompt =
    `You are a senior technical writer for enterprise software documentation. Your task is to analyze code changes and create a professional changelog draft.

REQUIREMENTS:
- Absolutely no emojis, casual language, or marketing speak
- Use precise technical language
- Focus on functional impact and implementation details
- Categorize changes by type: Breaking Changes, Features, Improvements, Bug Fixes, Internal, Dependencies
- Include code context analysis, not just commit messages
- Identify security implications and performance impacts
- Be concise but comprehensive
- Use proper markdown formatting
- Include relevant technical details
- Reference specific components/modules when applicable

ANALYSIS DEPTH:
- Examine actual code changes, not just commit messages
- Identify patterns and architectural changes
- Note dependency updates and their implications
- Assess backward compatibility
- Highlight configuration changes
- Note testing and infrastructure changes

REPOSITORY CONTEXT:
This is hyprnote - a desktop application for note-taking with AI capabilities, built with Tauri (Rust backend) and React frontend.

COMMIT DATA:
${
      JSON.stringify(
        commits.map(c => ({
          sha: c.sha.substring(0, 8),
          message: c.commit.message,
          author: c.commit.author.name,
          date: c.commit.author.date,
          url: c.html_url,
        })),
        null,
        2,
      )
    }

DETAILED CHANGES:
${
      commitDetails.map(detail => {
        if (!detail) {
          return "Commit details unavailable";
        }
        return `
Commit: ${detail.sha.substring(0, 8)}
Message: ${detail.commit.message}
Files changed: ${detail.files ? detail.files.length : 0}
${
          detail.files
            ? detail.files.map(f => `
- ${f.filename} (+${f.additions} -${f.deletions})
- Status: ${f.status}
- Changes: ${f.changes} lines
`).join("")
            : ""
        }
`;
      }).join("\n---\n")
    }

OUTPUT FORMAT:
Generate a professional changelog draft in markdown format suitable for enterprise release notes. Focus on technical accuracy and operational impact.`;

  try {
    console.log("🤖 Generating changelog with AI...");
    console.log(`📋 Using model: ${options.model}`);

    const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
      model: options.model,
      messages: [
        {
          role: "system",
          content:
            "You are a senior technical writer specializing in enterprise software documentation. Generate precise, professional changelog content with zero tolerance for casual language or emojis.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 4000,
      temperature: 0.1,
    }, {
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/hyprnote/hyprnote",
        "X-Title": "hyprnote AI Changelog Generator (Local)",
      },
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("❌ Error generating changelog:", error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log("🚀 Starting local changelog generation...");
    console.log(`📂 Repository: ${owner}/${repo}`);
    console.log(`🧠 Model: ${options.model}`);
    console.log(`📊 Commits to analyze in detail: ${options.commits}`);
    console.log("");

    // Get commits
    const commits = await getCommitsSinceLastRelease();
    console.log(`✅ Found ${commits.length} commits to analyze`);

    if (commits.length === 0) {
      console.log("⚠️  No commits found - exiting");
      return;
    }

    // Get detailed information for each commit
    console.log("📥 Fetching detailed commit information...");
    const commitDetails = await Promise.all(
      commits.slice(0, options.commits).map((commit, index) => {
        process.stdout.write(
          `\r   Fetching commit ${index + 1}/${Math.min(commits.length, options.commits)}: ${
            commit.sha.substring(0, 8)
          }`,
        );
        return getCommitDetails(commit.sha);
      }),
    );
    console.log("\n✅ Commit details fetched");

    // Generate changelog
    const changelog = await generateChangelog(commits, commitDetails);

    // Create output filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
    const outputFile = `changelog-${timestamp}-local.md`;

    // Create full changelog with metadata
    const fullChangelog = `# Changelog Generated ${new Date().toISOString()}

**Generation Details:**
- Generated: ${new Date().toISOString()}
- Mode: Local execution
- Model: ${options.model}
- Test Mode: ${options.testMode}
- Repository: ${owner}/${repo}
- Commits Analyzed: ${Math.min(commits.length, options.commits)} of ${commits.length}

---

${changelog}

---

## Commit Summary

${
      commits.slice(0, options.commits).map((c, i) =>
        `${i + 1}. \`${c.sha.substring(0, 8)}\` ${c.commit.message.split("\n")[0]} (${c.commit.author.name})`
      ).join("\n")
    }

Generated by hyprnote AI Changelog Generator (Local)
`;

    // Save files
    fs.writeFileSync(outputFile, fullChangelog);
    fs.writeFileSync("changelog.md", changelog); // Raw AI output

    // Create metadata
    const metadata = {
      generated_at: new Date().toISOString(),
      execution_mode: "local",
      commit_count: commits.length,
      commits_analyzed: Math.min(commits.length, options.commits),
      model_used: options.model,
      test_mode: options.testMode,
      repository: `${owner}/${repo}`,
      output_file: outputFile,
      commits_analyzed_list: commits.slice(0, options.commits).map(c => ({
        sha: c.sha.substring(0, 8),
        message: c.commit.message.split("\n")[0],
        author: c.commit.author.name,
        date: c.commit.author.date,
      })),
    };

    fs.writeFileSync("changelog-metadata.json", JSON.stringify(metadata, null, 2));

    console.log("\n🎉 Changelog generated successfully!");
    console.log("");
    console.log("📄 Files created:");
    console.log(`   ${outputFile} - Full changelog with metadata`);
    console.log(`   changelog.md - Raw AI-generated changelog`);
    console.log(`   changelog-metadata.json - Generation metadata`);
    console.log("");
    console.log("📖 Preview:");
    console.log("".padEnd(60, "="));
    console.log(changelog.substring(0, 800) + (changelog.length > 800 ? "\n\n... (truncated)" : ""));
    console.log("".padEnd(60, "="));
  } catch (error) {
    console.error("\n❌ Error in main:", error.message);
    process.exit(1);
  }
}

// Check if required packages are installed
try {
  require("@octokit/rest");
  require("axios");
} catch (error) {
  console.error("❌ Missing required packages. Please install:");
  console.error("   npm install axios @octokit/rest");
  process.exit(1);
}

main();
