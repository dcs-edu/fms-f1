import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../contexts/ThemeContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  AuthStackParamList,
  ParentTabParamList,
  ParentStackParamList,
  BursarTabParamList,
  BursarStackParamList,
  AdminTabParamList,
  AdminStackParamList,
  PrincipalTabParamList,
  PrincipalStackParamList,
  TeacherStackParamList,
} from './types';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ChildrenScreen } from '../screens/parent/ChildrenScreen';
import { ChildDetailScreen } from '../screens/parent/ChildDetailScreen';
import { PayBillScreen } from '../screens/parent/PayBillScreen';
import { PaymentHistoryScreen } from '../screens/parent/PaymentHistoryScreen';
import { LedgerScreen } from '../screens/bursar/LedgerScreen';
import { BursarPayScreen } from '../screens/bursar/BursarPayScreen';
import { BillsScreen } from '../screens/bursar/BillsScreen';
import { AdminOverviewScreen } from '../screens/admin/AdminOverviewScreen';
import { EnrollStudentScreen } from '../screens/admin/EnrollStudentScreen';
import { LinkParentScreen } from '../screens/admin/LinkParentScreen';
import { RoleManagerScreen } from '../screens/admin/RoleManagerScreen';
import { CashPaymentScreen } from '../screens/admin/CashPaymentScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { ChangePasswordScreen } from '../screens/shared/ChangePasswordScreen';
import { ReceiptScreen } from '../screens/shared/ReceiptScreen';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const ParentTabs = createBottomTabNavigator<ParentTabParamList>();
const ParentStack = createNativeStackNavigator<ParentStackParamList>();
const BursarTabs = createBottomTabNavigator<BursarTabParamList>();
const BursarStack = createNativeStackNavigator<BursarStackParamList>();
const AdminTabs = createBottomTabNavigator<AdminTabParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
const PrincipalTabs = createBottomTabNavigator<PrincipalTabParamList>();
const PrincipalStack = createNativeStackNavigator<PrincipalStackParamList>();
const TeacherStack = createNativeStackNavigator<TeacherStackParamList>();

/** Shared header/tab styling driven by the app theme. */
const useScreenOptions = () => {
  const { colors } = useAppTheme();
  const stack = {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.textPrimary,
    contentStyle: { backgroundColor: colors.background },
  };
  const tabs = {
    ...stack,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
  };
  return { stack, tabs };
};

const tabIcon = (name: IconName) => ({ color, size }: { color: string; size: number }) => (
  <Ionicons name={name} size={size} color={color} />
);

const SHARED_STACK_SCREENS = {
  receipt: { title: 'Receipt' },
  changePassword: { title: 'Change Password' },
};

// ==================== AUTH ====================

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

// ==================== PARENT ====================

const ParentTabsNavigator = () => {
  const { tabs } = useScreenOptions();
  return (
    <ParentTabs.Navigator screenOptions={tabs}>
      <ParentTabs.Screen
        name="ChildrenTab"
        component={ChildrenScreen}
        options={{ title: 'My Children', tabBarIcon: tabIcon('people-outline') }}
      />
      <ParentTabs.Screen
        name="HistoryTab"
        component={PaymentHistoryScreen}
        options={{ title: 'History', tabBarIcon: tabIcon('receipt-outline') }}
      />
      <ParentTabs.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Profile', tabBarIcon: tabIcon('person-outline') }}
      />
    </ParentTabs.Navigator>
  );
};

const ParentNavigator = () => {
  const { stack } = useScreenOptions();
  return (
    <ParentStack.Navigator screenOptions={stack}>
      <ParentStack.Screen name="ParentTabs" component={ParentTabsNavigator} options={{ headerShown: false }} />
      <ParentStack.Screen name="ChildDetail" component={ChildDetailScreen} options={{ title: 'Student' }} />
      <ParentStack.Screen name="PayBill" component={PayBillScreen} options={{ title: 'Pay Bill' }} />
      <ParentStack.Screen name="Receipt" component={ReceiptScreen} options={SHARED_STACK_SCREENS.receipt} />
      <ParentStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={SHARED_STACK_SCREENS.changePassword} />
    </ParentStack.Navigator>
  );
};

// ==================== BURSAR ====================

const BursarTabsNavigator = () => {
  const { tabs } = useScreenOptions();
  return (
    <BursarTabs.Navigator screenOptions={tabs}>
      <BursarTabs.Screen
        name="LedgerTab"
        component={LedgerScreen}
        options={{ title: 'Ledger', tabBarIcon: tabIcon('list-outline') }}
      />
      <BursarTabs.Screen
        name="BursarPayTab"
        component={BursarPayScreen}
        options={{ title: 'Collect', tabBarIcon: tabIcon('cash-outline') }}
      />
      <BursarTabs.Screen
        name="BillsTab"
        component={BillsScreen}
        options={{ title: 'Bills', tabBarIcon: tabIcon('pricetags-outline') }}
      />
      <BursarTabs.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Profile', tabBarIcon: tabIcon('person-outline') }}
      />
    </BursarTabs.Navigator>
  );
};

