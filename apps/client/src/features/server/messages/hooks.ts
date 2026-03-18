import type { IRootState } from '@/features/store';
import { getTRPCClient } from '@/lib/trpc';
import { DEFAULT_MESSAGES_LIMIT, type TJoinedMessage } from '@opencord/shared';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useSelector } from 'react-redux';
import {
  addMessages,
  addThreadMessages,
  clearMessages,
  compactMessagesWindow,
  clearThreadMessages
} from './actions';
import {
  findMessageElement,
  highlightMessageElement,
  waitForMessageElement
} from './helpers';
import {
  messagesByChannelIdSelector,
  parentMessageByIdSelector,
  threadMessagesByParentIdSelector
} from './selectors';

export const useMessagesByChannelId = (channelId: number) =>
  useSelector((state: IRootState) =>
    messagesByChannelIdSelector(state, channelId)
  );

const useGroupedMessages = (messages: TJoinedMessage[]) =>
  useMemo(() => {
    const grouped = messages.reduce((acc, message) => {
      const last = acc[acc.length - 1];

      if (!last) return [[message]];

      const lastMessage = last[last.length - 1];

      if (lastMessage.userId === message.userId) {
        const lastDate = lastMessage.createdAt;
        const currentDate = message.createdAt;
        const timeDifference = Math.abs(currentDate - lastDate) / 1000 / 60;

        if (timeDifference < 1) {
          last.push(message);
          return acc;
        }
      }

      return [...acc, [message]];
    }, [] as TJoinedMessage[][]);

    return grouped;
  }, [messages]);

type TFetchPage = (
  cursor: number | null
) => Promise<{ nextCursor: number | null }>;

// fetch a page of channel messages from the server
const fetchChannelMessagesPage = async (input: {
  channelId: number;
  cursor: number | null;
  limit: number;
  targetMessageId?: number;
}) => {
  const trpcClient = getTRPCClient();

  return trpcClient.messages.get.query(input);
};

// reverse (newest-first -> oldest-first) and store messages
const storeChannelMessages = (
  channelId: number,
  rawPage: TJoinedMessage[],
  opts?: { prepend?: boolean }
) => {
  const page = [...rawPage].reverse();

  addMessages(channelId, page, opts);
};

const usePaginatedMessages = (
  messages: TJoinedMessage[],
  fetchPage: TFetchPage,
  options?: { initialLoading?: boolean }
) => {
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(
    options?.initialLoading ?? messages.length === 0
  );
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchMessages = useCallback(
    async (cursorToFetch: number | null) => {
      setFetching(true);

      try {
        const { nextCursor } = await fetchPage(cursorToFetch);

        setCursor(nextCursor);
        setHasMore(nextCursor !== null);
      } finally {
        setFetching(false);
        setLoading(false);
      }
    },
    [fetchPage]
  );

  const loadMore = useCallback(async () => {
    if (fetching || !hasMore) return;

    await fetchMessages(cursor);
  }, [fetching, hasMore, cursor, fetchMessages]);

  const isEmpty = useMemo(
    () => !messages.length && !fetching,
    [messages.length, fetching]
  );

  const groupedMessages = useGroupedMessages(messages);

  const reset = useCallback(() => {
    setCursor(null);
    setHasMore(true);
    setLoading(true);
  }, []);

  return {
    fetching,
    loading,
    hasMore,
    messages,
    loadMore,
    cursor,
    groupedMessages,
    isEmpty,
    fetchMessages,
    reset
  };
};

