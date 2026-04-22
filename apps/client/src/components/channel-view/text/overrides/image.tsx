import { FullScreenImage } from '@/components/fullscreen-image/content';
import { cn } from '@/lib/utils';
import { Skeleton } from '@opencord/ui';
import { Download, Trash } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TImageOverrideProps = {
  src: string;
  alt?: string;
  title?: string;
  onRemove?: () => void;
  mediaClassName?: string;
};

const ImageOverride = memo(({ src, alt, onRemove, mediaClassName }: TImageOverrideProps) => {
  const { t } = useTranslation('common');
  const usesServerThumbnail = useMemo(() => {
    try {
      const parsed = new URL(src, window.location.href);
      return parsed.origin === window.location.origin;
    } catch {
      return false;
    }
  }, [src]);
  const thumbnailBaseSrc = useMemo(() => {
    if (!usesServerThumbnail) {
      return src;
    }

    const parsed = new URL(src, window.location.href);
    parsed.searchParams.set('thumb', '1');
    return parsed.toString();
  }, [src, usesServerThumbnail]);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [thumbnailAttempt, setThumbnailAttempt] = useState(0);
  const [thumbnailReady, setThumbnailReady] = useState(false);
  const thumbnailSrc = useMemo(() => {
    if (!usesServerThumbnail) {
      return thumbnailBaseSrc;
    }

    const parsed = new URL(thumbnailBaseSrc, window.location.href);
    parsed.searchParams.set('_thumbTry', String(thumbnailAttempt));
    return parsed.toString();
  }, [thumbnailAttempt, thumbnailBaseSrc, usesServerThumbnail]);

  useEffect(() => {
    setThumbnailAttempt(0);
    setThumbnailReady(false);
  }, [thumbnailBaseSrc]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const handleThumbnailLoad = useCallback(() => {
    setThumbnailReady(true);

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const handleThumbnailError = useCallback(() => {
    if (!usesServerThumbnail) {
      return;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = setTimeout(() => {
      setThumbnailAttempt((prev) => prev + 1);
    }, 1200);
  }, [usesServerThumbnail]);

  return (
    <div
      className={cn(
        'group relative h-[320px] w-full min-w-0 overflow-hidden',
        thumbnailReady ? 'border-transparent bg-transparent' : 'border border-[#2b3544] bg-[#101926]'
      )}
    >
      <div className="pointer-events-none absolute top-2 left-2 z-10 flex items-center gap-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
        <a
          href={src}
          download
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#314055] bg-[#172231]/92 text-[#d7e2f0] shadow-[0_12px_28px_rgba(2,6,23,0.35)] transition-colors hover:border-[#4a6280] hover:bg-[#1b2940]"
          title={t('download')}
          aria-label={t('download')}
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="pointer-events-none absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-[#314055] bg-[#172231]/92 text-[#d7e2f0] opacity-0 shadow-[0_12px_28px_rgba(2,6,23,0.35)] transition-[opacity,color,background-color,border-color] duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 hover:border-[#4a6280] hover:bg-[#1b2940]"
          title={t('deleteLabel')}
          aria-label={t('deleteLabel')}
        >
          <Trash className="h-4 w-4" />
        </button>
      )}
      <div className="relative h-full w-full min-w-0 overflow-hidden">
        {!thumbnailReady && (
          <div className="absolute inset-0 h-full w-full">
            <Skeleton className="h-full w-full rounded-none" />
          </div>
        )}
        <FullScreenImage
          src={thumbnailSrc}
          fullscreenSrc={src}
          alt={alt}
          fullscreenClassName="h-[80vh] w-auto max-w-[calc(100vw-2rem)] object-contain p-4"
          className={cn(
            'h-full w-full object-contain',
            thumbnailReady ? 'bg-transparent' : 'bg-[#101926]',
            mediaClassName,
            !thumbnailReady && 'opacity-0'
          )}
          crossOrigin="anonymous"
          loading="lazy"
          decoding="async"
          onLoad={handleThumbnailLoad}
          onError={handleThumbnailError}
        />
      </div>
    </div>
  );
});

export { ImageOverride };

