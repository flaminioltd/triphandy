import { create } from 'zustand';
import Qonversion from 'react-native-qonversion';
import { settingsRepo } from '../repositories/settings-repository';
import type { settings } from '../db/schema';

type Settings = typeof settings.$inferSelect;

interface AppState {
  settings: Settings | null;
  isLoading: boolean;
  isSyncing: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (data: Partial<typeof settings.$inferInsert>) => Promise<void>;
  setSyncing: (isSyncing: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  settings: null,
  isLoading: true,
  isSyncing: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      let data = await settingsRepo.getSettings();

      // 1. Initialize firstLaunchDate if it doesn't exist
      if (!data?.firstLaunchDate) {
        const now = new Date();
        const updated = await settingsRepo.saveSettings({ firstLaunchDate: now });
        if (updated && updated.length > 0) {
          data = updated[0];
        }
      }

      // 2. 7-day trial logic
      let hasActiveTrial = false;
      if (data?.firstLaunchDate) {
        const trialEnd = new Date(data.firstLaunchDate).getTime() + (7 * 24 * 60 * 60 * 1000);
        hasActiveTrial = Date.now() < trialEnd;
      }

      // 3. Qonversion purchase check
      let hasPurchased = data?.isPremium || false;
      try {
        const entitlements = await Qonversion.checkEntitlements();
        const premiumEntitlement = entitlements.get('premium');
        if (premiumEntitlement && premiumEntitlement.isActive) {
          hasPurchased = true;
          if (!data?.isPremium) {
            settingsRepo.saveSettings({ isPremium: true });
          }
        }
      } catch (e) {
        console.warn('Qonversion check failed:', e);
      }

      // 4. Hardcoded Admin mode flag (TEMPORARY)
      const ADMIN_MODE = true; // TODO: Revert to false after admin build

      // 5. Final premium state override in memory
      if (data) {
        data.isPremium = ADMIN_MODE || hasPurchased || hasActiveTrial;
      }

      set({ settings: data });
      if (data?.systemLanguage) {
        import('../i18n').then((i18n) => i18n.default.changeLanguage(data.systemLanguage!));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (data) => {
    try {
      const result = await settingsRepo.saveSettings(data);
      if (result && result.length > 0) {
        set({ settings: result[0] });
        if (data.systemLanguage) {
          import('../i18n').then((i18n) => i18n.default.changeLanguage(data.systemLanguage!));
        }
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  },

  setSyncing: (isSyncing) => set({ isSyncing }),
}));
