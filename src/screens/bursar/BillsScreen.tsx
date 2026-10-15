import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { Utility } from '../../api/types';
import { formatGHS, isValidCurrencyAmount } from '../../utils/currency';
import { AppCard } from '../../components/common/AppCard';
import { AppButton } from '../../components/common/AppButton';
import { AppTextInput } from '../../components/common/AppTextInput';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const BillsScreen = () => {
  const { colors, typography } = useAppTheme();

  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Utility Modal
  const [showAddUtil, setShowAddUtil] = useState(false);
  const [newUtilName, setNewUtilName] = useState('');
  const [utilLoading, setUtilLoading] = useState(false);

  // Set Price Modal
  const [showSetPrice, setShowSetPrice] = useState(false);
  const [selectedUtilId, setSelectedUtilId] = useState<string>('');
  const [sem, setSem] = useState('2026-T1');
  const [priceAmount, setPriceAmount] = useState('');
  const [priceLoading, setPriceLoading] = useState(false);

  const fetchUtilities = useCallback(async () => {
    try {
      setError(null);
      const data = await api.listUtilities();
      setUtilities(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch utilities and prices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUtilities();
  }, [fetchUtilities]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUtilities();
  };

  const handleCreateUtility = async () => {
    if (!newUtilName.trim()) {
      Alert.alert('Required', 'Please enter a utility service name');
      return;
    }

    try {
      setUtilLoading(true);
      await api.createUtility(newUtilName.trim());
      setShowAddUtil(false);
      setNewUtilName('');
      Alert.alert('Success', 'Utility service created successfully');
      fetchUtilities();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create utility');
    } finally {
      setUtilLoading(false);
    }
  };

  const handleCreatePrice = async () => {
    const uId = parseInt(selectedUtilId, 10);
    if (isNaN(uId) || uId <= 0) {
      Alert.alert('Required', 'Please enter a valid numeric Utility ID');
      return;
    }
    if (!sem.trim()) {
      Alert.alert('Required', 'Semester name is required (e.g. 2026-T1)');
      return;
    }
    const val = isValidCurrencyAmount(priceAmount);
    if (!val.valid) {
      Alert.alert('Invalid Amount', val.error || 'Please check the amount');
      return;
    }

    try {
      setPriceLoading(true);
      const price = await api.createUtilityPrice(uId, sem.trim(), priceAmount.trim());
      setShowSetPrice(false);
      setPriceAmount('');
      Alert.alert(
        'Bill Created!',
        `New Bill ID is ${price.bill_id} for ${price.sem} (${formatGHS(price.amount)})`
      );
      fetchUtilities();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create utility price');
    } finally {
      setPriceLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading fee schedules & utilities..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <FlatList
        data={utilities}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Fees & Utility Bills
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Manage chargeable school services and semester bill prices
              </Text>
            </View>

            <View style={styles.actionRow}>
              <AppButton
                title="+ Add Fee Type"
                variant="outline"
                size="sm"
                onPress={() => setShowAddUtil(true)}
                style={styles.actionBtn}
              />
              <AppButton
                title="+ Set Semester Price"
                variant="primary"
                size="sm"
                onPress={() => setShowSetPrice(true)}
                style={styles.actionBtn}
              />
            </View>

            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Configured Active Bills
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>📋</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No Bills Found
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Add a fee type (e.g. Tuition) and set a semester price to generate bills.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <AppCard style={styles.utilCard}>
            <View style={styles.utilHeader}>
              <View>
                <Text style={[styles.utilName, { color: colors.textPrimary }]}>
                  {item.util_name}
                </Text>
                <Text style={[styles.utilSem, { color: colors.textMuted }]}>
                  Semester: {item.sem || 'All'}
                </Text>
              </View>
              {item.amount && (
                <Text style={[styles.utilAmount, { color: colors.primary }]}>
                  {formatGHS(item.amount)}
                </Text>
              )}
            </View>
          </AppCard>
        )}
      />

      {/* Add Utility Modal */}
      <Modal visible={showAddUtil} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Add Fee Category
            </Text>
            <AppTextInput
              label="Service / Fee Name"
              placeholder="e.g. Tuition, Bus Service, Library Dues"
              value={newUtilName}
              onChangeText={setNewUtilName}
            />
            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                variant="outline"
                onPress={() => setShowAddUtil(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Create"
                variant="primary"
                loading={utilLoading}
                onPress={handleCreateUtility}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Set Utility Price Modal */}
      <Modal visible={showSetPrice} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Set Semester Price (Bill)
            </Text>
            <ScrollView>
              <AppTextInput
                label="Utility ID"
                placeholder="e.g. 1"
                value={selectedUtilId}
                onChangeText={setSelectedUtilId}
                keyboardType="number-pad"
                hint="Target service ID from utilities list"
              />
              <AppTextInput
                label="Semester Code"
                placeholder="e.g. 2026-T1"
                value={sem}
                onChangeText={setSem}
              />
              <AppTextInput
                label="Bill Price (GH₵)"
                placeholder="e.g. 500.00"
                value={priceAmount}
                onChangeText={setPriceAmount}
                keyboardType="decimal-pad"
              />
              <View style={styles.modalActions}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowSetPrice(false)}
                  style={{ flex: 1 }}
                />
                <AppButton
                  title="Save Price"
                  variant="primary"
                  loading={priceLoading}
                  onPress={handleCreatePrice}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  utilCard: {
    padding: 14,
    marginVertical: 4,
  },
  utilHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  utilName: {
    fontSize: 16,
    fontWeight: '700',
  },
  utilSem: {
    fontSize: 12,
    marginTop: 2,
  },
  utilAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  empty: {
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
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
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
});
