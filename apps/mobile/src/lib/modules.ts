import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { 
  TipCalcIcon, 
  VatRefundIcon, 
  BudgetIcon, 
  AtmExchangeIcon, 
  SizeGuideIcon,
  TimeZoneIcon,
  LocalInfoIcon,
  BasicPhrasesIcon,
} from '../components/ModuleIcons';
import { tokens } from '../theme/tokens';

export type RedesignModuleProps = {
  id: string;
  title: string;
  category: string;
  CustomIcon?: React.ElementType<{ size?: number; color?: string }>;
  fallbackIcon: keyof typeof MaterialIcons.glyphMap;
  route: string;
  colSpan?: number;
  backgroundColor: string;
  iconShapeColor: string;
  color: string;
  isPremium?: boolean;
};

export const FINANCE_MODULES: RedesignModuleProps[] = [
  { id: 'tipCalculator', title: 'Tip Calculator', category: 'Finance', CustomIcon: TipCalcIcon, fallbackIcon: 'calculate', route: '/modules/tip-calculator', backgroundColor: 'hsl(228, 78%, 56%)', iconShapeColor: 'hsl(228, 55%, 22%)', color: '#FFFFFF' },
  { id: 'vatRefund', title: 'VAT Refund', category: 'Finance', CustomIcon: VatRefundIcon, fallbackIcon: 'receipt-long', route: '/modules/vat-refund', backgroundColor: 'hsl(338, 78%, 56%)', iconShapeColor: 'hsl(338, 55%, 22%)', color: '#FFFFFF', isPremium: true },
  { id: 'budgetTracker', title: 'Budget Tracker', category: 'Finance', CustomIcon: BudgetIcon, fallbackIcon: 'savings', route: '/modules/budget-tracker', backgroundColor: 'hsl(105, 45%, 40%)', iconShapeColor: 'hsl(105, 45%, 16%)', color: '#FFFFFF', isPremium: true },
  { id: 'atmExchange', title: 'ATM & Exchange', category: 'Finance', CustomIcon: AtmExchangeIcon, fallbackIcon: 'local-atm', route: '/modules/atm-exchange', backgroundColor: 'hsl(266, 78%, 56%)', iconShapeColor: 'hsl(266, 55%, 22%)', color: '#FFFFFF', isPremium: true },
];

export const ESSENTIALS_MODULES: RedesignModuleProps[] = [
  { id: 'sizeConverter', title: 'Sizes & Units', category: 'Essentials', CustomIcon: SizeGuideIcon, fallbackIcon: 'straighten', route: '/modules/size-converter', backgroundColor: 'hsl(165, 78%, 44%)', iconShapeColor: 'hsl(165, 55%, 18%)', color: '#FFFFFF' },
  { id: 'timezoneHelper', title: 'Time Zones', category: 'Essentials', CustomIcon: TimeZoneIcon, fallbackIcon: 'schedule', route: '/modules/timezone-helper', backgroundColor: 'hsl(203, 78%, 56%)', iconShapeColor: 'hsl(203, 55%, 22%)', color: '#FFFFFF', isPremium: true },
  { id: 'basicPhrases', title: 'Basic Phrases', category: 'Essentials', CustomIcon: BasicPhrasesIcon, fallbackIcon: 'translate', route: '/modules/basic-phrases', backgroundColor: 'hsl(16, 78%, 56%)', iconShapeColor: 'hsl(16, 55%, 22%)', color: '#FFFFFF' },
  { id: 'localInfo', title: 'Local Info', category: 'Essentials', CustomIcon: LocalInfoIcon, fallbackIcon: 'info', route: '/modules/local-info', backgroundColor: 'hsl(38, 78%, 56%)', iconShapeColor: 'hsl(38, 55%, 22%)', color: '#FFFFFF' },
];

export const ALL_MODULES: RedesignModuleProps[] = [
  ...FINANCE_MODULES,
  ...ESSENTIALS_MODULES,
];

export const DEFAULT_MODULE_ORDER = [
  'basicPhrases',
  'timezoneHelper',
  'localInfo',
  'budgetTracker',
  'atmExchange',
  'vatRefund',
  'tipCalculator',
  'sizeConverter'
];
