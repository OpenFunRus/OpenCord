import { getAvatarFallbackStyle } from '@/helpers/get-avatar-fallback-style';
import { getFileUrl } from '@/helpers/get-file-url';
import { getInitialsFromName } from '@/helpers/get-initials-from-name';
import { cn } from '@/lib/utils';
import type { TFile } from '@opencord/shared';
import { memo, useEffect, useMemo, useState } from 'react';

type TSpaceAvatarProps = {
  name: string;
  avatar?: TFile | null;
  src?: string;
  className?: string;
};

const SpaceAvatar = memo(({ name, avatar, src, className }: TSpaceAvatarProps) => {
  const fallbackStyle = getAvatarFallbackStyle(name);
  const imageSrc = useMemo(() => src ?? getFileUrl(avatar), [avatar, src]);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageSrc]);

  return (
    <div
      className={cn(
        'flex h-12 w-12 items-center justify-center overflow-hidden rounded-full',
        className
      )}
      style={!imageSrc || imageFailed ? fallbackStyle : undefined}
    >
      {imageSrc && !imageFailed ? (
        <img
          src={imageSrc}
          alt={name}
          className="h-full w-full object-cover"
          draggable={false}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="text-sm font-semibold text-[#f8fafc]">
          {getInitialsFromName(name)}
        </span>
      )}
    </div>
  );
});

export { SpaceAvatar };
