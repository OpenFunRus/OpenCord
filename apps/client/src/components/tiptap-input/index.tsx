import { EmojiPicker } from '@/components/emoji-picker';
import { ALL_EMOJIS } from '@/components/emoji-picker/emoji-data';
import { useRoles } from '@/features/server/roles/hooks';
import { useChannelById } from '@/features/server/channels/hooks';
import { useMentionableUsers } from '@/features/server/users/hooks';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { canonicalizeMessageEmojiHtml } from '@/helpers/message-emojis';
import type { TCommandInfo } from '@opencord/shared';
import { Button } from '@opencord/ui';
import Link from '@tiptap/extension-link';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ChevronDown, ChevronUp, Smile } from 'lucide-react';
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { TEmojiItem } from './helpers';
import {
  COMMANDS_STORAGE_KEY,
  CommandSuggestion
} from './plugins/command-suggestion';
import { EmojiText } from './plugins/emoji-text';
import { EmojiVisualDecorations } from './plugins/emoji-visual-decorations';
import { Mention } from './plugins/mentions';
import { MentionNode } from './plugins/mentions/node';
import {
  MENTION_STORAGE_KEY,
  MentionSuggestion,
  type TMentionSuggestionItem
} from './plugins/mentions/suggestion';
import { SlashCommands } from './plugins/slash-commands-extension';
import { EmojiSuggestion } from './plugins/suggestions';
import { useTranslation } from 'react-i18next';

type TTiptapInputProps = {
  disabled?: boolean;
  readOnly?: boolean;
  value?: string;
  onChange?: (html: string) => void;
  onSubmit?: () => void;
  onGifSelect?: (gifUrl: string) => void;
  onCancel?: () => void;
  onTyping?: () => void;
  commands?: TCommandInfo[];
  mentionChannelId?: number;
};

