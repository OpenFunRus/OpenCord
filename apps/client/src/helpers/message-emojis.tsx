import { findStandardEmoji } from '@/components/emoji-picker/emoji-data';
import { getLocalTwemojiUrlByIcon } from '@/helpers/get-local-twemoji-url';
import parse from 'html-react-parser';
import twemoji from 'twemoji';
import { Fragment } from 'react';

const INLINE_EMOJI_CLASS =
  'inline-block h-[1.15em] w-[1.15em] select-none align-[-0.2em]';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const canonicalizeMessageEmojiHtml = (html: string) => {
  if (!html || typeof DOMParser === 'undefined') {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('span[data-type="emoji"]').forEach((node) => {
    const name = node.getAttribute('data-name')?.trim();

    if (!name) return;

    node.replaceWith(doc.createTextNode(findStandardEmoji(name)?.emoji ?? `:${name}:`));
  });

  return doc.body.innerHTML;
};

const renderUnicodeEmojiHtml = (text: string) =>
  twemoji.parse(escapeHtml(text), {
    callback: (icon) => getLocalTwemojiUrlByIcon(icon) || false,
    attributes: (rawText) => ({
      class: INLINE_EMOJI_CLASS,
      'data-emoji-text': rawText
    })
  });

const renderMessageTextWithEmojis = (text: string, key: string) => {
  if (!text) return null;

  const html = renderUnicodeEmojiHtml(text);
  const hasEmojiReplacement = html.includes('<img');

  if (!hasEmojiReplacement) {
    return null;
  }

  return <Fragment key={key}>{parse(html)}</Fragment>;
};

const getClipboardTextFromRenderedEmojiHtml = (html: string) => {
  if (!html || typeof DOMParser === 'undefined') {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('span[data-type="emoji"]').forEach((node) => {
    const name = node.getAttribute('data-name')?.trim();

    if (!name) return;

    node.replaceWith(doc.createTextNode(findStandardEmoji(name)?.emoji ?? `:${name}:`));
  });

  doc.querySelectorAll('img').forEach((node) => {
    const token = node.getAttribute('data-emoji-text') ?? '';

    if (!token) return;

    node.replaceWith(doc.createTextNode(token));
  });

  return (doc.body.innerText || doc.body.textContent || '').replace(/\r\n/g, '\n');
};

const isEmojiOnlyHtml = (html: string | null | undefined) => {
  if (!html || typeof DOMParser === 'undefined') {
    return false;
  }

  const canonicalHtml = canonicalizeMessageEmojiHtml(html);
  const parser = new DOMParser();
  const doc = parser.parseFromString(canonicalHtml, 'text/html');
  const plainText = doc.body.textContent ?? '';

  if (!plainText.trim()) {
    return false;
  }

  const unicodeAsImages = renderUnicodeEmojiHtml(plainText).replace(
    /<img[^>]*>/g,
    ''
  );
  const unicodeDoc = parser.parseFromString(unicodeAsImages, 'text/html');
  const remainingText = unicodeDoc.body.textContent ?? '';

  return remainingText.trim().length === 0;
};

export {
  canonicalizeMessageEmojiHtml,
  getClipboardTextFromRenderedEmojiHtml,
  isEmojiOnlyHtml,
  renderMessageTextWithEmojis
};
