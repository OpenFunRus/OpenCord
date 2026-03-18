import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const TOASTER_CLASSNAMES: NonNullable<ToasterProps['toastOptions']>['classNames'] = {
  toast:
    'border border-[#314055] bg-[#182433] text-[#d7e2f0] shadow-[0_20px_48px_rgba(2,6,23,0.42)]',
  title: 'text-sm font-semibold text-white',
  description: 'text-xs text-[#9fb2c8]',
  closeButton:
    'border border-[#314055] bg-[#101926] text-[#8fa2bb] hover:bg-[#1b2940] hover:text-white',
  success: 'border-[#2f7a52] bg-[#152a22] text-[#d7f5e6]',
  error: 'border-[#a9485a] bg-[#2b1720] text-[#ffe0e6]',
  warning: 'border-[#9b6b2f] bg-[#2a2215] text-[#fff1d6]',
  info: 'border-[#2f7ad1] bg-[#162638] text-[#dbeafe]',
  loading: 'border-[#3d516b] bg-[#182433] text-[#d7e2f0]',
  default: 'border-[#314055] bg-[#182433] text-[#d7e2f0]',
  content: 'gap-1'
};

const Toaster = ({ toastOptions, style, ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      richColors
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...TOASTER_CLASSNAMES,
          ...toastOptions?.classNames
        }
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          ...style
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
