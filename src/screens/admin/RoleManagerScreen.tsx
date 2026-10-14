import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { User, UserRole } from '../../api/types';
import { AppCard } from '../../components/common/AppCard';
import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const ROLES: UserRole[] = ['admin', 'principal', 'bursar', 'teacher', 'parent'];

export const RoleManagerScreen = () => {
  const { user: currentUser } = useAuth();
  const { colors } = useAppTheme();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Role Edit Modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('parent');
  const [updateLoading, setUpdateLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getAllUsers();
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch registered user accounts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleOpenEdit = (user: User) => {
    if (user.email === currentUser?.email) {
      Alert.alert('Restricted', "You cannot change your own role to prevent locking yourself out of the admin panel.");
      return;
    }
    setSelectedUser(user);
    setNewRole(user.role);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;

    try {
      setUpdateLoading(true);
      await api.updateUserRole({
        email: selectedUser.email,
        role: newRole,
      });

      Alert.alert('Role Updated', `${selectedUser.name}'s role is now ${newRole}.`);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update role');
    } finally {
      setUpdateLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading user accounts..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              User Role Administration
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Assign staff privileges, bursar permissions, or manage parent accounts
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMe = item.email === currentUser?.email;
          return (
            <AppCard style={styles.userCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: colors.textPrimary }]}>
                    {item.name} {isMe && '(You)'}
                  </Text>
                  <Text style={[styles.userEmail, { color: colors.textMuted }]}>
                    {item.email}
                  </Text>
                  <Text style={[styles.userPhone, { color: colors.textSecondary }]}>
                    📞 {item.phone}
                  </Text>
                </View>
                <AppBadge label={item.role} role={item.role} size="sm" />
              </View>

              {!isMe && (
                <View style={styles.cardFooter}>
                  <AppButton
                    title="Change Role"
                    variant="outline"
                    size="sm"
                    onPress={() => handleOpenEdit(item)}
                    style={{ alignSelf: 'flex-end' }}
                  />
                </View>
              )}
            </AppCard>
          );
        }}
      />

      {/* Edit Role Modal */}
      <Modal visible={!!selectedUser} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Change User Role
            </Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Select new role for {selectedUser?.name} ({selectedUser?.email})
            </Text>

            <View style={styles.rolesGrid}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setNewRole(r)}
                  style={[
                    styles.roleOption,
                    {
                      backgroundColor:
                        newRole === r ? colors.primary : colors.surfaceVariant,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: newRole === r ? '#FFFFFF' : colors.textPrimary,
                      fontWeight: '700',
                      textTransform: 'capitalize',
                    }}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                variant="outline"
                onPress={() => setSelectedUser(null)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Save Role"
                variant="primary"
                loading={updateLoading}
                onPress={handleSaveRole}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  userCard: {
    padding: 14,
    marginVertical: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  userPhone: {
    fontSize: 12,
    marginTop: 4,
  },
  cardFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2ECE5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalDesc: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  rolesGrid: {
    gap: 8,
    marginBottom: 20,
  },
  roleOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
});
