export type RichTextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'DIV', 'P', 'SPAN']);

export function sanitizeRichText(input = '') {
  if (typeof document === 'undefined') return stripRichText(input);

  const template = document.createElement('template');
  template.innerHTML = input;

  const cleanNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const element = node as HTMLElement;
    const tagName = element.tagName;
    if (!ALLOWED_TAGS.has(tagName)) {
      const fragment = document.createDocumentFragment();
      element.childNodes.forEach(child => {
        const cleaned = cleanNode(child);
        if (cleaned) fragment.appendChild(cleaned);
      });
      return fragment;
    }

    const replacementTag = tagName === 'STRONG' ? 'b' : tagName === 'EM' ? 'i' : tagName.toLowerCase();
    let cleanedElement = document.createElement(replacementTag);
    element.childNodes.forEach(child => {
      const cleaned = cleanNode(child);
      if (cleaned) cleanedElement.appendChild(cleaned);
    });

    if (tagName === 'SPAN') {
      const fontWeight = element.style.fontWeight;
      const isBold = fontWeight === 'bold' || Number(fontWeight) >= 600;
      const isItalic = element.style.fontStyle === 'italic';
      const isUnderlined = element.style.textDecorationLine.includes('underline') || element.style.textDecoration.includes('underline');

      if (isUnderlined) {
        const wrapper = document.createElement('u');
        wrapper.append(...Array.from(cleanedElement.childNodes));
        cleanedElement = wrapper;
      }
      if (isItalic) {
        const wrapper = document.createElement('i');
        wrapper.append(...Array.from(cleanedElement.childNodes));
        cleanedElement = wrapper;
      }
      if (isBold) {
        const wrapper = document.createElement('b');
        wrapper.append(...Array.from(cleanedElement.childNodes));
        cleanedElement = wrapper;
      }
    }

    return cleanedElement;
  };

  const fragment = document.createDocumentFragment();
  template.content.childNodes.forEach(child => {
    const cleaned = cleanNode(child);
    if (cleaned) fragment.appendChild(cleaned);
  });

  const wrapper = document.createElement('div');
  wrapper.appendChild(fragment);
  return wrapper.innerHTML
    .replace(/<div><br><\/div>/g, '<br>')
    .replace(/<\/div><div>/g, '<br>')
    .replace(/<\/?div>/g, '')
    .replace(/<\/?p>/g, '');
}

export function stripRichText(input = '') {
  if (typeof document === 'undefined') {
    return input.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
  }

  const template = document.createElement('template');
  template.innerHTML = input.replace(/<br\s*\/?>/gi, '\n');
  return template.content.textContent || '';
}

export function parseRichText(input = ''): RichTextRun[] {
  if (typeof document === 'undefined') return [{ text: stripRichText(input) }];

  const template = document.createElement('template');
  template.innerHTML = sanitizeRichText(input);
  const runs: RichTextRun[] = [];

  const walk = (node: Node, inherited: Omit<RichTextRun, 'text'> = {}) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text) runs.push({ text, ...inherited });
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as HTMLElement;
    const tagName = element.tagName;
    if (tagName === 'BR') {
      runs.push({ text: '\n', ...inherited });
      return;
    }

    const next = {
      ...inherited,
      bold: inherited.bold || tagName === 'B' || tagName === 'STRONG',
      italic: inherited.italic || tagName === 'I' || tagName === 'EM',
      underline: inherited.underline || tagName === 'U',
    };

    element.childNodes.forEach(child => walk(child, next));
  };

  template.content.childNodes.forEach(child => walk(child));
  return runs.length ? runs : [{ text: '' }];
}
