import { getLocalTwemojiUrlByIcon } from '@/helpers/get-local-twemoji-url';
import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const EMOJI_UNICODE_REGEX =
  /\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*|\p{Regional_Indicator}{2}/gu;

const buildEmojiDecorations = (doc: Parameters<typeof DecorationSet.create>[0]) => {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return;
    }

    for (const match of node.text.matchAll(EMOJI_UNICODE_REGEX)) {
      const emojiText = match[0];
      const index = match.index;

      if (!emojiText || index === undefined) {
        continue;
      }

      const imageUrl = getLocalTwemojiUrlByIcon(emojiText);

      if (!imageUrl) {
        continue;
      }

      decorations.push(
        Decoration.inline(pos + index, pos + index + emojiText.length, {
          class: 'pm-unicode-emoji',
          style: `--emoji-url:url("${imageUrl}")`,
          'data-emoji-text': emojiText
        })
      );
    }
  });

  return DecorationSet.create(doc, decorations);
};

const EmojiVisualDecorations = Extension.create({
  name: 'emojiVisualDecorations',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: (state) => buildEmojiDecorations(state.doc)
        }
      })
    ];
  }
});

export { EmojiVisualDecorations };
