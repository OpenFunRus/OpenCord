import {
  combineTransactionSteps,
  findChildrenInRange,
  getChangedRanges,
  InputRule,
  mergeAttributes,
  Node,
  PasteRule
} from '@tiptap/core';
import { Fragment, type NodeType, type Schema } from '@tiptap/pm/model';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
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
const EMOJI_UNICODE_REGEX =
  /\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*|\p{Regional_Indicator}{2}/gu;
const EDITOR_EMOJI_SEPARATOR = '\u2060';

type TEmojiTextOptions = {
  emojis: TEmojiItem[];
  enableEmoticons: boolean;
  suggestion: typeof EmojiSuggestion;
  HTMLAttributes?: Record<string, string>;
};

const findEmojiByShortcode = (shortcode: string, emojis: TEmojiItem[]) =>
  emojis.find(
    (emoji) =>
      emoji.name === shortcode || emoji.shortcodes.some((code) => code === shortcode)
  );

const findEmojiByEmoticon = (emoticon: string, emojis: TEmojiItem[]) =>
  emojis.find((emoji) => emoji.emoticons?.includes(emoticon));

const findEmojiByUnicode = (value: string, emojis: TEmojiItem[]) =>
  emojis.find((emoji) => emoji.emoji === value);

const isEmojiNode = (node: { type?: { name?: string } } | null | undefined) =>
  node?.type?.name === 'emoji';

const isSeparatorTextNode = (node: { isText?: boolean; text?: string | null } | null | undefined) =>
  !!node?.isText && node.text === EDITOR_EMOJI_SEPARATOR;

const createEmojiFragment = ({
  schema,
  type,
  name,
  nodeBefore,
  nodeAfter
}: {
  schema: Schema;
  type: NodeType;
  name: string;
  nodeBefore?: { isText?: boolean; text?: string | null; type?: { name?: string } } | null;
  nodeAfter?: { isText?: boolean; text?: string | null; type?: { name?: string } } | null;
}) => {
  const nodes = [];

  if (!nodeBefore || isEmojiNode(nodeBefore)) {
    if (!isSeparatorTextNode(nodeBefore)) {
      nodes.push(schema.text(EDITOR_EMOJI_SEPARATOR));
    }
  }

  nodes.push(type.create({ name }));

  if (!nodeAfter || isEmojiNode(nodeAfter)) {
    if (!isSeparatorTextNode(nodeAfter)) {
      nodes.push(schema.text(EDITOR_EMOJI_SEPARATOR));
    }
  }

  return Fragment.fromArray(nodes);
};

