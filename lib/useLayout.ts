import { useWindowDimensions } from 'react-native';
import { layout } from './theme';

export interface LayoutInfo {
  width: number;
  /** Desktop / tablet: side rail navigation and multi-column dashboards. */
  wide: boolean;
  /** 1 = phone, 2 = tablet / small desktop, 3 = large desktop. */
  columns: 1 | 2 | 3;
  narrow: boolean;
}

export function useLayout(): LayoutInfo {
  const { width } = useWindowDimensions();
  const wide = width >= layout.wideBreakpoint;
  const columns = width >= layout.tripleBreakpoint ? 3 : wide ? 2 : 1;
  return { width, wide, columns, narrow: width < 380 };
}
