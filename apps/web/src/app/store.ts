import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import authReducer from '../features/auth/authSlice';
import settingsReducer from '../features/settings/settingsSlice';
import posReducer from '../features/pos/posSlice';
import productsReducer from '../features/products/productsSlice';
import stockReducer from '../features/stock/stockSlice';
import repairsReducer from '../features/repairs/repairsSlice';
import installmentsReducer from '../features/installments/installmentsSlice';
import dashboardReducer from '../features/dashboard/dashboardSlice';
import customersReducer from '../features/customers/customersSlice';
import rootSaga from './rootSaga';

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    auth: authReducer,
    settings: settingsReducer,
    pos: posReducer,
    products: productsReducer,
    stock: stockReducer,
    repairs: repairsReducer,
    installments: installmentsReducer,
    dashboard: dashboardReducer,
    customers: customersReducer,
  },

  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ thunk: false }).concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
