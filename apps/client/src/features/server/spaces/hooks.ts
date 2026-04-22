import type { IRootState } from '@/features/store';
import { useSelector } from 'react-redux';
import {
  selectedSpaceIdSelector,
  selectedSpaceSelector,
  spaceByIdSelector,
  spacesSelector
} from './selectors';

export const useSpaces = () => useSelector(spacesSelector);

export const useSelectedSpaceId = () => useSelector(selectedSpaceIdSelector);

export const useSelectedSpace = () => useSelector(selectedSpaceSelector);

export const useSpaceById = (spaceId: number) =>
  useSelector((state: IRootState) => spaceByIdSelector(state, spaceId));
