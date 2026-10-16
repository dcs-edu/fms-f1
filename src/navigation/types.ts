import { Std, Payment } from '../api/types';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
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
  LedgerTab: undefined;
  BursarPayTab: undefined;
  BillsTab: undefined;
  ProfileTab: undefined;
};

export type BursarStackParamList = {
  BursarTabs: undefined;
  Receipt: { payment: Payment; studentId?: string };
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
  Receipt: { payment: Payment; studentId?: string };
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
  Receipt: { payment: Payment; studentId?: string };
  ChangePassword: undefined;
};

export type TeacherStackParamList = {
  ProfileHome: undefined;
  ChangePassword: undefined;
};
