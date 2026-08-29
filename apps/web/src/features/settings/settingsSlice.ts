import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ThemeModeSetting } from '@pos/shared';

export interface ShopSettings {
  id: string;
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
  themeMode: ThemeModeSetting;
  discountLimitPercent: string | number;
  lowStockDefaultDays: number;
  receiptPrinterType: string | null;
  receiptPrinterName: string | null;
  cashDrawerEnabled: boolean;
  barcodeScannerMode: 'USB_HID' | 'CAMERA';
  receiptWidth: string;
}

export interface SettingsState {
  data: ShopSettings | null;
  loading: boolean;
  saving: boolean;
}

const initialState: SettingsState = {
  data: null,
  loading: true,
  saving: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    settingsRequested(state) {
      state.loading = true;
    },
    settingsLoaded(state, action: PayloadAction<ShopSettings>) {
      state.data = action.payload;
      state.loading = false;
    },
    settingsUpdateRequested(state, _action: PayloadAction<Partial<ShopSettings>>) {
      state.saving = true;
    },
    settingsUpdated(state, action: PayloadAction<ShopSettings>) {
      state.data = action.payload;
      state.saving = false;
    },
  },
});

export const { settingsRequested, settingsLoaded, settingsUpdateRequested, settingsUpdated } =
  settingsSlice.actions;
export default settingsSlice.reducer;
