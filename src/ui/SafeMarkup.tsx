import { Fragment, h, type ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';

const allowedTags = new Set([
  'p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'pre', 'code', 'strong', 'em', 'a',
  'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'br',
]);
const droppedTags = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math']);
const safeHref = (value: string) => /^(https?:|mailto:|#|\/|\.\/|\.\.\/)/i.test(value);

function renderNode(node: ChildNode, key: string): ComponentChildren {
  if (node.nodeType === 3) return node.textContent || '';
  if (node.nodeType !== 1) return null;
  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  if (droppedTags.has(tag)) return null;
  const children = [...element.childNodes].map((child, index) => renderNode(child, `${key}-${index}`));
  if (!allowedTags.has(tag)) return h(Fragment, { key }, children);
  const attributes: Record<string, string> = { key };
  if (tag === 'a') {
    const href = element.getAttribute('href') || '';
    if (safeHref(href)) attributes.href = href;
    const title = element.getAttribute('title');
    if (title) attributes.title = title;
  }
  if (tag === 'code') {
    const className = element.getAttribute('class') || '';
    if (/^language-[a-z0-9_-]+$/i.test(className)) attributes.class = className;
  }
  return h(tag, attributes, children);
}

export function SafeMarkup({ html }: { html: string }) {
  const content = useMemo(() => {
    const document = new DOMParser().parseFromString(html, 'text/html');
    return [...document.body.childNodes].map((node, index) => renderNode(node, `root-${index}`));
  }, [html]);
  return <>{content}</>;
}
