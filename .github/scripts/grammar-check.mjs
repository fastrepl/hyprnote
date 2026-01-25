import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import fs from "fs";
import path from "path";

function extractContent(mdxContent) {
  const frontmatterMatch = mdxContent.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatterMatch) {
    return mdxContent.slice(frontmatterMatch[0].length);
  }
  return mdxContent;
}

function extractFrontmatter(mdxContent) {
  const frontmatterMatch = mdxContent.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatterMatch) {
    return frontmatterMatch[1];
  }
  return "";
}

async function checkGrammar(filename, content) {
  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    prompt: `You are a professional editor reviewing a blog article. Check the following content for:

1. Grammar and spelling errors
2. Awkward phrasing or unclear sentences
3. Punctuation issues
4. Consistency in tone and style

For each issue found, provide:
- The original text (quote it)
- The suggested correction
- A brief explanation

If the content is well-written with no issues, say "No issues found."

Be concise and focus only on actual errors or significant improvements. Do not suggest stylistic changes unless they significantly improve clarity.

Content to review:

${content}`,
  });

  return text;
}

async function main() {
  const changedFiles =
    process.env.CHANGED_FILES?.trim().split(" ").filter(Boolean) || [];

  if (changedFiles.length === 0) {
    fs.writeFileSync(
      "grammar-check-results.md",
      "## Grammar Check Results\n\nNo article files were changed in this PR.",
    );
    return;
  }

  const results = [];

  for (const file of changedFiles) {
    if (!fs.existsSync(file)) {
      continue;
    }

    const content = fs.readFileSync(file, "utf8");
    const articleContent = extractContent(content);
    const frontmatter = extractFrontmatter(content);

    const titleMatch =
      frontmatter.match(/display_title:\s*["']?(.+?)["']?\s*$/m) ||
      frontmatter.match(/meta_title:\s*["']?(.+?)["']?\s*$/m);
    const title = titleMatch ? titleMatch[1] : path.basename(file, ".mdx");

    console.log(`Checking: ${file}`);

    try {
      const feedback = await checkGrammar(file, articleContent);
      results.push({
        file,
        title,
        feedback,
      });
    } catch (error) {
      results.push({
        file,
        title,
        feedback: `Error checking grammar: ${error.message}`,
      });
    }
  }

  let markdown = "## Grammar Check Results\n\n";
  markdown += `Reviewed ${results.length} article${results.length === 1 ? "" : "s"}.\n\n`;

  for (const result of results) {
    markdown += `### ${result.title}\n`;
    markdown += `📄 \`${result.file}\`\n\n`;
    markdown += `${result.feedback}\n\n`;
    markdown += "---\n\n";
  }

  markdown += "\n*Powered by Claude Haiku 4.5*";

  fs.writeFileSync("grammar-check-results.md", markdown);
  console.log(
    "Grammar check complete. Results written to grammar-check-results.md",
  );
}

main().catch((error) => {
  console.error("Grammar check failed:", error);
  fs.writeFileSync(
    "grammar-check-results.md",
    `## Grammar Check Results\n\n⚠️ Grammar check failed: ${error.message}`,
  );
  process.exit(1);
});
