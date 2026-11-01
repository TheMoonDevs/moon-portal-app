import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

/*
 * Markdown to HTML for onboarding documents and course lessons. Raw HTML in
 * the Markdown is dropped (remark-rehype leaves it out), and links keep only
 * web, mail and in-page targets, so the result is safe to render.
 */

const SAFE_HREF = /^(https?:|mailto:|#|\/)/i;

const safeLinks = () => (tree: any) => {
  visit(tree, 'element', (node: any) => {
    if (node.tagName !== 'a') return;
    const href = String(node.properties?.href ?? '');
    if (!SAFE_HREF.test(href)) delete node.properties.href;
    else if (/^https?:/i.test(href)) {
      node.properties.target = '_blank';
      node.properties.rel = 'noreferrer';
    }
  });
};

// A new line in a paragraph is a line break, as people writing a letter
// expect ("Prepared for … / on …"), not a space.
const lineBreaks = () => (tree: any) => {
  visit(tree, 'text', (node: any, index: number | undefined, parent: any) => {
    if (!parent || index === undefined || !node.value.includes('\n')) return;
    const out: any[] = [];
    node.value.split(/\r?\n/).forEach((part: string, i: number) => {
      if (i) out.push({ type: 'break' });
      if (part) out.push({ type: 'text', value: part });
    });
    parent.children.splice(index, 1, ...out);
    return index + out.length;
  });
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(lineBreaks)
  .use(remarkRehype)
  .use(safeLinks)
  .use(rehypeStringify);

export function markdownToHtml(markdown: string): string {
  try {
    return String(processor.processSync(markdown ?? ''));
  } catch {
    return '';
  }
}
