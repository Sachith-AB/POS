import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Employee {
  id: string;
  name: string;
  role: 'OWNER' | 'EMPLOYEE' | 'TECHNICIAN';
}

export interface AuthState {
  employee: Employee | null;
  status: 'checking' | 'idle' | 'authenticating' | 'authenticated' | 'error';
  error: string | null;
  needsSetup: boolean | null;
  employees: Employee[];
  employeesLoading: boolean;
  addingEmployee: boolean;
  addEmployeeError: string | null;
}

const initialState: AuthState = {
  employee: null,
  status: 'checking',
  error: null,
  needsSetup: null,
  employees: [],
  employeesLoading: false,
  addingEmployee: false,
  addEmployeeError: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    meRequested(state) {
      state.status = 'checking';
    },
    meLoaded(state, action: PayloadAction<Employee | null>) {
      state.employee = action.payload;
      state.status = action.payload ? 'authenticated' : 'idle';
    },
    bootstrapStatusRequested() {},
    bootstrapStatusLoaded(state, action: PayloadAction<boolean>) {
      state.needsSetup = action.payload;
    },
    bootstrapRequested(state, _action: PayloadAction<{ name: string; pin: string }>) {
      state.status = 'authenticating';
      state.error = null;
    },
    loginRequested(state, _action: PayloadAction<{ pin: string }>) {
      state.status = 'authenticating';
      state.error = null;
    },
    loginSucceeded(state, action: PayloadAction<Employee>) {
      state.employee = action.payload;
      state.status = 'authenticated';
      state.needsSetup = false;
    },
    loginFailed(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
    },
    logoutRequested() {},
    loggedOut(state) {
      state.employee = null;
      state.status = 'idle';
    },
    employeesRequested(state) {
      state.employeesLoading = true;
    },
    employeesLoaded(state, action: PayloadAction<Employee[]>) {
      state.employees = action.payload;
      state.employeesLoading = false;
    },
    employeeCreateRequested(
      state,
      _action: PayloadAction<{ name: string; pin: string; role: Employee['role'] }>
    ) {
      state.addingEmployee = true;
      state.addEmployeeError = null;
    },
    employeeCreated(state, action: PayloadAction<Employee>) {
      state.employees.push(action.payload);
      state.employees.sort((a, b) => a.name.localeCompare(b.name));
      state.addingEmployee = false;
    },
    employeeCreateFailed(state, action: PayloadAction<string>) {
      state.addingEmployee = false;
      state.addEmployeeError = action.payload;
    },
  },
});

export const {
  meRequested,
  meLoaded,
  bootstrapStatusRequested,
  bootstrapStatusLoaded,
  bootstrapRequested,
  loginRequested,
  loginSucceeded,
  loginFailed,
  logoutRequested,
  loggedOut,
  employeesRequested,
  employeesLoaded,
  employeeCreateRequested,
  employeeCreated,
  employeeCreateFailed,
} = authSlice.actions;
export default authSlice.reducer;
