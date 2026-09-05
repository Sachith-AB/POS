import { all, fork } from 'redux-saga/effects';
import authSaga from '../features/auth/authSaga';
import settingsSaga from '../features/settings/settingsSaga';
import posSaga from '../features/pos/posSaga';
import productsSaga from '../features/products/productsSaga';
import stockSaga from '../features/stock/stockSaga';
import repairsSaga from '../features/repairs/repairsSaga';
import installmentsSaga from '../features/installments/installmentsSaga';
import dashboardSaga from '../features/dashboard/dashboardSaga';
import customersSaga from '../features/customers/customersSaga';

export default function* rootSaga() {
  yield all([
    fork(authSaga),
    fork(settingsSaga),
    fork(posSaga),
    fork(productsSaga),
    fork(stockSaga),
    fork(repairsSaga),
    fork(installmentsSaga),
    fork(dashboardSaga),
    fork(customersSaga),
  ]);
}

