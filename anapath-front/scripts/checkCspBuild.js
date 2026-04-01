import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, 'dist');

const disallowedInlinePatterns = [
  {
    kind: 'inline_script',
    test: /<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi,
    message: 'Inline <script> block found in built HTML.',
  },
  {
    kind: 'inline_style',
    test: /<style\b[^>]*>[\s\S]*?<\/style>/gi,
    message: 'Inline <style> block found in built HTML.',
  },
  {
    kind: 'style_attribute',
    test: /\sstyle\s*=\s*["'][^"']*["']/gi,
    message: 'Inline style attribute found in built HTML.',
  },
  {
    kind: 'inline_event_handler',
    test: /\son[a-z]+\s*=\s*["'][^"']*["']/gi,
    message: 'Inline DOM event handler found in built HTML.',
  },
];

const disallowedScriptPatterns = [
  {
    kind: 'eval',
    test: /\beval\s*\(/g,
    message: '`eval(...)` found in built JavaScript.',
  },
  {
    kind: 'new_function',
    test: /\bnew Function\s*\(/g,
    message: '`new Function(...)` found in built JavaScript.',
  },
  {
    kind: 'function_constructor',
    test: /(^|[^A-Za-z0-9_$])Function\s*\(/g,
    message: '`Function(...)` constructor found in built JavaScript.',
  },
];

const disallowedCssPatterns = [
  {
    kind: 'external_import',
    test: /@import\s+(?:url\()?['"]?(?:https?:)?\/\//gi,
    message: 'External stylesheet import found in built CSS.',
  },
  {
    kind: 'javascript_url',
    test: /url\(\s*['"]?javascript:/gi,
    message: '`javascript:` URL found in built CSS.',
  },
];

function isHtmlFile(filePath) {
  return filePath.endsWith('.html');
}

function isJavascriptFile(filePath) {
  return filePath.endsWith('.js');
}

function isCssFile(filePath) {
  return filePath.endsWith('.css');
}

function isSafeAssetUrl(url) {
  return (
    url.startsWith('/')
    || url.startsWith('./')
    || url.startsWith('../')
    || url.startsWith('#')
    || url.startsWith('data:')
    || url.startsWith('blob:')
    || (!url.includes('://') && !url.startsWith('//') && !url.startsWith('javascript:'))
  );
}

function summarizeMatch(content, index) {
  const start = Math.max(0, index - 40);
  const end = Math.min(content.length, index + 140);
  return content
    .slice(start, end)
    .replace(/\s+/g, ' ')
    .trim();
}

async function collectFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

async function ensureDistExists() {
  const distStats = await stat(distDir).catch(() => null);

  if (!distStats?.isDirectory()) {
    throw new Error(
      'Dist introuvable. Exécutez `npm run build` avant `npm run security:csp:check`.'
    );
  }
}

async function main() {
  await ensureDistExists();

  const files = await collectFiles(distDir);
  const issues = [];

  for (const filePath of files) {
    const content = await readFile(filePath, 'utf8');
    const relativePath = path.relative(projectRoot, filePath);

    if (isHtmlFile(filePath)) {
      for (const pattern of disallowedInlinePatterns) {
        const regex = new RegExp(pattern.test.source, pattern.test.flags);

        for (const match of content.matchAll(regex)) {
          issues.push({
            file: relativePath,
            kind: pattern.kind,
            message: pattern.message,
            evidence: summarizeMatch(content, match.index ?? 0),
          });
        }
      }

      const assetUrlPattern = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
      for (const match of content.matchAll(assetUrlPattern)) {
        const url = match[1];

        if (!isSafeAssetUrl(url)) {
          issues.push({
            file: relativePath,
            kind: 'external_asset_url',
            message: `External or unsafe asset URL found in built HTML: ${url}`,
            evidence: summarizeMatch(content, match.index ?? 0),
          });
        }
      }
    }

    if (isJavascriptFile(filePath)) {
      for (const pattern of disallowedScriptPatterns) {
        const regex = new RegExp(pattern.test.source, pattern.test.flags);

        for (const match of content.matchAll(regex)) {
          issues.push({
            file: relativePath,
            kind: pattern.kind,
            message: pattern.message,
            evidence: summarizeMatch(content, match.index ?? 0),
          });
        }
      }
    }

    if (isCssFile(filePath)) {
      for (const pattern of disallowedCssPatterns) {
        const regex = new RegExp(pattern.test.source, pattern.test.flags);

        for (const match of content.matchAll(regex)) {
          issues.push({
            file: relativePath,
            kind: pattern.kind,
            message: pattern.message,
            evidence: summarizeMatch(content, match.index ?? 0),
          });
        }
      }
    }
  }

  if (issues.length > 0) {
    console.error('CSP compatibility check failed for the built frontend bundle.\n');

    for (const issue of issues) {
      console.error(`- [${issue.kind}] ${issue.file}: ${issue.message}`);
      console.error(`  ${issue.evidence}`);
    }

    process.exitCode = 1;
    return;
  }

  console.log(
    [
      'CSP compatibility check passed.',
      "Validated against the documented frontend target policy: script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'.",
      `Scanned ${files.length} built file(s) under ${path.relative(projectRoot, distDir)}.`,
    ].join(' ')
  );
}

await main();
