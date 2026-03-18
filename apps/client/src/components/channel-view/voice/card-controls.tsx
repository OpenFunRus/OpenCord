import { memo } from 'react';

type TCardControlsProps = {
  children?: React.ReactNode;
};

const CardControls = memo(({ children }: TCardControlsProps) => {
  return (
    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-lg border border-[#314055] bg-[#172231]/92 p-1 shadow-[0_12px_32px_rgba(2,6,23,0.38)] backdrop-blur-sm transition-opacity max-sm:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
      {children}
    </div>
  );
});

export { CardControls };
