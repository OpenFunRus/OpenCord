import { t } from '../../utils/trpc';
import { addSpaceRoute } from './add-space';
import { deleteSpaceRoute } from './delete-space';
import { onSpacesSyncRoute } from './events';
import { syncSpacesRoute } from './sync';
import { updateSpaceRoute } from './update-space';

export const spacesRouter = t.router({
  add: addSpaceRoute,
  update: updateSpaceRoute,
  delete: deleteSpaceRoute,
  sync: syncSpacesRoute,
  onSync: onSpacesSyncRoute
});
