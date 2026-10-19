import { Std, Payment } from '../api/types';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: { email?: string } | undefined;
};

export type ParentTabParamList = {
  ChildrenTab: undefined;
  HistoryTab: undefined;
  ProfileTab: undefined;
};

export type ParentStackParamList = {
  ParentTabs: undefined;
  ChildDetail: { student: Std };
  PayBill: { student: Std; billId?: number };
  Receipt: { payment: Payment; studentName?: string; studentId?: string };
  ChangePassword: undefined;
};

export type BursarTabParamList = {
  OverviewTab: undefined;
  LedgerTab: undefined;
  BursarPayTab: undefined;
  BillsTab: undefined;
  ProfileTab: undefined;
};

export type BursarStackParamList = {
  BursarTabs: undefined;
  Debtors: undefined;
  Students: undefined;
  StudentProfile: { student: Std };
  Receipt: { payment: Payment; studentName?: string; studentId?: string };
  ChangePassword: undefined;
};

export type AdminTabParamList = {
  OverviewTab: undefined;
  EnrollTab: undefined;
  LinkParentTab: undefined;
  RolesTab: undefined;
  CashPayTab: undefined;
  ProfileTab: undefined;
};

export type AdminStackParamList = {
  AdminTabs: undefined;
  Debtors: undefined;
  PaymentsReport: undefined;
  Students: undefined;
  StudentProfile: { student: Std };
  Utilities: undefined;
  Receipt: { payment: Payment; studentName?: string; studentId?: string };
  ChangePassword: undefined;
};

export type PrincipalTabParamList = {
  OverviewTab: undefined;
  EnrollTab: undefined;
  LinkParentTab: undefined;
  RolesTab: undefined;
  CashPayTab: undefined;
  ProfileTab: undefined;
};

export type PrincipalStackParamList = {
  PrincipalTabs: undefined;
  Debtors: undefined;
  PaymentsReport: undefined;
  Students: undefined;
  StudentProfile: { student: Std };
  Utilities: undefined;
  Receipt: { payment: Payment; studentName?: string; studentId?: string };
  ChangePassword: undefined;
};

export type TeacherStackParamList = {
  ProfileHome: undefined;
  ChangePassword: undefined;
};
