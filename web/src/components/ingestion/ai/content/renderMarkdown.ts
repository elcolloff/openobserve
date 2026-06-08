// Copyright 2026 OpenObserve Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

// Renders a card section's markdown to sanitized HTML, with the user's
// {url}/{org}/{token} substituted and a copy button injected per code block.
// The raw (substituted) text of each code block is returned in `codeBlocks`,
// indexed by the `data-code-idx` on its button — the component copies from
// that array so the clipboard gets the runnable command, not escaped HTML.

import { Marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js";

export interface CardSubstitutions {
  url: string;
  org: string;
  /** Base64 of email:password, WITHOUT the leading "Basic " (snippets add it). */
  token: string;
}

export interface RenderedMarkdown {
  html: string;
  codeBlocks: string[];
}

function substitute(md: string, subs: CardSubstitutions): string {
  return md
    .replaceAll("{url}", subs.url)
    .replaceAll("{org}", subs.org)
    .replaceAll("{token}", subs.token);
}

function highlight(code: string, lang?: string): string {
  try {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  } catch {
    // hljs escapes its output; escape manually on the error path.
    return code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}

export function renderCardMarkdown(
  md: string,
  subs: CardSubstitutions,
): RenderedMarkdown {
  const substituted = substitute(md, subs);
  const codeBlocks: string[] = [];

  // A fresh instance per call keeps the codeBlocks closure local and avoids
  // mutating the shared `marked` singleton used elsewhere in the app.
  const marked = new Marked({ gfm: true, breaks: false });
  marked.use({
    renderer: {
      code({ text, lang }: { text: string; lang?: string }) {
        // Store the RAW (substituted) code and reference it by index on the
        // button — the copy handler copies codeBlocks[idx], not the highlighted/
        // escaped HTML, so the clipboard always gets the runnable command.
        const idx = codeBlocks.push(text) - 1;
        const langClass = lang ? ` language-${lang}` : "";
        const langLabel = lang ? lang : "text";
        return (
          `<div class="o2-code-block">` +
          `<div class="o2-code-toolbar">` +
          `<span class="o2-code-lang">${langLabel}</span>` +
          `<button type="button" class="o2-copy-btn" data-code-idx="${idx}" aria-label="Copy code">Copy</button>` +
          `</div>` +
          `<pre class="o2-code-pre"><code class="hljs${langClass}">${highlight(text, lang)}</code></pre>` +
          `</div>`
        );
      },
    },
  });

  // `async: false` forces the synchronous overload (our renderer is sync), so
  // marked.parse always returns a string — DOMPurify never receives a Promise.
  const rendered = marked.parse(substituted, { async: false });
  // Sanitize before the component v-html's this (XSS defense for repo-sourced
  // markdown). DOMPurify strips <script>/on* handlers by default; we only
  // re-allow our copy <button> and its data-code-idx / aria-label / type attrs.
  const html = DOMPurify.sanitize(rendered, {
    ADD_TAGS: ["button"],
    ADD_ATTR: ["data-code-idx", "aria-label", "type"],
  });

  return { html, codeBlocks };
}