const EmojiText = Node.create<TEmojiTextOptions>({
  name: 'emoji',
  inline: true,
  group: 'inline',
  selectable: false,

  addOptions() {
    return {
      emojis: [],
      enableEmoticons: true,
      suggestion: EmojiSuggestion,
      HTMLAttributes: {}
    };
  },

  addStorage() {
    return {
      emojis: this.options.emojis
    };
  },

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: (element) => (element as HTMLElement).dataset.name ?? null,
        renderHTML: (attributes) =>
          attributes.name ? { 'data-name': attributes.name } : {}
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="emoji"]'
      }
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const emoji = findEmojiByShortcode(node.attrs.name, this.options.emojis);
    const attributes = mergeAttributes(
      HTMLAttributes,
      this.options.HTMLAttributes ?? {},
      {
        'data-type': 'emoji',
        class: 'emoji-image'
      }
    );

    if (!emoji?.fallbackImage) {
      return ['span', attributes, emoji?.emoji ?? `:${node.attrs.name}:`];
    }

    return [
      'span',
      attributes,
      [
        'img',
        {
          src: emoji.fallbackImage,
          draggable: 'false',
          loading: 'lazy',
          align: 'absmiddle',
          alt: `${emoji.name} emoji`,
          class: 'emoji-image'
        }
      ]
    ];
  },

  renderText({ node }) {
    const emoji = findEmojiByShortcode(node.attrs.name, this.options.emojis);

    return emoji?.emoji ?? `:${node.attrs.name}:`;
  },

  addCommands() {
    return {
      setEmoji:
        (shortcode) =>
        ({ chain, state }) => {
          const emoji = findEmojiByShortcode(shortcode, this.options.emojis);

          if (!emoji?.name) {
            return false;
          }

          const { $from } = state.selection;

          chain()
            .focus()
            .insertContent(createEmojiFragment({
              schema: this.editor.schema,
              type: this.type,
              name: emoji.name,
              nodeBefore: $from.nodeBefore,
              nodeAfter: $from.nodeAfter
            }).toJSON())
            .run();

          return true;
        }
    };
  },

  addInputRules() {
    const rules: InputRule[] = [
      new InputRule({
        find: inputRegex,
        handler: ({ range, match, chain, state }) => {
          const shortcode = match[1];
          const emoji = shortcode
            ? findEmojiByShortcode(shortcode, this.options.emojis)
            : undefined;

          if (!emoji?.name) {
            return;
          }

          const $from = state.doc.resolve(range.from);
          const $to = state.doc.resolve(range.to);

          chain()
            .insertContentAt(
              range,
              createEmojiFragment({
                schema: this.editor.schema,
                type: this.type,
                name: emoji.name,
                nodeBefore: $from.nodeBefore,
                nodeAfter: $to.nodeAfter
              }).toJSON()
            )
            .run();
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
            handler: ({ range, match, chain, state }) => {
              const emoticon = match[1];
              const emoji = emoticon
                ? findEmojiByEmoticon(emoticon, this.options.emojis)
                : undefined;

              if (!emoji?.name) {
                return;
              }

              const from = range.to - emoticon.length - 1;
              const to = range.to - 1;
              const $from = state.doc.resolve(from);
              const $to = state.doc.resolve(to);

              chain()
                .insertContentAt(
                  { from, to },
                  createEmojiFragment({
                    schema: this.editor.schema,
                    type: this.type,
                    name: emoji.name,
                    nodeBefore: $from.nodeBefore,
                    nodeAfter: $to.nodeAfter
                  }).toJSON()
                )
                .run();
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
        handler: ({ range, match, chain, state }) => {
          const prefix = match[1] || '';
          const shortcode = match[2];
          const emoji = shortcode
            ? findEmojiByShortcode(shortcode, this.options.emojis)
            : undefined;

          if (!emoji?.name) {
            return;
          }

          const from = range.from + prefix.length;
          const to = range.to;
          const $from = state.doc.resolve(from);
          const $to = state.doc.resolve(to);

          chain()
            .insertContentAt(
              { from, to },
              createEmojiFragment({
                schema: this.editor.schema,
                type: this.type,
                name: emoji.name,
                nodeBefore: $from.nodeBefore,
                nodeAfter: $to.nodeAfter
              }).toJSON(),
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
          if (!props.name) {
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
            .insertContentAt(
              range,
              createEmojiFragment({
                schema: this.editor.schema,
                type: this.type,
                name: props.name,
                nodeBefore: editor.view.state.selection.$from.nodeBefore,
                nodeAfter: editor.view.state.selection.$to.nodeAfter
              }).toJSON()
            )
            .run();
        }
      }),
      new Plugin({
        key: new PluginKey('emoji-normalizer'),
        appendTransaction: (transactions, oldState, newState) => {
          if (this.editor.view.composing) {
            return;
          }

          const docChanges =
            transactions.some((transaction) => transaction.docChanged) &&
            !oldState.doc.eq(newState.doc);

          if (!docChanges) {
            return;
          }

          const tr = newState.tr;
          const transform = combineTransactionSteps(
            oldState.doc,
            transactions as Transaction[]
          );
          const changes = getChangedRanges(transform);

          changes.forEach(({ newRange }) => {
            if (newState.doc.resolve(newRange.from).parent.type.spec.code) {
              return;
            }

            const textNodes = findChildrenInRange(
              newState.doc,
              newRange,
              (node) => node.type.isText
            );

            textNodes.forEach(({ node, pos }) => {
              if (!node.text) {
                return;
              }

              for (const match of node.text.matchAll(EMOJI_UNICODE_REGEX)) {
                if (match.index === undefined) {
                  continue;
                }

                const emoji = match[0];
                const emojiItem = findEmojiByUnicode(emoji, this.options.emojis);

                if (!emojiItem?.name) {
                  continue;
                }

                const mappedFrom = tr.mapping.map(pos + match.index);
                const mappedTo = mappedFrom + emoji.length;
                const $from = tr.doc.resolve(mappedFrom);
                const $to = tr.doc.resolve(mappedTo);

                if ($from.parent.type.spec.code) {
                  continue;
                }

                tr.replaceWith(
                  mappedFrom,
                  mappedTo,
                  createEmojiFragment({
                    schema: this.editor.schema,
                    type: this.type,
                    name: emojiItem.name,
                    nodeBefore: $from.nodeBefore,
                    nodeAfter: $to.nodeAfter
                  })
                );
              }
            });
          });

          if (!tr.steps.length) {
            return;
          }

          return tr;
        }
      })
    ];
  }
});

export { EDITOR_EMOJI_SEPARATOR, EmojiText };
