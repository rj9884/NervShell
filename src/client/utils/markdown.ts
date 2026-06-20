/**
 * Simple, robust Markdown parser that compiles markdown text into safe HTML strings.
 * Handles headers, bold/italic, inline code, fenced code blocks, links, bullet lists, and tables.
 */
export function renderMarkdown(md: string): string {
  if (!md) return "";

  const lines = md.split("\n");
  let html = "";
  let inCodeBlock = false;
  let codeLang = "";
  let codeLines: string[] = [];
  let inList = false;
  let inTable = false;
  let tableHeaderParsed = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushList = () => {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  };

  const flushTable = () => {
    if (inTable) {
      html += '<div class="overflow-x-auto my-4 border border-slate-200 rounded-lg"><table class="min-w-full divide-y divide-slate-200 text-sm">';
      if (tableHeaders.length > 0) {
        html += '<thead class="bg-slate-50"><tr>';
        tableHeaders.forEach((h) => {
          html += `<th class="px-4 py-2 text-left font-semibold text-slate-700 border-b border-slate-200">${h}</th>`;
        });
        html += "</tr></thead>";
      }
      html += '<tbody class="divide-y divide-slate-100 bg-white">';
      tableRows.forEach((row) => {
        html += "<tr>";
        row.forEach((cell) => {
          html += `<td class="px-4 py-2 text-slate-600 border-b border-slate-100">${cell}</td>`;
        });
        html += "</tr>";
      });
      html += "</tbody></table></div>";
      inTable = false;
      tableHeaderParsed = false;
      tableHeaders = [];
      tableRows = [];
    }
  };

  // Pre-process inline formatting (bold, italic, code, links)
  const renderInline = (text: string): string => {
    // Escape HTML tags to prevent XSS (except links or formats we parse)
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Inline Code: `code`
    escaped = escaped.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono text-xs">$1</code>');

    // Bold: **bold** or __bold__
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
    escaped = escaped.replace(/__([^_]+)__/g, '<strong class="font-bold text-slate-900">$1</strong>');

    // Italic: *italic* or _italic_
    escaped = escaped.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
    escaped = escaped.replace(/_([^_]+)_/g, '<em class="italic">$1</em>');

    // Links: [text](url)
    escaped = escaped.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" class="text-blue-600 font-medium hover:underline hover:text-blue-800">$1</a>'
    );

    return escaped;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code Blocks: ```ts
    if (line.trim().startsWith("```")) {
      flushList();
      flushTable();

      if (inCodeBlock) {
        // End of code block
        const codeContent = codeLines.join("\n");
        // Simple HTML escaping for code
        const escapedCode = codeContent
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

        html += `<div class="relative my-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-hidden border border-slate-800">
          <div class="flex items-center justify-between px-4 py-2 bg-slate-950 text-slate-400 font-sans font-medium text-[10px] uppercase tracking-wider border-b border-slate-800">
            <span>${codeLang || "code"}</span>
            <button onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText); this.innerText='COPIED'; setTimeout(() => this.innerText='COPY', 1500)" class="text-slate-400 hover:text-white font-bold cursor-pointer transition">COPY</button>
          </div>
          <pre class="p-4 overflow-x-auto text-[13px] leading-relaxed"><code>${escapedCode}</code></pre>
        </div>`;
        inCodeBlock = false;
        codeLines = [];
        codeLang = "";
      } else {
        // Start of code block
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Table checking
    const isTableRow = line.trim().startsWith("|") && line.trim().endsWith("|");
    if (isTableRow) {
      flushList();
      inTable = true;
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => renderInline(c.trim()));

      // Check if it is a separator row (e.g. |---|---|)
      const isSeparator = cells.every((c) => /^[:-]+$/.test(c.replace(/&amp;/g, "").trim()) || c.trim() === "");
      if (isSeparator) {
        tableHeaderParsed = true;
        continue;
      }

      if (!tableHeaderParsed && tableHeaders.length === 0) {
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else {
      flushTable();
    }

    // Headers: # Header
    if (line.startsWith("#")) {
      flushList();
      const level = line.match(/^#+/)?.[0].length || 1;
      const title = line.slice(level).trim();
      const inlineTitle = renderInline(title);
      const classes =
        level === 1
          ? "text-3xl font-bold tracking-tight text-slate-900 mt-6 mb-3 font-display"
          : level === 2
          ? "text-2xl font-bold tracking-tight text-slate-900 mt-5 mb-2.5 font-display"
          : "text-lg font-bold text-slate-900 mt-4 mb-2 font-display";

      html += `<h${level} class="${classes}">${inlineTitle}</h${level}>`;
      continue;
    }

    // Bullet Lists: - item or * item
    const listMatch = line.match(/^(\s*)([-*])\s+(.+)$/);
    if (listMatch) {
      if (!inList) {
        html += '<ul class="list-disc pl-5 my-3 space-y-1.5 text-slate-700">';
        inList = true;
      }
      const itemContent = renderInline(listMatch[3]);
      html += `<li>${itemContent}</li>`;
      continue;
    } else {
      flushList();
    }

    // Blank lines
    if (line.trim() === "") {
      html += '<div class="h-3"></div>';
      continue;
    }

    // Standard Paragraph
    const inlineParagraph = renderInline(line);
    html += `<p class="text-[14px] leading-relaxed text-slate-700 my-2">${inlineParagraph}</p>`;
  }

  // Flush remaining structures
  flushList();
  flushTable();

  return html;
}
