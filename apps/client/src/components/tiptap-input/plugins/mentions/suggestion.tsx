import { UserAvatar } from '@/components/user-avatar';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import i18n from '@/i18n';
import { computePosition, flip, offset, shift } from '@floating-ui/dom';
import { UserStatus, type TJoinedPublicUser } from '@opencord/shared';
import type { Editor } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import { AtSign, Shield } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState
} from 'react';

const MENTION_STORAGE_KEY = 'mentionUsers';

type TUserMentionSuggestionItem = {
  kind: 'user';
  id: number;
  label: string;
  user: TJoinedPublicUser;
};

type TRoleMentionSuggestionItem = {
  kind: 'role';
  id: number;
  label: string;
  color?: string | null;
};

type TEveryoneMentionSuggestionItem = {
  kind: 'everyone';
  id: 'everyone';
  label: string;
};

export type TMentionSuggestionItem =
  | TUserMentionSuggestionItem
  | TRoleMentionSuggestionItem
  | TEveryoneMentionSuggestionItem;

const getMentionSearchTerms = (item: TMentionSuggestionItem) => {
  if (item.kind === 'user') {
    const displayName = getRenderedUsername(item.user).toLowerCase();
    const identity = item.user._identity?.toLowerCase().trim() ?? '';

    return { primary: displayName, secondary: identity };
  }

  return { primary: item.label.toLowerCase(), secondary: '' };
};

const getStatusDotClassName = (status?: UserStatus) => {
  switch (status) {
    case UserStatus.ONLINE:
      return 'bg-emerald-400';
    case UserStatus.IDLE:
      return 'bg-amber-300';
    default:
      return 'bg-slate-500';
  }
};

type TUserListProps = {
  items: TMentionSuggestionItem[];
  onSelect: (item: TMentionSuggestionItem) => void;
};

export type TUserListRef = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

