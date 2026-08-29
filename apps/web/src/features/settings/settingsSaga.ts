import { call, put, takeEvery, takeLatest } from 'redux-saga/effects';
import { api } from '../../lib/api';
import {
  settingsLoaded,
  settingsRequested,
  settingsUpdated,
  settingsUpdateRequested,
  type ShopSettings,
} from './settingsSlice';

function* loadWorker() {
  const data: ShopSettings = yield call(api.get, '/settings');
  yield put(settingsLoaded(data));
}

function* updateWorker(action: ReturnType<typeof settingsUpdateRequested>) {
  const data: ShopSettings = yield call(api.patch, '/settings', action.payload);
  yield put(settingsUpdated(data));
}

export default function* settingsSaga() {
  yield takeLatest(settingsRequested.type, loadWorker);
  yield takeEvery(settingsUpdateRequested.type, updateWorker);
}
