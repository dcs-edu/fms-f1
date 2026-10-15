import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { GRADE_OPTIONS } from '../../constants/grades';
import { AppTextInput } from '../../components/common/AppTextInput';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { ErrorBanner } from '../../components/common/ErrorBanner';

export const EnrollStudentScreen = () => {
  const { colors } = useAppTheme();

  // Wizard Step: 1 = Personal, 2 = Guardian & Medical
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [fname, setFname] = useState('');
  const [mname, setMname] = useState('');
  const [lname, setLname] = useState('');
  const [grade, setGrade] = useState('3');
  const [dob, setDob] = useState('2017-04-12');
  const [gender, setGender] = useState('M');
  const [nationality, setNationality] = useState('Ghanaian');
  const [address, setAddress] = useState('');

  const [guardian, setGuardian] = useState('');
  const [gContact, setGContact] = useState('');
  const [gOccupation, setGOccupation] = useState('');
  const [eContact, setEContact] = useState('');
  const [medCon, setMedCon] = useState('none');
  const [allergies, setAllergies] = useState('none');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null);

  const handleNext = () => {
    if (!fname.trim() || !lname.trim() || !grade || !dob.trim() || !address.trim()) {
      setError('Please complete all required student personal fields');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleEnroll = async () => {
    if (!guardian.trim() || !gContact.trim() || !gOccupation.trim() || !eContact.trim()) {
      setError('Please complete all required guardian and contact details');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await api.createStudent({
        fname: fname.trim(),
        mname: mname.trim() || undefined,
        lname: lname.trim(),
        grade,
        dob: dob.trim(),
        gender,
        nationality: nationality.trim(),
        address: address.trim(),
        guardian: guardian.trim(),
        g_contact: gContact.trim(),
        g_occupation: gOccupation.trim(),
        e_contact: eContact.trim(),
        med_con: medCon.trim() || 'none',
        allergies: allergies.trim() || 'none',
      });

      setCreatedStudentId(res.student_id);
    } catch (err: any) {
      setError(err.message || 'Student enrollment failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFname('');
    setMname('');
    setLname('');
    setAddress('');
    setGuardian('');
    setGContact('');
    setGOccupation('');
    setEContact('');
    setMedCon('none');
    setAllergies('none');
    setCreatedStudentId(null);
    setStep(1);
  };

  if (createdStudentId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: 20, justifyContent: 'center' }]}>
        <AppCard style={styles.successCard}>
          <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>🎉</Text>
          <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
            Student Enrolled Successfully!
          </Text>
          <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
            The system calculated the graduation year and issued the official student card ID:
          </Text>

          <View style={[styles.idBox, { backgroundColor: colors.currencyBadge }]}>
            <Text style={[styles.idLabel, { color: colors.currencyText }]}>Official Student ID</Text>
            <Text style={[styles.idValue, { color: colors.currencyText }]}>{createdStudentId}</Text>
          </View>

          <AppButton
            title="Enroll Another Student"
            variant="primary"
            onPress={resetForm}
            style={{ marginTop: 20 }}
          />
        </AppCard>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Student Admission Wizard
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Step {step} of 2: {step === 1 ? 'Personal Profile' : 'Guardian & Medical Contacts'}
          </Text>
        </View>

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {step === 1 ? (
          <View>
            <AppTextInput
              label="First Name *"
              placeholder="e.g. Kwame"
              value={fname}
              onChangeText={setFname}
            />

            <AppTextInput
              label="Middle Name"
              placeholder="e.g. Yaw"
              value={mname}
              onChangeText={setMname}
            />

            <AppTextInput
              label="Last Name *"
              placeholder="e.g. Mensah"
              value={lname}
              onChangeText={setLname}
            />

            <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>
              Entry Grade Level *
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gradeScroll}>
              {GRADE_OPTIONS.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  onPress={() => setGrade(g.value)}
                  style={[
                    styles.gradePill,
                    {
                      backgroundColor: grade === g.value ? colors.primary : colors.surfaceVariant,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: grade === g.value ? '#FFFFFF' : colors.textPrimary,
                      fontWeight: '600',
                      fontSize: 12,
                    }}
                  >
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <AppTextInput
              label="Date of Birth (YYYY-MM-DD) *"
              placeholder="2017-04-12"
              value={dob}
              onChangeText={setDob}
            />

            <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Gender *</Text>
            <View style={styles.genderRow}>
              {['M', 'F'].map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGender(g)}
                  style={[
                    styles.genderBtn,
                    {
                      backgroundColor: gender === g ? colors.primary : colors.surfaceVariant,
                    },
                  ]}
                >
                  <Text style={{ color: gender === g ? '#FFFFFF' : colors.textPrimary, fontWeight: '700' }}>
                    {g === 'M' ? 'Male (M)' : 'Female (F)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <AppTextInput
              label="Nationality *"
              placeholder="e.g. Ghanaian"
              value={nationality}
              onChangeText={setNationality}
            />

            <AppTextInput
              label="Residential Address *"
              placeholder="e.g. 12 Ridge Avenue, Kumasi"
              value={address}
              onChangeText={setAddress}
            />

            <AppButton title="Next: Guardian Details →" variant="primary" onPress={handleNext} style={{ marginTop: 12 }} />
          </View>
        ) : (
          <View>
            <AppTextInput
              label="Guardian Full Name *"
              placeholder="e.g. Ama Mensah"
              value={guardian}
              onChangeText={setGuardian}
            />

            <AppTextInput
              label="Guardian Phone Contact *"
              placeholder="e.g. +233201234567"
              value={gContact}
              onChangeText={setGContact}
              keyboardType="phone-pad"
            />

            <AppTextInput
              label="Guardian Occupation *"
              placeholder="e.g. Trader, Civil Servant, Engineer"
              value={gOccupation}
              onChangeText={setGOccupation}
            />

            <AppTextInput
              label="Emergency Contact Phone *"
              placeholder="e.g. +233209876543"
              value={eContact}
              onChangeText={setEContact}
              keyboardType="phone-pad"
            />

            <AppTextInput
              label="Medical Conditions (if any)"
              placeholder="e.g. Asthmatic, None"
              value={medCon}
              onChangeText={setMedCon}
            />

            <AppTextInput
              label="Allergies (if any)"
              placeholder="e.g. Peanuts, Penicillin, None"
              value={allergies}
              onChangeText={setAllergies}
            />

            <View style={styles.stepButtons}>
              <AppButton
                title="← Back"
                variant="outline"
                onPress={() => setStep(1)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Submit & Enroll"
                variant="primary"
                loading={loading}
                onPress={handleEnroll}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
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
  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  gradeScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  gradePill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 6,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  stepButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  successCard: {
    padding: 24,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  idBox: {
    marginTop: 18,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  idLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  idValue: {
    fontSize: 30,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginTop: 4,
  },
});
