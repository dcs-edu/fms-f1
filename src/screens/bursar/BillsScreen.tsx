import React, { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Modal,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useAppTheme } from '../../contexts/ThemeContext';
import { KEYBOARD_BOTTOM_OFFSET } from '../../constants/keyboard';
import { api } from '../../api/client';
import { Bill, Utility } from '../../api/types';
import { formatGHS, isValidCurrencyAmount } from '../../utils/currency';
import { toNumber } from '../../utils/finance';
import { AppCard } from '../../components/common/AppCard';
import { AppButton } from '../../components/common/AppButton';
import { AppTextInput } from '../../components/common/AppTextInput';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

type ModalKind = 'newFee' | 'price' | null;

/**
 * Fees & utilities for admin, principal and bursar. A utility (Tuition, PTA dues, ...) only becomes
 * something a student owes once it has a price for a semester, so a new fee is created with its first price.
 */
export const BillsScreen = () => {
  const { colors } = useAppTheme();

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalKind>(null);
  const [saving, setSaving] = useState(false);
  const [utilName, setUtilName] = useState('');
  const [sem, setSem] = useState('');
  const [amount, setAmount] = useState('');
  const [utilId, setUtilId] = useState<number | null>(null);
  const [manualUtilId, setManualUtilId] = useState('');
  // Utilities created here; kept so a failed first price can be retried without creating the utility twice
  const [created, setCreated] = useState<Utility[]>([]);

  const fetchBills = useCallback(async () => {
    try {
      setError(null);
      setBills(await api.getBills());
    } catch (err: any) {
      setError(err.message || 'Failed to load fees and bills');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBills();
    }, [fetchBills])
  );

  const sections = useMemo(() => {
    const bySem = new Map<string, Bill[]>();
    for (const b of bills) bySem.set(b.sem, [...(bySem.get(b.sem) ?? []), b]);
    return Array.from(bySem.entries()).map(([title, data]) => ({
      title,
      total: data.reduce((s, b) => s + toNumber(b.amount), 0),
      data,
    }));
  }, [bills]);

  // Fees that can take another semester price: those GET /utilities/list names a util_id for, plus any made here
  const knownUtilities = useMemo(() => {
    const map = new Map<number, string>();
    for (const b of bills) if (b.util_id) map.set(b.util_id, b.util_name);
    for (const u of created) map.set(u.id, u.util_name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [bills, created]);

  const openModal = (kind: ModalKind) => {
    setUtilName('');
    setAmount('');
    setManualUtilId('');
    setUtilId(knownUtilities[0]?.id ?? null);
    setSem(sections[sections.length - 1]?.title ?? '');
    setModal(kind);
  };

  const validPrice = () => {
    if (!sem.trim()) {
      Alert.alert('Required', 'Semester is required (e.g. 2026-T1)');
      return false;
    }
    const val = isValidCurrencyAmount(amount);
    if (!val.valid) {
      Alert.alert('Invalid Amount', val.error || 'Please check the amount');
      return false;
    }
    return true;
  };

  const addPrice = async (id: number, name: string) => {
    const price = await api.createUtilityPrice(id, sem.trim(), amount.trim());
    setModal(null);
    Alert.alert('Bill created', `${name} for ${price.sem} is now ${formatGHS(price.amount)} per student.`);
    fetchBills();
  };

  const handleNewFee = async () => {
    const name = utilName.trim();
    if (!name) {
      Alert.alert('Required', 'Please enter the fee name');
      return;
    }
    if (!validPrice()) return;

    try {
      setSaving(true);
      let utility = created.find((u) => u.util_name.toLowerCase() === name.toLowerCase());
      if (!utility) {
        utility = await api.createUtility(name);
        setCreated((prev) => [...prev, utility!]);
      }
      await addPrice(utility.id, utility.util_name);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create the fee');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPrice = async () => {
    const id = knownUtilities.length > 0 ? utilId : parseInt(manualUtilId, 10);
    if (!id || isNaN(id) || id <= 0) {
      Alert.alert('Required', 'Choose the fee this price is for');
      return;
    }
    if (!validPrice()) return;

    try {
      setSaving(true);
      await addPrice(id, knownUtilities.find((u) => u.id === id)?.name ?? 'The fee');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add the price');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading fees & utilities..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.bill_id)}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchBills();
            }}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Fees & Utilities</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Every active fee and what each student is billed for it per semester
              </Text>
            </View>

            <View style={styles.actionRow}>
              <AppButton
                title="+ New Fee"
                variant="primary"
                size="sm"
                onPress={() => openModal('newFee')}
                style={styles.actionBtn}
              />
              <AppButton
                title="+ Semester Price"
                variant="outline"
                size="sm"
                onPress={() => openModal('price')}
                style={styles.actionBtn}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>📋</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No fees yet</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Add a fee (e.g. Tuition) with its semester price to start billing students.
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{section.title}</Text>
            <Text style={[styles.sectionMeta, { color: colors.textMuted }]}>
              {formatGHS(section.total)} per student
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <AppCard style={styles.billCard}>
            <View style={styles.billRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.billName, { color: colors.textPrimary }]}>{item.util_name}</Text>
                <Text style={[styles.billMeta, { color: colors.textMuted }]}>Bill #{item.bill_id}</Text>
              </View>
              <Text style={[styles.billAmount, { color: colors.primary }]}>{formatGHS(item.amount)}</Text>
            </View>
          </AppCard>
        )}
      />

      <Modal visible={modal !== null} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {modal === 'newFee' ? 'New Fee' : 'Add Semester Price'}
            </Text>
            <KeyboardAwareScrollView bottomOffset={KEYBOARD_BOTTOM_OFFSET} keyboardShouldPersistTaps="handled">
              {modal === 'newFee' ? (
                <AppTextInput
                  label="Fee Name"
                  placeholder="e.g. Tuition, Bus Service, PTA Dues"
                  value={utilName}
                  onChangeText={setUtilName}
                />
              ) : knownUtilities.length > 0 ? (
                <View style={styles.utilPicker}>
                  <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Fee</Text>
                  <View style={styles.chips}>
                    {knownUtilities.map((u) => (
                      <TouchableOpacity
                        key={u.id}
                        onPress={() => setUtilId(u.id)}
                        style={[
                          styles.chip,
                          { backgroundColor: utilId === u.id ? colors.primary : colors.surfaceVariant },
                        ]}
                      >
                        <Text
                          style={{
                            color: utilId === u.id ? '#FFFFFF' : colors.textPrimary,
                            fontSize: 13,
                            fontWeight: '600',
                          }}
                        >
                          {u.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <AppTextInput
                  label="Utility ID"
                  placeholder="e.g. 1"
                  value={manualUtilId}
                  onChangeText={setManualUtilId}
                  keyboardType="number-pad"
                  hint="The bills list doesn't include utility IDs yet, so enter it by hand"
                />
              )}
              <AppTextInput
                label="Semester"
                placeholder="e.g. 2026-T1"
                value={sem}
                onChangeText={setSem}
                autoCapitalize="characters"
              />
              <AppTextInput
                label="Price per student (GH₵)"
                placeholder="e.g. 500.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
              <View style={styles.modalActions}>
                <AppButton title="Cancel" variant="outline" onPress={() => setModal(null)} style={{ flex: 1 }} />
                <AppButton
                  title={modal === 'newFee' ? 'Create Fee' : 'Save Price'}
                  variant="primary"
                  loading={saving}
                  onPress={modal === 'newFee' ? handleNewFee : handleAddPrice}
                  style={{ flex: 1 }}
                />
              </View>
            </KeyboardAwareScrollView>
          </View>
        </KeyboardAvoidingView>
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
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 12,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionMeta: {
    fontSize: 12,
  },
  billCard: {
    padding: 14,
    marginVertical: 4,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billName: {
    fontSize: 16,
    fontWeight: '700',
  },
  billMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  billAmount: {
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
  utilPicker: {
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
});
