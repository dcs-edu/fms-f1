import React, { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useAppTheme } from '../../contexts/ThemeContext';
import { KEYBOARD_BOTTOM_OFFSET } from '../../constants/keyboard';
import { api } from '../../api/client';
import { Bill, Utility } from '../../api/types';
import { formatGHS, isValidCurrencyAmount } from '../../utils/currency';
import { AppCard } from '../../components/common/AppCard';
import { AppButton } from '../../components/common/AppButton';
import { AppTextInput } from '../../components/common/AppTextInput';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

/** A fee (utility) with every semester price it has. The id stays behind the scenes; people only see the name. */
interface Fee {
  id: number;
  name: string;
  prices: Bill[]; // newest semester first
}

const PREVIEW_PRICES = 3;

/**
 * Fees & utilities for admin, principal and bursar. A fee (Tuition, PTA dues, ...) only becomes something
 * a student owes once it has a price for a semester: add the fee by name, then tap it to price or remove it.
 */
export const BillsScreen = () => {
  const { colors } = useAppTheme();

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Fees made here. GET /utilities/list only returns fees that have a price, so a new one only lives here until priced
  const [created, setCreated] = useState<Utility[]>([]);

  const [modal, setModal] = useState<'add' | 'fee' | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [sem, setSem] = useState('');
  const [amount, setAmount] = useState('');

  const fetchBills = useCallback(async () => {
    try {
      setError(null);
      setBills(await api.getBills());
    } catch (err: any) {
      setError(err.message || 'Failed to load fees');
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

  const fees = useMemo(() => {
    const map = new Map<number, Fee>();
    for (const u of created) map.set(u.id, { id: u.id, name: u.util_name, prices: [] });
    for (const b of bills) {
      const fee = map.get(b.util_id) ?? { id: b.util_id, name: b.util_name, prices: [] };
      fee.prices.push(b);
      map.set(b.util_id, fee);
    }
    for (const f of map.values()) f.prices.sort((a, b) => b.sem.localeCompare(a.sem));
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [bills, created]);

  // Semesters already in use, newest first, offered as one-tap picks
  const semesters = useMemo(
    () => Array.from(new Set(bills.map((b) => b.sem).filter(Boolean))).sort((a, b) => b.localeCompare(a)),
    [bills]
  );

  const selected = fees.find((f) => f.id === selectedId) ?? null;
  const semesterChoices = selected ? semesters.filter((s) => !selected.prices.some((p) => p.sem === s)) : [];
  // A fee made here with no price yet isn't in GET /utilities/list, so leaving now would strand it unseen
  const mustPrice = modal === 'fee' && !!selected && selected.prices.length === 0 && created.some((u) => u.id === selected.id);

  const openAdd = () => {
    setNewName('');
    setModal('add');
  };

  const openFee = (fee: Fee) => {
    setSelectedId(fee.id);
    setSem(semesters.find((s) => !fee.prices.some((p) => p.sem === s)) ?? '');
    setAmount('');
    setModal('fee');
  };

  const closeModal = () => {
    if (mustPrice && selected) {
      Alert.alert(
        `${selected.name} has no price`,
        "A fee without a price won't show in the fee list once you leave. Set its price for a semester, or remove it.",
        [
          { text: 'Set price', style: 'cancel' },
          { text: 'Remove fee', style: 'destructive', onPress: () => removeFee(selected) },
        ]
      );
      return;
    }
    setModal(null);
    setSelectedId(null);
  };

  const handleAddFee = async () => {
    const name = newName.trim();
    if (!name) {
      Alert.alert('Required', 'Please enter the fee name');
      return;
    }
    const existing = fees.find((f) => f.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      Alert.alert('Already added', `${existing.name} is already a fee. Tap it in the list to set a price.`);
      return;
    }

    try {
      setSaving(true);
      const utility = await api.createUtility(name);
      setCreated((prev) => [...prev, utility]);
      // Go straight to pricing it: until it has a semester price nobody is billed for it
      openFee({ id: utility.id, name: utility.util_name, prices: [] });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add the fee');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPrice = async () => {
    if (!selected) return;
    const semester = sem.trim();
    if (!semester) {
      Alert.alert('Required', 'Semester is required (e.g. 2026-T1)');
      return;
    }
    if (selected.prices.some((p) => p.sem.toLowerCase() === semester.toLowerCase())) {
      Alert.alert('Already priced', `${selected.name} already has a price for ${semester}.`);
      return;
    }
    const val = isValidCurrencyAmount(amount);
    if (!val.valid) {
      Alert.alert('Invalid Amount', val.error || 'Please check the amount');
      return;
    }

    try {
      setSaving(true);
      const price = await api.createUtilityPrice(selected.id, semester, amount.trim());
      setAmount('');
      setSem('');
      await fetchBills();
      Alert.alert('Price saved', `${selected.name} for ${price.sem} is now ${formatGHS(price.amount)} per student.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save the price');
    } finally {
      setSaving(false);
    }
  };

  const removeFee = async (fee: Fee) => {
    try {
      setSaving(true);
      await api.removeUtility(fee.id);
      setCreated((prev) => prev.filter((u) => u.id !== fee.id));
      setModal(null);
      setSelectedId(null);
      await fetchBills();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to remove the fee');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => {
    if (!selected) return;
    const fee = selected;
    Alert.alert(
      `Remove ${fee.name}?`,
      'It drops off the fee list and students are no longer billed for it. Payments already made on it stay on record.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeFee(fee) },
      ]
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading fees & utilities..." />;
  }

  const renderFee = ({ item }: { item: Fee }) => {
    const shown = item.prices.slice(0, PREVIEW_PRICES);
    const more = item.prices.length - shown.length;
    return (
      <AppCard style={styles.feeCard} onPress={() => openFee(item)}>
        <View style={styles.feeRow}>
          <Text style={[styles.feeName, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
        {shown.length === 0 ? (
          <Text style={[styles.feeHint, { color: colors.warning }]}>No price yet · tap to set one</Text>
        ) : (
          <View style={styles.chips}>
            {shown.map((p) => (
              <View key={p.bill_id} style={[styles.priceChip, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.priceChipSem, { color: colors.textSecondary }]}>{p.sem}</Text>
                <Text style={[styles.priceChipAmount, { color: colors.primary }]}>{formatGHS(p.amount)}</Text>
              </View>
            ))}
            {more > 0 && (
              <Text style={[styles.feeHint, { color: colors.textMuted, marginTop: 0, alignSelf: 'center' }]}>
                +{more} more
              </Text>
            )}
          </View>
        )}
      </AppCard>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <FlatList
        data={fees}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderFee}
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
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Fees & Utilities</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Tap a fee to set its semester price or remove it
              </Text>
            </View>
            <AppButton title="+ Add Fee" variant="primary" size="sm" onPress={openAdd} />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>📋</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No fees yet</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Add a fee (e.g. Tuition), then tap it to set what each student pays per semester.
            </Text>
          </View>
        }
      />

      <Modal visible={modal !== null} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {modal === 'add' ? 'Add Fee' : selected?.name}
              </Text>
              <TouchableOpacity onPress={closeModal} hitSlop={10} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <KeyboardAwareScrollView bottomOffset={KEYBOARD_BOTTOM_OFFSET} keyboardShouldPersistTaps="handled">
              {modal === 'add' ? (
                <>
                  <AppTextInput
                    label="Fee Name"
                    placeholder="e.g. Tuition, Bus Service, PTA Dues"
                    value={newName}
                    onChangeText={setNewName}
                    autoFocus
                  />
                  <AppButton title="Add Fee" variant="primary" loading={saving} onPress={handleAddFee} />
                </>
              ) : selected ? (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Semester prices</Text>
                  {selected.prices.length === 0 ? (
                    <Text style={[styles.feeHint, { color: mustPrice ? colors.warning : colors.textMuted, marginBottom: 8 }]}>
                      {mustPrice
                        ? 'Set a price for a semester before leaving, or remove this fee.'
                        : "No price yet. Students aren't billed for this fee until it has one."}
                    </Text>
                  ) : (
                    selected.prices.map((p) => (
                      <View key={p.bill_id} style={[styles.priceRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.priceSem, { color: colors.textPrimary }]}>{p.sem}</Text>
                        <Text style={[styles.priceAmount, { color: colors.primary }]}>{formatGHS(p.amount)}</Text>
                      </View>
                    ))
                  )}

                  <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>
                    Add a semester price
                  </Text>
                  {semesterChoices.length > 0 && (
                    <View style={[styles.chips, { marginBottom: 10 }]}>
                      {semesterChoices.slice(0, 4).map((s) => (
                        <TouchableOpacity
                          key={s}
                          onPress={() => setSem(s)}
                          style={[
                            styles.semChip,
                            { backgroundColor: sem === s ? colors.primary : colors.surfaceVariant },
                          ]}
                        >
                          <Text
                            style={{ color: sem === s ? '#FFFFFF' : colors.textPrimary, fontSize: 13, fontWeight: '600' }}
                          >
                            {s}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <View style={styles.inputRow}>
                    <View style={{ flex: 1 }}>
                      <AppTextInput
                        label="Semester"
                        placeholder="e.g. 2026-T1"
                        value={sem}
                        onChangeText={setSem}
                        autoCapitalize="characters"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppTextInput
                        label="Price (GH₵)"
                        placeholder="e.g. 500.00"
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                  <AppButton title="Save Price" variant="primary" loading={saving} onPress={handleAddPrice} />

                  <TouchableOpacity onPress={handleRemove} disabled={saving} style={styles.removeBtn}>
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                    <Text style={[styles.removeText, { color: colors.error }]}>Remove fee</Text>
                  </TouchableOpacity>
                </>
              ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  feeCard: {
    padding: 14,
    marginVertical: 5,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  feeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  feeHint: {
    fontSize: 12,
    marginTop: 6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  priceChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  priceChipSem: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceChipAmount: {
    fontSize: 13,
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  priceSem: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  semChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  removeText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
