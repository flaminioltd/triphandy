import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../src/components/ui/Button';
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';;
import { Text, useTheme, Card, List, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function UpgradeScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
        <IconButton icon="close" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text variant="headlineMedium" style={{  color: theme.colors.onSurface, textAlign: 'center' }}>
            Unlock Everything
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
            Your 7-day trial includes all modules. Keep them forever with a one-time unlock.
          </Text>
        </View>

        <Card style={styles.card} mode="contained">
          <Card.Content>
            <Text variant="titleMedium" style={{  marginBottom: 16 }}>{t("access.upgrade.freeTitle", "What remains free:")}</Text>
            <List.Item title={t("modules.tipCalculator.headerTitle", "Tip Calculator")} left={props => <List.Icon {...props} icon="calculator" color={theme.colors.onSurfaceVariant} />} style={styles.listItem} />
            <List.Item title={t("modules.sizeConverter.headerTitle", "Size Converter")} left={props => <List.Icon {...props} icon="tshirt-crew" color={theme.colors.onSurfaceVariant} />} style={styles.listItem} />
            <List.Item title={t("access.upgrade.freePlug", "Plug & Voltage")} left={props => <List.Icon {...props} icon="power-plug" color={theme.colors.onSurfaceVariant} />} style={styles.listItem} />
            <List.Item title={t("modules.emergencyEssentials.headerTitle", "Emergency Numbers")} left={props => <List.Icon {...props} icon="phone-alert" color={theme.colors.onSurfaceVariant} />} style={styles.listItem} />
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary, borderWidth: 1 }]} mode="contained">
          <Card.Content>
            <Text variant="titleMedium" style={{  color: theme.colors.primary, marginBottom: 16 }}>{t("access.upgrade.unlockTitle", "Unlock Includes:")}</Text>
            <List.Item title={t("modules.budgetTracker.headerTitle", "Budget Tracker")} left={props => <List.Icon {...props} icon="wallet" color={theme.colors.primary} />} style={styles.listItem} />
            <List.Item title={t("modules.vatRefund.headerTitle", "VAT Refund")} left={props => <List.Icon {...props} icon="cash-refund" color={theme.colors.primary} />} style={styles.listItem} />
            <List.Item title={t("modules.atm.headerTitle", "ATM Exchange")} left={props => <List.Icon {...props} icon="bank" color={theme.colors.primary} />} style={styles.listItem} />
            <List.Item title={t("modules.timezoneHelper.headerTitle", "Time Zones")} left={props => <List.Icon {...props} icon="clock" color={theme.colors.primary} />} style={styles.listItem} />
            
            <View style={styles.priceBox}>
              <Text variant="displaySmall" style={{  color: theme.colors.primary }}>$14.99</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>{t("access.upgrade.oneTimePayment", "One-time payment")}</Text>
            </View>
          </Card.Content>
        </Card>

      </ScrollView>
      
      <View style={styles.footer}>
        <Button mode="contained" onPress={() => {}} style={styles.button} labelStyle={{ paddingVertical: 4 }}>
          Unlock triphandy
        </Button>
        <Button mode="text" onPress={() => {}} style={{ marginTop: 8 }}>
          Restore Purchase
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingRight: 16 },
  content: { padding: 16 },
  hero: { alignItems: 'center', marginBottom: 32, paddingHorizontal: 16 },
  card: { backgroundColor: '#ffffff', marginBottom: 16 },
  listItem: { paddingVertical: 0 },
  priceBox: { alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#cce0ff' },
  footer: { padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: '#EEEEEE', backgroundColor: '#ffffff' },
  button: { paddingVertical: 6 }
});