export const useMessages = (channelId: number) => {
  const messages = useMessagesByChannelId(channelId);
  const inited = useRef(false);
  const loadingMoreRef = useRef(false);
  const currentWindowNewestIdRef = useRef<number | null>(null);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [historyAnchorMessageId, setHistoryAnchorMessageId] = useState<
    number | null
  >(null);

  const CURRENT_MESSAGES_LIMIT = 50;
  const HISTORY_MESSAGES_LIMIT = 50;
  const HISTORY_SHIFT_STEP = 25;

  const groupedMessages = useGroupedMessages(messages);

  useLayoutEffect(() => {
    if (isHistoryMode) {
      return;
    }

    if (messages.length > CURRENT_MESSAGES_LIMIT) {
      compactMessagesWindow(channelId, CURRENT_MESSAGES_LIMIT);
    }
  }, [channelId, isHistoryMode, messages.length, CURRENT_MESSAGES_LIMIT]);

  const fetchAndStore = useCallback(
    async ({
      cursorToFetch,
      limit,
      targetMessageId
    }: {
      cursorToFetch: number | null;
      limit: number;
      targetMessageId?: number;
    }) => {
      const { messages: rawPage, nextCursor } = await fetchChannelMessagesPage({
        channelId,
        cursor: cursorToFetch,
        limit,
        targetMessageId
      });

      const pageAsc = [...rawPage].reverse();

      storeChannelMessages(channelId, rawPage, {
        prepend: cursorToFetch !== null
      });

      if (rawPage.length > 0 && !targetMessageId) {
        const newestFromPage = rawPage[0]!.id;
        currentWindowNewestIdRef.current = Math.max(
          currentWindowNewestIdRef.current ?? 0,
          newestFromPage
        );
      }

      setCursor(nextCursor);
      setHasMore(nextCursor !== null);

      return { nextCursor, page: pageAsc };
    },
    [channelId]
  );

  const loadCurrentWindow = useCallback(async () => {
    clearMessages(channelId);
    setCursor(null);
    setHasMore(true);

    await fetchAndStore({
      cursorToFetch: null,
      limit: CURRENT_MESSAGES_LIMIT
    });
  }, [channelId, fetchAndStore, CURRENT_MESSAGES_LIMIT]);

  const enterHistoryMode = useCallback(
    async (anchorMessageId: number) => {
      setIsHistoryMode(true);
      setHistoryAnchorMessageId(anchorMessageId);
      clearMessages(channelId);
      setCursor(null);
      setHasMore(true);

      await fetchAndStore({
        cursorToFetch: null,
        limit: HISTORY_MESSAGES_LIMIT,
        targetMessageId: anchorMessageId
      });

      const anchorElement = await waitForMessageElement(anchorMessageId);

      if (anchorElement) {
        anchorElement.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    },
    [channelId, fetchAndStore]
  );

  const exitHistoryMode = useCallback(async () => {
    if (!isHistoryMode) {
      return;
    }

    setFetching(true);

    try {
      await loadCurrentWindow();
      setIsHistoryMode(false);
      setHistoryAnchorMessageId(null);
    } finally {
      setFetching(false);
      setLoading(false);
    }
  }, [isHistoryMode, loadCurrentWindow]);

  const moveHistoryForwardOrExit = useCallback(async () => {
    if (!isHistoryMode || loadingMoreRef.current) {
      return;
    }

    const middleLoaded = messages[Math.floor(messages.length / 2)]?.id;
    const newestLoaded = messages[messages.length - 1]?.id;

    if (!middleLoaded || !newestLoaded) {
      return;
    }

    const currentNewest = currentWindowNewestIdRef.current;

    if (!currentNewest) {
      await exitHistoryMode();
      return;
    }

    if (newestLoaded >= currentNewest) {
      await exitHistoryMode();
      return;
    }

    const forwardAnchor = Math.min(
      middleLoaded + HISTORY_SHIFT_STEP,
      currentNewest
    );

    if (forwardAnchor <= middleLoaded) {
      await exitHistoryMode();
      return;
    }

    loadingMoreRef.current = true;
    setFetching(true);

    try {
      clearMessages(channelId);
      setHistoryAnchorMessageId(forwardAnchor);
      setCursor(null);
      setHasMore(true);

      const { page } = await fetchAndStore({
        cursorToFetch: null,
        limit: HISTORY_MESSAGES_LIMIT,
        targetMessageId: forwardAnchor
      });

      const middleMessage = page[Math.floor(page.length / 2)];

      if (middleMessage) {
        const element = await waitForMessageElement(middleMessage.id);

        if (element) {
          element.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
      }
    } finally {
      loadingMoreRef.current = false;
      setFetching(false);
      setLoading(false);
    }
  }, [
    isHistoryMode,
    messages,
    exitHistoryMode,
    channelId,
    fetchAndStore,
    HISTORY_MESSAGES_LIMIT,
    HISTORY_SHIFT_STEP
  ]);

  const loadMore = useCallback(async () => {
    if (fetching || loadingMoreRef.current) {
      return;
    }

    if (!isHistoryMode) {
      const oldestLoaded = messages[0];

      if (!oldestLoaded) {
        return;
      }

      loadingMoreRef.current = true;
      setFetching(true);

      try {
        await enterHistoryMode(oldestLoaded.id);
        return { preserveScroll: false };
      } finally {
        loadingMoreRef.current = false;
        setFetching(false);
        setLoading(false);
      }
    }

    if (!hasMore) {
      return;
    }

    loadingMoreRef.current = true;
    setFetching(true);

    try {
      // history window shift: load around current oldest message (-25/+25)
      const historyShiftAnchorId = messages[0]?.id ?? historyAnchorMessageId ?? null;

      if (!historyShiftAnchorId) {
        return { preserveScroll: false };
      }

      clearMessages(channelId);
      setHistoryAnchorMessageId(historyShiftAnchorId);

      const { page } = await fetchAndStore({
        cursorToFetch: null,
        limit: HISTORY_MESSAGES_LIMIT,
        targetMessageId: historyShiftAnchorId
      });

      const middleMessage = page[Math.floor(page.length / 2)];

      if (middleMessage) {
        const element = await waitForMessageElement(middleMessage.id);

        if (element) {
          element.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
      }

      return { preserveScroll: false };
    } finally {
      loadingMoreRef.current = false;
      setFetching(false);
      setLoading(false);
    }
  }, [
    enterHistoryMode,
    fetchAndStore,
    fetching,
    hasMore,
    isHistoryMode,
    messages,
    channelId
  ]);

  useEffect(() => {
    if (inited.current) return;

    setFetching(true);

    fetchAndStore({
      cursorToFetch: null,
      limit: CURRENT_MESSAGES_LIMIT
    }).finally(() => {
      setFetching(false);
      setLoading(false);
    });

    inited.current = true;
  }, [fetchAndStore]);

  const scrollToMessage = useCallback(
    async (messageId: number, highlightTime = 4000) => {
      // check if the message is already rendered in the messages container
      const existing = findMessageElement(messageId);

      if (existing) {
        highlightMessageElement(existing, highlightTime);

        return;
      }

      setFetching(true);

      try {
        setIsHistoryMode(true);
        setHistoryAnchorMessageId(messageId);
        clearMessages(channelId);
        setCursor(null);
        setHasMore(true);

        await fetchAndStore({
          cursorToFetch: null,
          limit: HISTORY_MESSAGES_LIMIT,
          targetMessageId: messageId
        });
      } finally {
        setFetching(false);
        setLoading(false);
      }

      const element = await waitForMessageElement(messageId);

      if (element) {
        highlightMessageElement(element, highlightTime);
      }
    },
    [channelId, fetchAndStore]
  );

  return {
    messages,
    groupedMessages,
    fetching,
    loading,
    hasMore,
    cursor,
    loadMore,
    scrollToMessage,
    isHistoryMode,
    historyAnchorMessageId,
    exitHistoryMode,
    moveHistoryForwardOrExit
  };
};

export const useThreadMessagesByParentId = (parentMessageId: number) =>
  useSelector((state: IRootState) =>
    threadMessagesByParentIdSelector(state, parentMessageId)
  );

export const useThreadMessages = (parentMessageId: number) => {
  const messages = useThreadMessagesByParentId(parentMessageId);

  const fetchPage = useCallback(
    async (cursorToFetch: number | null) => {
      const trpcClient = getTRPCClient();

      const { messages: page, nextCursor } =
        await trpcClient.messages.getThread.query({
          parentMessageId,
          cursor: cursorToFetch,
          limit: DEFAULT_MESSAGES_LIMIT
        });

      addThreadMessages(parentMessageId, page);

      return { nextCursor };
    },
    [parentMessageId]
  );

  const paginated = usePaginatedMessages(messages, fetchPage, {
    initialLoading: true
  });

  // fetch fresh data every time the thread is opened
  useEffect(() => {
    clearThreadMessages(parentMessageId);
    paginated.reset();
    paginated.fetchMessages(null);
  }, [parentMessageId]); // eslint-disable-line react-hooks/exhaustive-deps

  return paginated;
};

export const useParentMessage = (
  messageId: number | undefined,
  channelId: number | undefined
) =>
  useSelector((state: IRootState) =>
    messageId && channelId
      ? parentMessageByIdSelector(state, messageId, channelId)
      : undefined
  );

