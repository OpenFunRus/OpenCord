import { MentionChip } from '@/components/mention-chip';
import { memo } from 'react';

type TMentionOverrideProps = {
  kind?: 'user' | 'role' | 'everyone';
  userId?: number;
  roleId?: number;
  label?: string;
};

const MentionOverride = memo(({ kind, userId, roleId, label }: TMentionOverrideProps) => (
  <MentionChip kind={kind} userId={userId} roleId={roleId} label={label} />
));

export { MentionOverride };
