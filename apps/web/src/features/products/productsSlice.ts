import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  costPrice: string | number;
  sellPrice: string | number;
  wholesalePrice?: string | number | null;
  businessPrice?: string | number | null;
  quantity: number;
  lowStockThreshold: number;
  category: string;
  isSerialized: boolean;
}


export interface ProductsState {
  results: Product[];
  searchTerm: string;
  loading: boolean;
  lookupError: string | null;
  quickButtons: Product[];
}

const initialState: ProductsState = {
  results: [],
  searchTerm: '',
  loading: false,
  lookupError: null,
  quickButtons: [],
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    searchTermChanged(state, action: PayloadAction<string>) {
      state.searchTerm = action.payload;
    },
    searchResultsLoaded(state, action: PayloadAction<Product[]>) {
      state.results = action.payload;
      state.loading = false;
    },
    searchLoading(state) {
      state.loading = true;
    },
    barcodeScanRequested(state, _action: PayloadAction<string>) {
      state.lookupError = null;
    },
    barcodeNotFound(state, action: PayloadAction<string>) {
      state.lookupError = `No product found for barcode ${action.payload}`;
    },
    quickButtonsLoaded(state, action: PayloadAction<Product[]>) {
      state.quickButtons = action.payload;
    },
    quickButtonsRequested() {},
  },
});

export const {
  searchTermChanged,
  searchResultsLoaded,
  searchLoading,
  barcodeScanRequested,
  barcodeNotFound,
  quickButtonsLoaded,
  quickButtonsRequested,
} = productsSlice.actions;
export default productsSlice.reducer;
