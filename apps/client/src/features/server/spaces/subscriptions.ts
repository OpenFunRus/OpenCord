import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import { applySpacesSync } from './actions';

const subscribeToSpaces = () => {
  const trpc = getTRPCClient();

  const syncVisibleStructure = async () => {
    const data = await trpc.spaces.sync.query();
    applySpacesSync(data);
  };

  const onSpacesSyncSub = trpc.spaces.onSync.subscribe(undefined, {
    onData: async () => {
      logDebug('[EVENTS] spaces.onSync');
      await syncVisibleStructure();
    },
    onError: (err) => console.error('onSpacesSync subscription error:', err)
  });

  return () => {
    onSpacesSyncSub.unsubscribe();
  };
};

export { subscribeToSpaces };
