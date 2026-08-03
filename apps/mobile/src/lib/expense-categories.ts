export const EXPENSE_CATEGORIES = [
  { value: 'food', icon: 'silverware-fork-knife', label: 'Food' },
  { value: 'flights', icon: 'airplane', label: 'Flights' },
  { value: 'transport', icon: 'train', label: 'Transport' },
  { value: 'shopping', icon: 'shopping', label: 'Shopping' },
  { value: 'entertainment', icon: 'ticket', label: 'Fun' },
  { value: 'activities', icon: 'compass', label: 'Activities & Tours' },
  { value: 'accommodation', icon: 'bed', label: 'Hotel' },
  { value: 'other', icon: 'dots-horizontal', label: 'Other' },
];

export const getCategoryColor = (category: string, theme: any) => {
  switch (category) {
    case 'food': return '#ffb3ba';
    case 'flights': return '#bae1ff';
    case 'transport': return '#94BBC9';
    case 'shopping': return '#dcb2c2';
    case 'entertainment': return '#d1bbe6';
    case 'activities': return '#acc4e2';
    case 'accommodation': return '#A4DAC4';
    case 'other': return '#DAC7A7';
    case 'remaining': return '#e0b8a4';
    default: return theme.colors.outline;
  }
};

export const getCoordinatesForPercent = (percent: number) => {
  const x = Math.cos(2 * Math.PI * percent - Math.PI / 2);
  const y = Math.sin(2 * Math.PI * percent - Math.PI / 2);
  return [x, y];
};
