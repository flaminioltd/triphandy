import { SafeAreaView } from 'react-native-safe-area-context';
import ModuleHeader from '../../src/components/app-header/ModuleHeader';
import React from 'react';
import { COUNTRIES } from '../../src/lib/countries';
import { FLAG_IMAGES } from '../../src/lib/assets';
import { useTripStore } from '../../src/stores/trip-store';
import { View, Image, StyleSheet, ScrollView } from 'react-native';;
import { Text, useTheme, IconButton, Card, List } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { tokens } from '../../src/theme/tokens';

export default function EmergencyEssentialsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { activeTrip } = useTripStore();
  const activeCountryCode = activeTrip ? COUNTRIES.find((c: any) => c.name === activeTrip.destinationCountry)?.code : null;

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ModuleHeader title={t("modules.emergencyEssentials.headerTitle", "Emergency Numbers")} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.destinationHeader}>
          <Text variant="headlineMedium" style={{  color: tokens.colors.ui.textPrimary }}>France</Text>
          <View style={[styles.offlineBadge, { backgroundColor: tokens.colors.ui.selectedPurple }]}>
            <Text variant="labelSmall" style={{ color: tokens.colors.ui.primaryPurple }}>{t("modules.emergencyEssentials.offlineReady", "Offline Ready")}</Text>
          </View>
        </View>

        <Card style={styles.emergencyCard} mode="contained">
          <Card.Content>
            <View style={styles.emergencyRow}>
              <View>
                <Text variant="titleMedium" style={{  color: theme.colors.error }}>{t("modules.emergencyEssentials.generalEmergency", "General Emergency")}</Text>
                <Text variant="displaySmall" style={{  color: theme.colors.error }}>112</Text>
              </View>
              <IconButton icon="phone" mode="contained" containerColor={theme.colors.errorContainer} iconColor={theme.colors.error} size={32} onPress={() => {}} />
            </View>
          </Card.Content>
        </Card>

        <Text variant="titleMedium" style={[styles.sectionTitle, { color: tokens.colors.ui.textPrimary }]}>{t("modules.emergencyEssentials.specificServices", "Specific Services")}</Text>
        <Card style={styles.card} mode="outlined">
          <List.Item
            title="15"
            description={t("modules.emergencyEssentials.medicalAmbulance", "Medical Emergency / Ambulance (SAMU)")}
            left={props => <List.Icon {...props} icon="ambulance" />}
            right={props => <IconButton icon="content-copy" onPress={() => {}} />}
          />
          <List.Item
            title="17"
            description={t("modules.emergencyEssentials.police", "Police")}
            left={props => <List.Icon {...props} icon="police-badge" />}
            right={props => <IconButton icon="content-copy" onPress={() => {}} />}
          />
          <List.Item
            title="18"
            description={t("modules.emergencyEssentials.fire", "Fire Department")}
            left={props => <List.Icon {...props} icon="fire-truck" />}
            right={props => <IconButton icon="content-copy" onPress={() => {}} />}
          />
        </Card>

        <Text variant="titleMedium" style={[styles.sectionTitle, { color: tokens.colors.ui.textPrimary, marginTop: 24 }]}>{t("modules.emergencyEssentials.pharmacyNoteTitle", "Local Pharmacy Note")}</Text>
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="bodyMedium" style={{ color: tokens.colors.ui.textSecondary }}>
              {t("modules.emergencyEssentials.pharmacyNoteDesc", 'Look for a flashing green cross. In France, pharmacists can provide medical advice for minor ailments. For after-hours pharmacies ("Pharmacie de garde"), check the notices on any closed pharmacy door.')}
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16, borderBottomWidth: 1 },
  content: { padding: 16 },
  destinationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  offlineBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  emergencyCard: { backgroundColor: '#FDECEC', marginBottom: 32, elevation: 0 },
  emergencyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: {  marginBottom: 12 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#E5DED7' }
});


