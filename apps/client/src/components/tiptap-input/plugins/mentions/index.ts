import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import {
  MENTION_STORAGE_KEY,
  MentionSuggestion,
  type TMentionSuggestionItem
} from './suggestion';

export const MentionPluginKey = new PluginKey('mention');

type TMentionOptions = {
  items: TMentionSuggestionItem[];
  suggestion: typeof MentionSuggestion;
};

export const Mention = Extension.create<TMentionOptions>({
  name: MENTION_STORAGE_KEY,
  addOptions() {
    return {
      items: [],
      suggestion: MentionSuggestion
    };
  },
  addStorage() {
    return {
      items: this.options.items
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion<TMentionSuggestionItem, TMentionSuggestionItem>({
        editor: this.editor,
        pluginKey: MentionPluginKey,
        char: '@',
        startOfLine: false,
        allowSpaces: this.options.suggestion.allowSpaces,
        items: this.options.suggestion.items,
        render: this.options.suggestion.render,
        command: ({ editor, range, props }) => {
          const displayName =
            props.kind === 'user'
              ? getRenderedUsername(props.user)
              : props.label;
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              {
                type: 'mention',
                attrs: {
                  kind: props.kind,
                  userId: props.kind === 'user' ? props.id : null,
                  roleId: props.kind === 'role' ? props.id : null,
                  label: displayName
                }
              },
              { type: 'text', text: ' ' }
            ])
            .run();
        }
      })
    ];
  }
});

