import { all, call, put, takeLatest } from 'redux-saga/effects';
import { api } from '../../lib/api';
import {
  dashboardDataRequested,
  dashboardDataLoaded,
  dashboardDataRequestFailed,
  type DashboardSummary,
  type ChartHourItem,
} from './dashboardSlice';

function* fetchDashboardWorker() {
  try {
    const [summary, chartData]: [DashboardSummary, ChartHourItem[]] = yield all([
      call(api.get, '/dashboard/summary'),
      call(api.get, '/dashboard/sales-chart'),
    ]);
    yield put(dashboardDataLoaded({ summary, chartData }));
  } catch (err: any) {
    yield put(dashboardDataRequestFailed(err.message || 'Failed to fetch dashboard data'));
  }
}

export default function* dashboardSaga() {
  yield takeLatest(dashboardDataRequested.type, fetchDashboardWorker);
}