const TiptapInput = memo(
  ({
    value,
    onChange,
    onSubmit,
    onGifSelect,
    onCancel,
    onTyping,
    disabled,
    readOnly,
    commands,
    mentionChannelId
  }: TTiptapInputProps) => {
    const { t } = useTranslation('common');
    const readOnlyRef = useRef(readOnly);

    readOnlyRef.current = readOnly;

    const [isExpanded, setIsExpanded] = useState(false);
    const [hasOverflow, setHasOverflow] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const editorWrapperRef = useRef<HTMLDivElement>(null);

    const users = useMentionableUsers();
    const roles = useRoles();
    const channel = useChannelById(mentionChannelId ?? -1);
    const mentionItems = useMemo<TMentionSuggestionItem[]>(
      () => [
        {
          kind: 'everyone',
          id: 'everyone',
          label: t('mentionEveryone')
        },
        ...(channel?.isDm
          ? []
          : roles.map((role) => ({
              kind: 'role' as const,
              id: role.id,
              label: role.name,
              color: role.color
            }))),
        ...users.map((user) => ({
          kind: 'user' as const,
          id: user.id,
          label: getRenderedUsername(user),
          user
        }))
      ],
      [channel?.isDm, roles, users, t]
    );

    const extensions = useMemo(() => {
      const exts = [
        StarterKit.configure({
          hardBreak: {
            HTMLAttributes: {
              class: 'hard-break'
            }
          }
        }),
        Link.configure({
          autolink: true,
          defaultProtocol: 'https',
          openOnClick: false,
          HTMLAttributes: {
            target: '_blank',
            rel: 'noopener noreferrer'
          },
          shouldAutoLink: (url) => {
            return /^https?:\/\//i.test(url);
          }
        }),
        EmojiText.configure({
          emojis: ALL_EMOJIS,
          enableEmoticons: true,
          suggestion: EmojiSuggestion
        }),
        EmojiVisualDecorations,
        Mention.configure({
          items: mentionItems,
          suggestion: MentionSuggestion
        }),
        MentionNode
      ];

      if (commands) {
        exts.push(
          SlashCommands.configure({
            commands,
            suggestion: CommandSuggestion
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }) as any
        );
      }

      return exts;
    }, [commands, mentionItems]);

    const editor = useEditor({
      extensions,
      content: value ? canonicalizeMessageEmojiHtml(value) : value,
      editable: !disabled,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();

        onChange?.(html);

        if (!editor.isEmpty) {
          onTyping?.();
        }
      },
      editorProps: {
        handleKeyDown: (_view, event) => {
          // block all input when readOnly
          if (readOnlyRef.current) {
            event.preventDefault();
            return true;
          }

          const hasSuggestions = !!document.querySelector(
            '[data-editor-suggestion-active="true"]'
          );

          if (event.key === 'Enter') {
            if (event.shiftKey) {
              return false;
            }

            // if suggestions are active, don't handle Enter - let the suggestion handle it
            if (hasSuggestions) {
              return false;
            }

            event.preventDefault();
            onSubmit?.();
            return true;
          }

          if (event.key === 'Escape') {
            if (hasSuggestions) {
              return false;
            }

            event.preventDefault();
            onCancel?.();
            return true;
          }

          return false;
        },
        handleClickOn: (_view, _pos, _node, _nodePos, event) => {
          const target = event.target as HTMLElement;

          // prevents clicking on links inside the edit from opening them in the browser
          if (target.tagName === 'A') {
            event.preventDefault();

            return true;
          }

          return false;
        },
        handlePaste: () => !!readOnlyRef.current,
        handleDrop: () => readOnlyRef.current
      }
    });

    const handleEmojiSelect = (emoji: TEmojiItem) => {
      if (disabled || readOnly) return;

      if (emoji.shortcodes.length > 0) {
        editor?.chain().focus().setEmoji(emoji.shortcodes[0]).run();
      }
    };

    const handleGifSelect = (gifUrl: string) => {
      if (disabled || readOnly) return;

      if (onGifSelect) {
        onGifSelect(gifUrl);
        return;
      }

      if (!editor) return;
      editor.chain().focus().insertContent(`${gifUrl} `).run();
    };

    // keep commands storage in sync with plugin commands from the store
    useEffect(() => {
      if (editor && commands) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const storage = editor.storage as any;
        if (storage[COMMANDS_STORAGE_KEY]) {
          storage[COMMANDS_STORAGE_KEY].commands = commands;
        }
      }
    }, [editor, commands]);

    // keep mention items storage in sync with the latest users/roles from the store
    useEffect(() => {
      if (editor) {
        const storage = editor.storage as unknown as Record<
          string,
          { items?: TMentionSuggestionItem[] }
        >;

        if (storage[MENTION_STORAGE_KEY]) {
          storage[MENTION_STORAGE_KEY].items = mentionItems;
        }
      }
    }, [editor, mentionItems]);

    useEffect(() => {
      if (editor && value !== undefined) {
        const normalizedValue = canonicalizeMessageEmojiHtml(value);
        const currentContent = editor.getHTML();

        // only update if content is actually different to avoid cursor jumping
        if (currentContent !== normalizedValue) {
          editor.commands.setContent(normalizedValue);
        }
      }
    }, [editor, value]);

    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled);
      }
    }, [editor, disabled]);

    // Measure if content overflows (more than ~3 lines) when collapsed
    useLayoutEffect(() => {
      if (isExpanded) return;
      const wrapper = editorWrapperRef.current;
      const el = wrapper?.firstElementChild as HTMLElement | null;
      if (el) {
        setHasOverflow(el.scrollHeight > el.clientHeight);
      }
    }, [value, isExpanded]);

    const showExpandButton = hasOverflow || isExpanded;

    return (
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <div
          ref={editorWrapperRef}
          className="relative flex min-w-0 flex-1"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          <EditorContent
            editor={editor}
            className={`tiptap relative min-h-9 w-full overflow-auto rounded-lg border border-[#314055] bg-[#101926] px-2 py-1.5 text-[#d7e2f0] transition-[border-color,background-color,box-shadow] duration-200 focus-within:border-[#4677b8] focus-within:bg-[#162132] focus-within:shadow-[0_0_0_3px_rgba(70,119,184,0.16)] [&_.ProseMirror:focus]:outline-none ${
              isExpanded ? 'max-h-80' : 'max-h-20'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          />
          {showExpandButton && (isHovering || isFocused) && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute -top-1 left-1/2 h-5 w-8 shrink-0 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#314055] bg-[#172231] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#223146] hover:text-white"
              onClick={() => setIsExpanded((e) => !e)}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        <EmojiPicker
          onEmojiSelect={handleEmojiSelect}
          onGifSelect={handleGifSelect}
          closeOnEmojiSelect={false}
        >
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="h-8 w-8 rounded-lg border border-[#314055] !bg-[#172231] text-[#8fa2bb] hover:border-[#3d516b] hover:!bg-[#223146] hover:text-white"
          >
            <Smile className="h-5 w-5" />
          </Button>
        </EmojiPicker>
      </div>
    );
  }
);

export { TiptapInput };

