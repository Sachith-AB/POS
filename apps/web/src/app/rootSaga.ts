import { all, fork } from 'redux-saga/effects';
import authSaga from '../features/auth/authSaga';
import settingsSaga from '../features/settings/settingsSaga';
import posSaga from '../features/pos/posSaga';
import productsSaga from '../features/products/productsSaga';
import stockSaga from '../features/stock/stockSaga';

export default function* rootSaga() {
  yield all([fork(authSaga), fork(settingsSaga), fork(posSaga), fork(productsSaga), fork(stockSaga)]);
}
