import type { IRootState } from '@/features/store';
import { getTRPCClient } from '@/lib/trpc';
import { DEFAULT_MESSAGES_LIMIT, type TJoinedMessage } from '@opencord/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  addMessages,
  addThreadMessages,
  clearMessages,
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
  const [currentPagesLoaded, setCurrentPagesLoaded] = useState(1);
  const [historyAnchorMessageId, setHistoryAnchorMessageId] = useState<
    number | null
  >(null);

  const CURRENT_MESSAGES_LIMIT = 50;
  const MAX_CURRENT_PAGES = 3;
  const HISTORY_MESSAGES_LIMIT = 100;

  const groupedMessages = useGroupedMessages(messages);

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

    let nextCursor: number | null = null;
    let hasMorePages = true;

    for (let i = 0; i < 3; i++) {
      const { messages: rawPage, nextCursor: newCursor } =
        await fetchChannelMessagesPage({
          channelId,
          cursor: nextCursor,
          limit: CURRENT_MESSAGES_LIMIT
        });

      storeChannelMessages(channelId, rawPage, {
        prepend: nextCursor !== null
      });

      nextCursor = newCursor;
      hasMorePages = newCursor !== null;

      if (!hasMorePages) {
        break;
      }
    }

    setCursor(nextCursor);
    setHasMore(hasMorePages);
    setCurrentPagesLoaded(MAX_CURRENT_PAGES);
  }, [channelId]);

  const enterHistoryMode = useCallback(
    async (anchorMessageId: number) => {
      setIsHistoryMode(true);
      setCurrentPagesLoaded(0);
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
      setCurrentPagesLoaded(MAX_CURRENT_PAGES);
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

    const forwardAnchor = Math.min(middleLoaded + 50, currentNewest);

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
    HISTORY_MESSAGES_LIMIT
  ]);

  const loadMore = useCallback(async () => {
    if (fetching || !hasMore || loadingMoreRef.current) {
      return;
    }

    loadingMoreRef.current = true;

    // keep a lightweight current-chat window:
    // 3 pages x 50 messages, then switch to history mode
    if (!isHistoryMode && currentPagesLoaded >= MAX_CURRENT_PAGES) {
      const oldestLoaded = messages[0];

      if (!oldestLoaded) {
        return;
      }

      const historyAnchorMessageId =
        cursor && cursor > 1 ? cursor - 1 : oldestLoaded.id;

      setFetching(true);

      try {
        await enterHistoryMode(historyAnchorMessageId);
        return { preserveScroll: false };
      } finally {
        loadingMoreRef.current = false;
        setFetching(false);
        setLoading(false);
      }
    }

    setFetching(true);

    try {
      if (isHistoryMode) {
        // history window shift: keep 50 overlap from previous page + 50 older
        const historyShiftAnchorId =
          messages[0]?.id ?? historyAnchorMessageId ?? null;

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

        // magnet to center of the newly loaded history chunk
        const middleMessage = page[Math.floor(page.length / 2)];

        if (middleMessage) {
          const element = await waitForMessageElement(middleMessage.id);

          if (element) {
            element.scrollIntoView({ behavior: 'auto', block: 'center' });
          }
        }

        return { preserveScroll: false };
      }

      await fetchAndStore({
        cursorToFetch: cursor,
        limit: CURRENT_MESSAGES_LIMIT
      });

      setCurrentPagesLoaded((prev) => prev + 1);

      return { preserveScroll: true };
    } finally {
      loadingMoreRef.current = false;
      setFetching(false);
      setLoading(false);
    }
  }, [
    cursor,
    enterHistoryMode,
    fetchAndStore,
    fetching,
    hasMore,
    currentPagesLoaded,
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
      setCurrentPagesLoaded(1);
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
        setCurrentPagesLoaded(0);
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

