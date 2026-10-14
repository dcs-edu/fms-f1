import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { ReceiptCard } from '../../components/payments/ReceiptCard';

export const ReceiptScreen = ({ route, navigation }: any) => {
  const { payment, studentName, studentId } = route.params;
  const { colors } = useAppTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <ReceiptCard
        payment={payment}
        studentName={studentName}
        studentId={studentId}
        onClose={() => navigation.goBack()}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    justifyContent: 'center',
  },
});
