import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Pressable, Platform } from 'react-native';
import { tokens } from '../../src/theme/tokens';
import { Text, Card, useTheme, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import * as Speech from 'expo-speech';
import ModuleHeader from '../../src/components/app-header/ModuleHeader';
import { useTripStore } from '../../src/stores/trip-store';
import { COUNTRIES } from '../../src/lib/countries';
import { PHRASES_DATA, getLanguageForCountry, getSpeechLanguageCode } from '../../src/lib/basic-phrases-data';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../../src/stores/app-store';
import ProUpgradeModal from '../../src/components/ProUpgradeModal';
import ProIcon from '../../src/components/ProIcon';
export default function BasicPhrasesScreen() {
  const theme = useTheme();
  const { activeTrip } = useTripStore();
  const { settings } = useAppStore();
  const { t, i18n } = useTranslation();
  
  const isPremium = settings?.isPremium;
  const [isPremiumModalVisible, setPremiumModalVisible] = useState(false);

  const activeCountryData = COUNTRIES.find((c: any) => c.name === activeTrip?.destinationCountry);
  const destinationCode = activeCountryData?.code || 'FR';

  const languageKey = getLanguageForCountry(destinationCode);
  const speechLanguageCode = getSpeechLanguageCode(languageKey);
  const phrasesCategories = PHRASES_DATA[languageKey] || PHRASES_DATA['EN'];

  const sortedCategories = [...phrasesCategories].sort((a, b) => {
    const order: Record<string, number> = { 'Basics': 0, 'Emergencies': 1, 'Shopping': 2, 'Hotel & Dining': 3 };
    const aOrder = order[a.category] ?? 99;
    const bOrder = order[b.category] ?? 99;
    return aOrder - bOrder;
  });

  const [activeTab, setActiveTab] = useState(sortedCategories[0]?.category || 'Basics');

  const activeCategoryData = sortedCategories.find(c => c.category === activeTab);

  const speakPhrase = (text: string) => {
    // Remove text in parentheses like "(Konnichiwa)" so the TTS engine doesn't read it twice
    const cleanText = text.replace(/\s*[\[\(].*?[\]\)]\s*/g, '').trim();
    
    Speech.speak(cleanText, {
      language: speechLanguageCode,
      rate: Platform.OS === 'ios' ? 0.4 : 0.8,
    });
  };

  const systemLanguage = i18n.language.toUpperCase().split('-')[0]; // Handle cases like 'en-US' -> 'EN'
  const isSameLanguage = systemLanguage === languageKey;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ModuleHeader title={t("modules.basicPhrases.headerTitle", "Basic Phrases")} />

      {isSameLanguage ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <MaterialCommunityIcons name="translate" size={64} color={theme.colors.outline} style={{ marginBottom: 16 }} opacity={0.5} />
          <Text variant="titleLarge" style={{ textAlign: 'center', color: theme.colors.onSurface,  marginBottom: 8 }}>
            No Translation Needed
          </Text>
          <Text variant="bodyLarge" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
            {t("modules.basicPhrases.noTranslationDesc", "The primary language in {{country}} matches your system language.", { country: activeTrip?.destinationCountry || destinationCode })}
          </Text>
        </View>
      ) : (
        <>
          <View style={{ width: '100%', position: 'relative', marginTop: 16 }}>
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: tokens.colors.ui.warmBorder, zIndex: 0 }} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 4, paddingHorizontal: 16 }}>
              {sortedCategories.map((tab) => {
                const isSelected = activeTab === tab.category;
                const isFreeTab = tab.category === 'Basics' || tab.category === 'Emergencies';
                const isLocked = !isPremium && !isFreeTab;

                return (
                  <Pressable
                    key={tab.category}
                    onPress={() => {
                      if (isLocked) {
                        setPremiumModalVisible(true);
                      } else {
                        setActiveTab(tab.category);
                      }
                    }}
                    style={[
                      { 
                        paddingHorizontal: 16, 
                        paddingVertical: 10, 
                        borderTopLeftRadius: 8, 
                        borderTopRightRadius: 8,
                        borderTopWidth: 1,
                        borderLeftWidth: 1,
                        borderRightWidth: 1,
                        borderBottomWidth: 1,
                        borderColor: tokens.colors.ui.warmBorder,
                        backgroundColor: '#F0F0F0',
                        zIndex: 1
                      },
                      isSelected && { 
                        backgroundColor: tokens.colors.ui.appBackground, 
                        borderBottomColor: tokens.colors.ui.appBackground,
                        zIndex: 2
                      }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ 
                        fontSize: 14, 
                        fontWeight: isSelected ? '600' : '500', 
                        color: isSelected ? tokens.colors.ui.primaryPurple : tokens.colors.ui.textSecondary 
                      }}>
                        {t(`phrases.categories.${tab.category}`)}
                      </Text>
                      {isLocked && <ProIcon size={16} />}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={{ marginBottom: 16 }}>
              <Text variant="titleMedium" style={{ color: theme.colors.onBackground, }}>
                {t("modules.basicPhrases.phrasesInCountry", "Phrases in {{language}} for {{country}}", { language: t(`languages.${languageKey}`, languageKey), country: activeTrip?.destinationCountry || destinationCode })}
              </Text>
            </View>

            {activeCategoryData?.phrases.map((phrase, index) => (
              <Card key={index} style={styles.card} mode="outlined">
                <Card.Content style={styles.cardContent}>
                  <View style={styles.textContainer}>
                    <Text variant="titleMedium" style={{  color: tokens.colors.ui.primaryPurple, marginBottom: 4 }}>
                      {t(`phrases.items.${phrase.id}`)}
                    </Text>
                    <Text variant="bodyLarge" style={{ color: tokens.colors.ui.textPrimary, marginBottom: 4, fontStyle: 'italic' }}>
                      {phrase.local}
                    </Text>

                  </View>
                  <IconButton
                    icon="volume-high"
                    iconColor={tokens.colors.ui.primaryPurple}
                    size={28}
                    onPress={() => speakPhrase(phrase.local)}
                    style={{ backgroundColor: tokens.colors.ui.selectedPurple }}
                  />
                </Card.Content>
              </Card>
            ))}

            {!activeCategoryData && (
              <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 32 }}>
                No phrases available for this category.
              </Text>
            )}
          </ScrollView>
        </>
      )}

      <ProUpgradeModal 
        visible={isPremiumModalVisible} 
        onDismiss={() => setPremiumModalVisible(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', marginBottom: 12, elevation: 0, borderColor: '#E5DED7' },
  cardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textContainer: { flex: 1, paddingRight: 16 },
});


