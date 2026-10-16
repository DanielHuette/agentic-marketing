// Renders post bodies the way the blog does: CommonMark, raw HTML switched off.
import MarkdownIt from "markdown-it";

const renderer = new MarkdownIt("commonmark", { html: false, linkify: false, typographer: false });

export function renderMarkdown(text: string): string {
  return renderer.render(text);
}
