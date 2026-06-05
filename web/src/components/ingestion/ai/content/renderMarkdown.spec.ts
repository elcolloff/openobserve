// Copyright 2026 OpenObserve Inc.

import { describe, expect, it } from "vitest";
import { renderCardMarkdown } from "./renderMarkdown";

const SUBS = {
  url: "https://api.example.com",
  org: "myorg",
  token: "dG9rZW4=",
};

describe("renderCardMarkdown", () => {
  it("substitutes {url}/{org}/{token} placeholders", () => {
    const md = "```bash\ncurl --url={url} --org={org} --token=\"Basic {token}\"\n```";
    const { html, codeBlocks } = renderCardMarkdown(md, SUBS);
    expect(codeBlocks[0]).toContain("--url=https://api.example.com");
    expect(codeBlocks[0]).toContain("--org=myorg");
    expect(codeBlocks[0]).toContain('--token="Basic dG9rZW4="');
    expect(html).not.toContain("{url}");
    expect(html).not.toContain("{token}");
  });

  it("injects a copy button per code block and collects the raw code", () => {
    const md = "```bash\necho one\n```\n\n```bash\necho two\n```";
    const { html, codeBlocks } = renderCardMarkdown(md, SUBS);
    expect(codeBlocks).toEqual(["echo one", "echo two"]);
    expect(html).toContain('class="o2-copy-btn"');
    expect(html).toContain('data-code-idx="0"');
    expect(html).toContain('data-code-idx="1"');
  });

  it("renders gfm tables and preserves the copy button after sanitization", () => {
    const md = "| A | B |\n|---|---|\n| 1 | 2 |\n\n```\ncode\n```";
    const { html } = renderCardMarkdown(md, SUBS);
    expect(html).toContain("<table");
    expect(html).toContain("<button");
  });

  it("does not leak script tags through sanitization", () => {
    const { html } = renderCardMarkdown("<script>alert(1)</script>\n\ntext", SUBS);
    expect(html).not.toContain("<script");
  });
});
