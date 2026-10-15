import React from 'react';
import { View, Text, StyleSheet, Share } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { Payment } from '../../api/types';
import { formatGHS } from '../../utils/currency';
import { StatusPill } from './StatusPill';
import { AppButton } from '../common/AppButton';

export interface ReceiptCardProps {
  payment: Payment;
  studentName?: string;
  studentId?: string;
  onClose?: () => void;
}

export const ReceiptCard: React.FC<ReceiptCardProps> = ({
  payment,
  studentName,
  studentId,
  onClose,
}) => {
  const { colors, borderRadius, spacing, shadows, typography } = useAppTheme();

  const handleShare = async () => {
    try {
      const dateStr = payment.paid_at
        ? new Date(payment.paid_at).toLocaleString()
        : new Date(payment.created_at).toLocaleString();

      const message = `Official Payment Receipt\n` +
        `--------------------------\n` +
        `Amount: ${formatGHS(payment.amount)}\n` +
        `Status: ${payment.status.toUpperCase()}\n` +
        (studentName ? `Student: ${studentName}\n` : '') +
        (studentId ? `Student ID: ${studentId}\n` : '') +
        `Reference: ${payment.reference || 'Cash Payment'}\n` +
        `Transaction ID: ${payment.txn_id}\n` +
        `Date: ${dateStr}\n` +
        `--------------------------\n` +
        `Verified by School Management System`;

      await Share.share({ message });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const formattedDate = payment.paid_at
    ? new Date(payment.paid_at).toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date(payment.created_at).toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: borderRadius.xl,
          padding: spacing.xl,
          ...shadows.card,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.schoolName, { color: colors.primary }]}>
            School Fees & Management
          </Text>
          <Text style={[styles.receiptTitle, { color: colors.textPrimary }]}>
            Official Receipt
          </Text>
        </View>
        <StatusPill status={payment.status} />
      </View>

      <View style={[styles.amountContainer, { backgroundColor: colors.currencyBadge }]}>
        <Text style={[styles.amountLabel, { color: colors.currencyText }]}>
          Amount Paid
        </Text>
        <Text style={[styles.amountValue, { color: colors.currencyText }]}>
          {formatGHS(payment.amount)}
        </Text>
      </View>

      <View style={styles.detailsList}>
        {studentName && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Student
            </Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {studentName}
            </Text>
          </View>
        )}

        {studentId && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Student ID
            </Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {studentId}
            </Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Payment Method
          </Text>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
            {payment.reference ? 'Paystack Online' : 'Cash (Recorded)'}
          </Text>
        </View>

        {payment.reference && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Reference
            </Text>
            <Text
              numberOfLines={1}
              ellipsizeMode="middle"
              style={[styles.detailValue, styles.mono, { color: colors.textPrimary }]}
            >
              {payment.reference}
            </Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Date & Time
          </Text>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
            {formattedDate}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Transaction ID
          </Text>
          <Text
            numberOfLines={1}
            ellipsizeMode="middle"
            style={[styles.detailValue, styles.mono, { color: colors.textMuted }]}
          >
            {payment.txn_id}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <AppButton
          title="Share Receipt"
          variant="primary"
          onPress={handleShare}
          style={styles.actionBtn}
        />
        {onClose && (
          <AppButton
            title="Done"
            variant="outline"
            onPress={onClose}
            style={styles.actionBtn}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  schoolName: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  detailsList: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2ECE5',
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
  },
});
