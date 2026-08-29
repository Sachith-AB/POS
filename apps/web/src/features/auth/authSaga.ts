import { call, put, takeLatest } from 'redux-saga/effects';
import { api, ApiError } from '../../lib/api';
import {
  bootstrapRequested,
  bootstrapStatusLoaded,
  bootstrapStatusRequested,
  employeeCreateFailed,
  employeeCreateRequested,
  employeeCreated,
  employeesLoaded,
  employeesRequested,
  loggedOut,
  loginFailed,
  loginRequested,
  loginSucceeded,
  meLoaded,
  meRequested,
  type Employee,
} from './authSlice';

function* meWorker() {
  try {
    const res: { employee: Employee } = yield call(api.get, '/auth/me');
    yield put(meLoaded(res.employee));
  } catch {
    yield put(meLoaded(null));
  }
}

function* bootstrapStatusWorker() {
  try {
    const res: { needsSetup: boolean } = yield call(api.get, '/auth/bootstrap-status');
    yield put(bootstrapStatusLoaded(res.needsSetup));
  } catch {
    yield put(bootstrapStatusLoaded(false));
  }
}

function* bootstrapWorker(action: ReturnType<typeof bootstrapRequested>) {
  try {
    const res: { employee: Employee } = yield call(api.post, '/auth/bootstrap', action.payload);
    yield put(loginSucceeded(res.employee));
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Setup failed';
    yield put(loginFailed(message));
  }
}

function* loginWorker(action: ReturnType<typeof loginRequested>) {
  try {
    const res: { employee: Employee } = yield call(api.post, '/auth/login', action.payload);
    yield put(loginSucceeded(res.employee));
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Login failed';
    yield put(loginFailed(message));
  }
}

function* logoutWorker() {
  yield call(api.post, '/auth/logout');
  yield put(loggedOut());
}

function* employeesWorker() {
  const employees: Employee[] = yield call(api.get, '/auth/employees');
  yield put(employeesLoaded(employees));
}

function* employeeCreateWorker(action: ReturnType<typeof employeeCreateRequested>) {
  try {
    const employee: Employee = yield call(api.post, '/auth/employees', action.payload);
    yield put(employeeCreated(employee));
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not add employee';
    yield put(employeeCreateFailed(message));
  }
}

export default function* authSaga() {
  yield takeLatest(meRequested.type, meWorker);
  yield takeLatest(bootstrapStatusRequested.type, bootstrapStatusWorker);
  yield takeLatest(bootstrapRequested.type, bootstrapWorker);
  yield takeLatest(loginRequested.type, loginWorker);
  yield takeLatest('auth/logoutRequested', logoutWorker);
  yield takeLatest(employeesRequested.type, employeesWorker);
  yield takeLatest(employeeCreateRequested.type, employeeCreateWorker);
}
