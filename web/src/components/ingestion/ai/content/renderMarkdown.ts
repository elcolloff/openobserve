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

// Splits a card section's markdown into ordered segments — prose (sanitized
// HTML) and top-level fenced code blocks — with the user's {url}/{org}/{token}
// already substituted. The component renders prose via v-html and renders code
// segments with the shared CopyContent.vue component (same copy affordance as
// every other ingestion section), which is why code is returned as raw text
// rather than baked into the HTML.

import { Marked } from "marked";
import DOMPurify from "dompurify";

export interface CardSubstitutions {
  url: string;
  org: string;
  /** Base64 of email:password, WITHOUT the leading "Basic " (snippets add it). */
  token: string;
}

export type CardSegment =
  | { type: "html"; html: string }
  | { type: "code"; code: string; lang: string };

function substitute(md: string, subs: CardSubstitutions): string {
  return md
    .replaceAll("{url}", subs.url)
    .replaceAll("{org}", subs.org)
    .replaceAll("{token}", subs.token);
}

export function renderCardSegments(
  md: string,
  subs: CardSubstitutions,
): CardSegment[] {
  const substituted = substitute(md, subs);

  // Fresh instance so we never mutate the app-wide `marked` singleton.
  const marked = new Marked({ gfm: true, breaks: false });
  const tokens = marked.lexer(substituted);

  const segments: CardSegment[] = [];
  let buffer = "";

  // Render accumulated non-code markdown into one sanitized HTML segment.
  const flushProse = () => {
    if (!buffer.trim()) {
      buffer = "";
      return;
    }
    // `async: false` forces the sync string overload (no custom async tokens),
    // and DOMPurify guards the HTML we hand to v-html (XSS defense).
    const html = DOMPurify.sanitize(marked.parse(buffer, { async: false }));
    segments.push({ type: "html", html });
    buffer = "";
  };

  for (const token of tokens) {
    // Only TOP-LEVEL fenced code blocks become CopyContent blocks; code nested
    // inside lists/blockquotes stays inline in the prose.
    if (token.type === "code") {
      flushProse();
      segments.push({ type: "code", code: token.text, lang: token.lang ?? "" });
    } else {
      buffer += token.raw;
    }
  }
  flushProse();

  return segments;
}
