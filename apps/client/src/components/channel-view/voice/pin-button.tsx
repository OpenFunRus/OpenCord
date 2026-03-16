import { PinActionButton } from '@/components/pin-action-button';
import { memo } from 'react';

type TPinButtonProps = {
  isPinned: boolean;
  handlePinToggle: () => void;
};

const PinButton = memo(({ isPinned, handlePinToggle }: TPinButtonProps) => {
  return (
    <PinActionButton
      active={isPinned}
      onClick={handlePinToggle}
      title={isPinned ? 'Unpin' : 'Pin'}
    />
  );
});

export { PinButton };
