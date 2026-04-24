import { PaginatedTable } from '@/components/paginated-table';
import type { TJoinedInvite } from '@opencord/shared';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TableInvite } from './table-invite';

type TInvitesTableProps = {
  invites: TJoinedInvite[];
  refetch: () => void;
};

const InvitesTable = memo(({ invites, refetch }: TInvitesTableProps) => {
  const { t } = useTranslation('settings');
  const searchFilter = useCallback(
    (invite: TJoinedInvite, searchTerm: string) => {
      const query = searchTerm.toLowerCase();

      return (
        invite.code.toLowerCase().includes(query) ||
        invite.creator.name.toLowerCase().includes(query)
      );
    },
    []
  );

  return (
    <PaginatedTable
      items={invites}
      renderRow={(invite) => (
        <TableInvite key={invite.id} invite={invite} refetch={refetch} />
      )}
      searchFilter={searchFilter}
      headerColumns={
        <>
          <div className="min-w-0 truncate">{t('invitesCodeCol')}</div>
          <div className="min-w-0 truncate">{t('invitesRoleCol')}</div>
          <div className="min-w-0 truncate">{t('invitesCreatorCol')}</div>
          <div className="min-w-0 truncate">{t('invitesUsesCol')}</div>
          <div className="min-w-0 truncate">{t('invitesExpiresCol')}</div>
          <div className="min-w-0 truncate">{t('invitesCreatedCol')}</div>
          <div className="min-w-0 truncate">{t('invitesStatusCol')}</div>
          <div className="min-w-0 truncate text-center">{t('invitesActionsCol')}</div>
        </>
      }
      gridCols="grid-cols-[minmax(220px,1.3fr)_minmax(110px,0.75fr)_minmax(120px,0.75fr)_minmax(110px,0.7fr)_minmax(110px,0.8fr)_minmax(120px,0.9fr)_minmax(100px,0.7fr)_70px]"
      itemsPerPage={8}
      searchPlaceholder={t('searchInvitesPlaceholder')}
      emptyMessage={t('noInvitesFound')}
    />
  );
});

export { InvitesTable };

