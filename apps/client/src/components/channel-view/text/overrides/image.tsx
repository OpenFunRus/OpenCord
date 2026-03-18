import { FullScreenImage } from '@/components/fullscreen-image/content';
import { Skeleton } from '@opencord/ui';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
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
    if (thumbnailReady) {
      return;
    }

    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (cancelled) {
        return;
      }

      setThumbnailReady(true);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };

    image.onerror = () => {
      if (cancelled) {
        return;
      }

      retryTimeoutRef.current = setTimeout(() => {
        setThumbnailAttempt((prev) => prev + 1);
      }, 1200);
    };

    image.src = thumbnailSrc;

    return () => {
      cancelled = true;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      image.onload = null;
      image.onerror = null;
    };
  }, [thumbnailReady, thumbnailSrc]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return (
    <OverrideLayout>
      {thumbnailReady ? (
        <FullScreenImage
          src={thumbnailSrc}
          fullscreenSrc={src}
          alt={alt}
          className="max-w-full max-h-75 object-contain object-left w-fit"
          crossOrigin="anonymous"
        />
      ) : (
        <div className="w-fit">
          <Skeleton className="h-75 w-75 max-w-full" />
        </div>
      )}

      <LinkOverride link={src} label={t('openInNewTab')} />
    </OverrideLayout>
  );
});

export { ImageOverride };