const BursarNavigator = () => {
  const { stack } = useScreenOptions();
  return (
    <BursarStack.Navigator screenOptions={stack}>
      <BursarStack.Screen name="BursarTabs" component={BursarTabsNavigator} options={{ headerShown: false }} />
      <BursarStack.Screen name="Receipt" component={ReceiptScreen} options={SHARED_STACK_SCREENS.receipt} />
      <BursarStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={SHARED_STACK_SCREENS.changePassword} />
    </BursarStack.Navigator>
  );
};

// ==================== ADMIN ====================

const AdminTabsNavigator = () => {
  const { tabs } = useScreenOptions();
  return (
    <AdminTabs.Navigator screenOptions={tabs}>
      <AdminTabs.Screen
        name="OverviewTab"
        component={AdminOverviewScreen}
        options={{ title: 'Overview', tabBarIcon: tabIcon('grid-outline') }}
      />
      <AdminTabs.Screen
        name="EnrollTab"
        component={EnrollStudentScreen}
        options={{ title: 'Enroll', tabBarIcon: tabIcon('person-add-outline') }}
      />
      <AdminTabs.Screen
        name="LinkParentTab"
        component={LinkParentScreen}
        options={{ title: 'Link', tabBarIcon: tabIcon('link-outline') }}
      />
      <AdminTabs.Screen
        name="RolesTab"
        component={RoleManagerScreen}
        options={{ title: 'Roles', tabBarIcon: tabIcon('shield-checkmark-outline') }}
      />
      <AdminTabs.Screen
        name="CashPayTab"
        component={CashPaymentScreen}
        options={{ title: 'Cash', tabBarIcon: tabIcon('cash-outline') }}
      />
      <AdminTabs.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Profile', tabBarIcon: tabIcon('person-outline') }}
      />
    </AdminTabs.Navigator>
  );
};

const AdminNavigator = () => {
  const { stack } = useScreenOptions();
  return (
    <AdminStack.Navigator screenOptions={stack}>
      <AdminStack.Screen name="AdminTabs" component={AdminTabsNavigator} options={{ headerShown: false }} />
      <AdminStack.Screen name="Receipt" component={ReceiptScreen} options={SHARED_STACK_SCREENS.receipt} />
      <AdminStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={SHARED_STACK_SCREENS.changePassword} />
    </AdminStack.Navigator>
  );
};

// ==================== PRINCIPAL (admin screens; role changes exclude admin) ====================

const PrincipalTabsNavigator = () => {
  const { tabs } = useScreenOptions();
  return (
    <PrincipalTabs.Navigator screenOptions={tabs}>
      <PrincipalTabs.Screen
        name="OverviewTab"
        component={AdminOverviewScreen}
        options={{ title: 'Overview', tabBarIcon: tabIcon('grid-outline') }}
      />
      <PrincipalTabs.Screen
        name="EnrollTab"
        component={EnrollStudentScreen}
        options={{ title: 'Enroll', tabBarIcon: tabIcon('person-add-outline') }}
      />
      <PrincipalTabs.Screen
        name="LinkParentTab"
        component={LinkParentScreen}
        options={{ title: 'Link', tabBarIcon: tabIcon('link-outline') }}
      />
      <PrincipalTabs.Screen
        name="RolesTab"
        component={RoleManagerScreen}
        options={{ title: 'Roles', tabBarIcon: tabIcon('shield-checkmark-outline') }}
      />
      <PrincipalTabs.Screen
        name="CashPayTab"
        component={CashPaymentScreen}
        options={{ title: 'Cash', tabBarIcon: tabIcon('cash-outline') }}
      />
      <PrincipalTabs.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Profile', tabBarIcon: tabIcon('person-outline') }}
      />
    </PrincipalTabs.Navigator>
  );
};

const PrincipalNavigator = () => {
  const { stack } = useScreenOptions();
  return (
    <PrincipalStack.Navigator screenOptions={stack}>
      <PrincipalStack.Screen name="PrincipalTabs" component={PrincipalTabsNavigator} options={{ headerShown: false }} />
      <PrincipalStack.Screen name="Receipt" component={ReceiptScreen} options={SHARED_STACK_SCREENS.receipt} />
      <PrincipalStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={SHARED_STACK_SCREENS.changePassword} />
    </PrincipalStack.Navigator>
  );
};

// ==================== TEACHER ====================

/** No teacher-facing API exists yet, so teachers only get their profile. */
const TeacherNavigator = () => {
  const { stack } = useScreenOptions();
  return (
    <TeacherStack.Navigator screenOptions={stack}>
      <TeacherStack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: 'Profile' }} />
      <TeacherStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={SHARED_STACK_SCREENS.changePassword} />
    </TeacherStack.Navigator>
  );
};

// ==================== ROOT ====================

export const RootNavigator = () => {
  const { isAuthenticated, isLoading, role } = useAuth();
  const { colors, isDark } = useAppTheme();

  if (isLoading) {
    return <LoadingSpinner message="Loading..." />;
  }

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
    },
  };

  let content: React.ReactNode;
  if (!isAuthenticated) {
    content = <AuthNavigator />;
  } else {
    switch (role) {
      case 'admin':
        content = <AdminNavigator />;
        break;
      case 'principal':
        content = <PrincipalNavigator />;
        break;
      case 'bursar':
        content = <BursarNavigator />;
        break;
      case 'teacher':
        content = <TeacherNavigator />;
        break;
      default:
        content = <ParentNavigator />;
    }
  }

  return <NavigationContainer theme={navTheme}>{content}</NavigationContainer>;
};