const UserList = forwardRef<TUserListRef, TUserListProps>(
  ({ items, onSelect }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    const selectItem = useCallback(
      (index: number) => items[index] && onSelect(items[index]),
      [items, onSelect]
    );

    const onKeyDown = useCallback(
      (e: KeyboardEvent): boolean => {
        if (items.length === 0) return false;

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((i) => (i <= 0 ? items.length - 1 : i - 1));

          return true;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((i) => (i >= items.length - 1 ? 0 : i + 1));

          return true;
        }

        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          selectItem(selectedIndex);

          return true;
        }

        if (e.key === 'Escape') return false;

        return false;
      },
      [items, selectItem, selectedIndex]
    );

    useImperativeHandle(ref, () => ({ onKeyDown }));

    if (items.length === 0) return null;

    return (
      <div
        className="z-50 max-h-72 min-w-[17rem] max-w-96 overflow-y-auto rounded-xl border border-[#314055] bg-[#101926]/98 p-1.5 text-[#d7e2f0] shadow-[0_18px_48px_rgba(2,6,23,0.55)] backdrop-blur-md"
        role="listbox"
        aria-label={i18n.t('common:mentionUser')}
        data-editor-suggestion="mention"
        data-editor-suggestion-active="true"
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={index === selectedIndex}
            className={`flex w-full cursor-default items-center gap-3 rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors ${
              index === selectedIndex
                ? 'bg-[#223146] text-white'
                : 'text-[#d7e2f0] hover:bg-[#1b2940] hover:text-white'
            }`}
            onClick={() => onSelect(item)}
          >
            {item.kind === 'user' ? (
              <div className="relative shrink-0">
                <UserAvatar userId={item.id} className="h-8 w-8 shrink-0" />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#101926] ${getStatusDotClassName(item.user.status)}`}
                />
              </div>
            ) : (
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                  item.kind === 'everyone'
                    ? 'border-[#8a6a18]/55 bg-[#5f4708]/30 text-[#ffd66b]'
                    : 'border-[#5b4aa6]/45 bg-[#352a63]/28 text-[#c9b7ff]'
                }`}
              >
                {item.kind === 'everyone' ? (
                  <AtSign className="h-4 w-4" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{item.label}</div>
              {item.kind === 'user' &&
                item.user._identity &&
                item.user._identity.toLowerCase() !==
                  getRenderedUsername(item.user).toLowerCase() && (
                  <div className="truncate text-xs text-[#8fa2bb]">
                    @{item.user._identity}
                  </div>
                )}
            </div>
          </button>
        ))}
      </div>
    );
  }
);

const reposition = (component: ReactRenderer | null, clientRect: DOMRect) => {
  if (!component?.element) return;

  const virtual = { getBoundingClientRect: () => clientRect };

  computePosition(virtual, component.element, {
    placement: 'top-start',
    middleware: [offset(8), flip(), shift({ padding: 8 })]
  }).then((pos) => {
    if (component?.element)
      Object.assign(component.element.style, {
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        position: 'fixed',
        zIndex: '80'
      });
  });
};

const cleanup = (component: ReactRenderer | null) => {
  if (component?.element && document.body.contains(component.element)) {
    document.body.removeChild(component.element);
  }

  component?.destroy();
};

type TSuggestionProps = {
  editor: Editor;
  query: string;
  clientRect?: (() => DOMRect | null) | null;
  command: (item: TMentionSuggestionItem) => void;
};

const MentionSuggestion = {
  items: ({
    editor,
    query
  }: {
    editor: Editor;
    query: string;
  }): TMentionSuggestionItem[] => {
    const items: TMentionSuggestionItem[] =
      (
        editor.storage as unknown as Record<
          string,
          { items?: TMentionSuggestionItem[] }
        >
      )[MENTION_STORAGE_KEY]?.items ?? [];

    if (!query) return items.slice(0, 10);

    const q = query.toLowerCase();

    return items
      .filter((item) => {
        const { primary, secondary } = getMentionSearchTerms(item);

        return primary.includes(q) || secondary.includes(q);
      })
      .sort((a, b) => {
        const { primary: aName, secondary: aIdentity } =
          getMentionSearchTerms(a);
        const { primary: bName, secondary: bIdentity } =
          getMentionSearchTerms(b);

        const aS = aName.startsWith(q);
        const bS = bName.startsWith(q);
        const aIdentityStarts = aIdentity.startsWith(q);
        const bIdentityStarts = bIdentity.startsWith(q);

        if (aS && !bS) return -1;
        if (!aS && bS) return 1;
        if (aIdentityStarts && !bIdentityStarts) return -1;
        if (!aIdentityStarts && bIdentityStarts) return 1;

        if (a.kind === 'everyone' && b.kind !== 'everyone') return -1;
        if (a.kind !== 'everyone' && b.kind === 'everyone') return 1;
        if (a.kind === 'role' && b.kind === 'user') return -1;
        if (a.kind === 'user' && b.kind === 'role') return 1;

        return aName.length - bName.length;
      })
      .slice(0, 10);
  },
  allowSpaces: false,
  render: () => {
    let component: ReactRenderer | null = null;
    return {
      onStart(props: TSuggestionProps) {
        const items = MentionSuggestion.items({
          editor: props.editor,
          query: props.query
        });
        const onSelect = (item: TMentionSuggestionItem) => {
          props.command(item);

          cleanup(component);

          component = null;
        };
        component = new ReactRenderer(UserList, {
          props: { items, onSelect },
          editor: props.editor
        });

        Object.assign(component.element.style, {
          position: 'fixed',
          left: '0px',
          top: '0px',
          zIndex: '80'
        });

        document.body.appendChild(component.element);

        const rect = props.clientRect?.();

        if (rect) {
          reposition(component, rect);
        }
      },
      onUpdate(props: TSuggestionProps) {
        const items = MentionSuggestion.items({
          editor: props.editor,
          query: props.query
        });
        component?.updateProps({
          items,
          onSelect: (item: TMentionSuggestionItem) => {
            props.command(item);

            cleanup(component);

            component = null;
          }
        });
        const rect = props.clientRect?.();

        if (rect) {
          reposition(component, rect);
        }
      },
      onKeyDown(props: { event: KeyboardEvent }) {
        const ref = component?.ref as TUserListRef | undefined;

        return ref?.onKeyDown(props.event) ?? false;
      },
      onExit() {
        cleanup(component);
        component = null;
      }
    };
  }
};

export { MENTION_STORAGE_KEY, MentionSuggestion };

