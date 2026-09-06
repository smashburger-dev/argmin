import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
});

export function renderMarkdown(source) {
  if (typeof source !== 'string') throw new TypeError('Markdown muss ein String sein');
  return markdown.render(source);
}
