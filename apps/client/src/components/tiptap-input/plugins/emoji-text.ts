import { Extension, InputRule, PasteRule } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import type { TEmojiItem } from '../helpers';
import { EmojiSuggestion } from './suggestions';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emoji: {
      setEmoji: (shortcode: string) => ReturnType;
    };
  }
}

const inputRegex = /:([a-zA-Z0-9_+-]+):$/;
const pasteRegex = /(^|\s):([a-zA-Z0-9_+-]+):/g;
const EmojiSuggestionPluginKey = new PluginKey('emojiSuggestion');

type TEmojiTextOptions = {
  emojis: TEmojiItem[];
  enableEmoticons: boolean;
  suggestion: typeof EmojiSuggestion;
};

const findEmojiByShortcode = (shortcode: string, emojis: TEmojiItem[]) =>
  emojis.find(
    (emoji) =>
      emoji.name === shortcode || emoji.shortcodes.some((code) => code === shortcode)
  );

const findEmojiByEmoticon = (emoticon: string, emojis: TEmojiItem[]) =>
  emojis.find((emoji) => emoji.emoticons?.includes(emoticon));

const EmojiText = Extension.create<TEmojiTextOptions>({
  name: 'emoji',

  addOptions() {
    return {
      emojis: [],
      enableEmoticons: true,
      suggestion: EmojiSuggestion
    };
  },

  addStorage() {
    return {
      emojis: this.options.emojis
    };
  },

  addCommands() {
    return {
      setEmoji:
        (shortcode) =>
        ({ chain }) => {
          const emoji = findEmojiByShortcode(shortcode, this.options.emojis);

          if (!emoji?.emoji) {
            return false;
          }

          chain().focus().insertContent(emoji.emoji).run();

          return true;
        }
    };
  },

  addInputRules() {
    const rules: InputRule[] = [
      new InputRule({
        find: inputRegex,
        handler: ({ range, match, chain }) => {
          const shortcode = match[1];
          const emoji = shortcode
            ? findEmojiByShortcode(shortcode, this.options.emojis)
            : undefined;

          if (!emoji?.emoji) {
            return;
          }

          chain().insertContentAt(range, emoji.emoji).run();
        }
      })
    ];

    if (this.options.enableEmoticons) {
      const emoticons = this.options.emojis.flatMap((emoji) => emoji.emoticons ?? []);

      if (emoticons.length > 0) {
        rules.push(
          new InputRule({
            find: new RegExp(
              `(?:^|\\s)(${emoticons
                .map((emoticon) =>
                  emoticon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                )
                .join('|')}) $`
            ),
            handler: ({ range, match, chain }) => {
              const emoticon = match[1];
              const emoji = emoticon
                ? findEmojiByEmoticon(emoticon, this.options.emojis)
                : undefined;

              if (!emoji?.emoji) {
                return;
              }

              const from = range.to - emoticon.length - 1;
              const to = range.to - 1;

              chain().insertContentAt({ from, to }, emoji.emoji).run();
            }
          })
        );
      }
    }

    return rules;
  },

  addPasteRules() {
    return [
      new PasteRule({
        find: pasteRegex,
        handler: ({ range, match, chain }) => {
          const prefix = match[1] || '';
          const shortcode = match[2];
          const emoji = shortcode
            ? findEmojiByShortcode(shortcode, this.options.emojis)
            : undefined;

          if (!emoji?.emoji) {
            return;
          }

          chain()
            .insertContentAt(
              { from: range.from + prefix.length, to: range.to },
              emoji.emoji,
              { updateSelection: false }
            )
            .run();
        }
      })
    ];
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<TEmojiItem, TEmojiItem>({
        editor: this.editor,
        pluginKey: EmojiSuggestionPluginKey,
        char: ':',
        startOfLine: false,
        allowSpaces: this.options.suggestion.allowSpaces,
        items: this.options.suggestion.items,
        render: this.options.suggestion.render,
        command: ({ editor, range, props }) => {
          if (!props.emoji) {
            return;
          }

          const nodeAfter = editor.view.state.selection.$to.nodeAfter;
          const overrideSpace = nodeAfter?.text?.startsWith(' ');

          if (overrideSpace) {
            range.to += 1;
          }

          editor
            .chain()
            .focus()
            .insertContentAt(range, `${props.emoji} `)
            .run();
        }
      })
    ];
  }
});

export { EmojiText };
