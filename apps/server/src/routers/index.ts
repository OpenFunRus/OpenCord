import { t } from '../utils/trpc';
import { categoriesRouter } from './categories';
import { channelsRouter } from './channels';
import { dmsRouter } from './dms';
import { filesRouter } from './files';
import { invitesRouter } from './invites';
import { messagesRouter } from './messages';
import { othersRouter } from './others';
import { pluginsRouter } from './plugins';
import { rolesRouter } from './roles';
import { spacesRouter } from './spaces';
import { usersRouter } from './users';
import { voiceRouter } from './voice';

const appRouter = t.router({
  others: othersRouter,
  messages: messagesRouter,
  users: usersRouter,
  channels: channelsRouter,
  dms: dmsRouter,
  files: filesRouter,
  roles: rolesRouter,
  spaces: spacesRouter,
  invites: invitesRouter,
  voice: voiceRouter,
  categories: categoriesRouter,
  plugins: pluginsRouter
});

type AppRouter = typeof appRouter;

export { appRouter };
export type { AppRouter };
