import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../src/components/ui/Button';
import React from 'react';
import { View, StyleSheet } from 'react-native';;
import { Text, useTheme, Card, List } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function ConfirmationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const handleEnter = () => {
    // Navigate to tabs
    router.replace('/(main)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>{t('confirmationScreen.headerTitle')}</Text>
      </View>
      
      <View style={styles.content}>
        <Card style={styles.card} mode="contained">
          <Card.Content>
            <Text variant="titleLarge" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              {t('confirmationScreen.cardTitle')}
            </Text>
            <List.Item
              title="United States"
              description={t('confirmationScreen.homeCountry')}
              left={props => <List.Icon {...props} icon="earth" />}
              right={props => <List.Icon {...props} icon="check" color={theme.colors.secondary} />}
            />
            <List.Item
              title="USD ($)"
              description={t('confirmationScreen.inferredCurrency')}
              left={props => <List.Icon {...props} icon="currency-usd" />}
              right={props => <List.Icon {...props} icon="check" color={theme.colors.secondary} />}
            />
            <List.Item
              title="US Sizes"
              description={t('confirmationScreen.inferredSizeFormat')}
              left={props => <List.Icon {...props} icon="shoe-sneaker" />}
              right={props => <List.Icon {...props} icon="check" color={theme.colors.secondary} />}
            />
          </Card.Content>
        </Card>
        
        <Text variant="bodyMedium" style={[styles.note, { color: theme.colors.onSurfaceVariant }]}>
          {t('confirmationScreen.note')}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={handleEnter} 
          style={styles.button}
        >
          {t('confirmationScreen.entertriphandyButton')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, alignItems: 'center' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  card: { backgroundColor: '#ffffff', marginBottom: 24 },
  cardTitle: {  marginBottom: 16, textAlign: 'center' },
  note: { textAlign: 'center' },
  footer: { padding: 24, paddingBottom: 40 },
  button: { paddingVertical: 6 }
});
