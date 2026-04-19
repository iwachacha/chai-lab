import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const requiredFiles = [
  "README.md",
  "AGENTS.md",
  "docs/agent-relationship-governance.md",
  "docs/agent-workflow.md",
  "docs/codex-execution-rules.md",
  "docs/agent-relationship-governance-decision.md",
  "docs/templates/worklog.md",
  ".github/pull_request_template.md",
  ".github/workflows/docs.yml",
];

const requiredMentions = [
  ["README.md", "AGENTS.md"],
  ["README.md", "docs/templates/worklog.md"],
  ["README.md", "npm run check:docs"],
  ["AGENTS.md", "docs/agent-relationship-governance.md"],
  ["AGENTS.md", "docs/agent-workflow.md"],
  ["AGENTS.md", "docs/codex-execution-rules.md"],
  ["AGENTS.md", "docs/templates/worklog.md"],
  ["docs/agent-workflow.md", "docs/templates/worklog.md"],
  [".github/pull_request_template.md", "docs/templates/worklog.md"],
];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function walk(dir) {
  const absoluteDir = path.join(root, dir);
  if (!fs.existsSync(absoluteDir)) {
    return [];
  }

  return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return walk(relativePath);
    }

    return [relativePath];
  });
}

for (const file of requiredFiles) {
  if (!exists(file)) {
    failures.push(`Missing required operational file: ${file}`);
  }
}

for (const [file, mention] of requiredMentions) {
  if (!exists(file)) {
    continue;
  }

  if (!read(file).includes(mention)) {
    failures.push(`${file} must mention ${mention}`);
  }
}

const markdownFiles = [
  "README.md",
  "AGENTS.md",
  ...walk("docs").filter((file) => file.endsWith(".md")),
  ...walk(".github").filter((file) => file.endsWith(".md")),
];

const markdownLinkPattern = /!?\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

for (const file of markdownFiles) {
  const content = read(file);
  const baseDir = path.dirname(path.join(root, file));
  let match;

  while ((match = markdownLinkPattern.exec(content)) !== null) {
    const rawTarget = match[1].replace(/^<|>$/g, "");

    if (
      rawTarget.startsWith("#") ||
      rawTarget.startsWith("http://") ||
      rawTarget.startsWith("https://") ||
      rawTarget.startsWith("mailto:")
    ) {
      continue;
    }

    const targetWithoutAnchor = rawTarget.split("#")[0];
    if (!targetWithoutAnchor) {
      continue;
    }

    const resolvedTarget = path.resolve(baseDir, targetWithoutAnchor);
    if (!fs.existsSync(resolvedTarget)) {
      failures.push(`${file} links to missing target: ${rawTarget}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Operational docs check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Operational docs check passed (${markdownFiles.length} markdown files).`);
