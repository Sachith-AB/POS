import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface DashboardSummary {
  today: {
    salesCount: number;
    revenue: number;
    profit: number;
  };
  yesterday: {
    revenue: number;
    profit: number;
  };
  weekly: {
    revenue: number;
  };
  monthly: {
    revenue: number;
  };
  stock: {
    totalValue: number;
    lowStockCount: number;
  };
  repairs: {
    activeCount: number;
    byStatus: { status: string; count: number }[];
  };
  installments: {
    overdueCount: number;
    overdueValue: number;
  };
  topSellingProducts: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
}

export interface ChartHourItem {
  hour: string;
  total: number;
}

export interface DashboardState {
  summary: DashboardSummary | null;
  chartData: ChartHourItem[];
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  summary: null,
  chartData: [],
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    dashboardDataRequested(state) {
      state.loading = true;
      state.error = null;
    },
    dashboardDataLoaded(
      state,
      action: PayloadAction<{ summary: DashboardSummary; chartData: ChartHourItem[] }>
    ) {
      state.summary = action.payload.summary;
      state.chartData = action.payload.chartData;
      state.loading = false;
    },
    dashboardDataRequestFailed(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  dashboardDataRequested,
  dashboardDataLoaded,
  dashboardDataRequestFailed,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
