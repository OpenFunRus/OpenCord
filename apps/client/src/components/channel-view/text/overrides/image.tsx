import { FullScreenImage } from '@/components/fullscreen-image/content';
import { cn } from '@/lib/utils';
import { Skeleton } from '@opencord/ui';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OverrideLayout } from './layout';
import { LinkOverride } from './link';

type TImageOverrideProps = {
  src: string;
  alt?: string;
  title?: string;
};

const ImageOverride = memo(({ src, alt }: TImageOverrideProps) => {
  const { t } = useTranslation('common');
  const thumbnailBaseSrc = useMemo(() => {
    if (!URL.canParse(src)) {
      return src;
    }

    const parsed = new URL(src);
    parsed.searchParams.set('thumb', '1');
    return parsed.toString();
  }, [src]);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [thumbnailAttempt, setThumbnailAttempt] = useState(0);
  const [thumbnailReady, setThumbnailReady] = useState(false);
  const thumbnailSrc = useMemo(() => {
    if (!URL.canParse(thumbnailBaseSrc)) {
      return thumbnailBaseSrc;
    }

    const parsed = new URL(thumbnailBaseSrc);
    parsed.searchParams.set('_thumbTry', String(thumbnailAttempt));
    return parsed.toString();
  }, [thumbnailAttempt, thumbnailBaseSrc]);

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
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = setTimeout(() => {
      setThumbnailAttempt((prev) => prev + 1);
    }, 1200);
  }, []);

  return (
    <OverrideLayout>
      <div className="relative min-h-75 min-w-75 w-fit max-w-full">
        {!thumbnailReady && (
          <div className="absolute inset-0">
            <Skeleton className="h-75 w-75 max-w-full" />
          </div>
        )}
        <FullScreenImage
          src={thumbnailSrc}
          fullscreenSrc={src}
          alt={alt}
          className={cn(
            'max-h-75 max-w-full object-contain object-left w-fit',
            !thumbnailReady && 'opacity-0'
          )}
          crossOrigin="anonymous"
          loading="lazy"
          decoding="async"
          onLoad={handleThumbnailLoad}
          onError={handleThumbnailError}
        />
      </div>

      <LinkOverride link={src} label={t('openInNewTab')} />
    </OverrideLayout>
  );
});

export { ImageOverride };

