import { MentionChip } from '@/components/mention-chip';
import { Node } from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps
} from '@tiptap/react';
import { memo } from 'react';

const MentionNodeView = memo(({ node }: NodeViewProps) => (
  <NodeViewWrapper as="span" className="mention-inline">
    <MentionChip
      kind={node.attrs.kind}
      userId={
        node.attrs.userId != null ? Number(node.attrs.userId) : undefined
      }
      roleId={
        node.attrs.roleId != null ? Number(node.attrs.roleId) : undefined
      }
      label={node.attrs.label}
    />
  </NodeViewWrapper>
));

export const MentionNode = Node.create({
  name: 'mention',
  group: 'inline',
  inline: true,
  atom: true,

  addNodeView() {
    return ReactNodeViewRenderer(MentionNodeView, { as: 'span' });
  },

  addAttributes() {
    return {
      kind: {
        default: 'user',
        parseHTML: (el) =>
          el.getAttribute('data-mention-kind')?.trim() ||
          (el.getAttribute('data-role-id') ? 'role' : 'user'),
        renderHTML: (attrs) =>
          attrs.kind ? { 'data-mention-kind': String(attrs.kind) } : {}
      },
      userId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-user-id')?.trim() || null,
        renderHTML: (attrs) =>
          attrs.userId != null ? { 'data-user-id': String(attrs.userId) } : {}
      },
      roleId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-role-id')?.trim() || null,
        renderHTML: (attrs) =>
          attrs.roleId != null ? { 'data-role-id': String(attrs.roleId) } : {}
      },
      label: {
        default: '',
        parseHTML: (el) =>
          (el as HTMLElement).textContent?.replace(/^@/, '') ?? '',
        renderHTML: () => ({})
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="mention"]',
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          const kind =
            el.getAttribute('data-mention-kind')?.trim() ||
            (el.getAttribute('data-role-id') ? 'role' : 'user');
          const userId = el.getAttribute('data-user-id')?.trim();
          const roleId = el.getAttribute('data-role-id')?.trim();
          const label = el.textContent?.replace(/^@/, '') ?? '';

          if (kind === 'everyone') {
            return { kind, label };
          }

          if (roleId) {
            return { kind: 'role', roleId, label };
          }

          return userId ? { kind: 'user', userId, label } : false;
        }
      }
    ];
  },

  renderHTML({ node }) {
    return [
      'span',
      {
        'data-type': 'mention',
        ...(node.attrs.kind ? { 'data-mention-kind': String(node.attrs.kind) } : {}),
        ...(node.attrs.userId != null
          ? { 'data-user-id': String(node.attrs.userId) }
          : {}),
        ...(node.attrs.roleId != null
          ? { 'data-role-id': String(node.attrs.roleId) }
          : {}),
        class: 'mention'
      },
      `@${node.attrs.label ?? ''}`
    ];
  }
});
