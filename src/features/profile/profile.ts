import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

/**
 * Minimal user profile. For now only `sex`, which gates female-specific
 * sub-poles (e.g. the menstrual cycle tracker). A full new-user onboarding
 * will set this later; meanwhile it's editable from the account screen.
 */
export type Sex = 'female' | 'male' | 'unspecified';

const KEY = 'profile_sex';

type ProfileStore = {
  sex: Sex;
  load: () => Promise<void>;
  setSex: (sex: Sex) => void;
};

export const useProfile = create<ProfileStore>((set) => ({
  sex: 'unspecified',
  load: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (raw === 'female' || raw === 'male' || raw === 'unspecified') set({ sex: raw });
    } catch {
      // keep default
    }
  },
  setSex: (sex) => {
    set({ sex });
    SecureStore.setItemAsync(KEY, sex).catch(() => {});
  },
}));
