import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../src/components/ui/Button';
import ModuleHeader from '../../src/components/app-header/ModuleHeader';
import React, { useState, useEffect } from 'react';
import { COUNTRIES } from '../../src/lib/countries';
import { useTripStore } from '../../src/stores/trip-store';
import { View, StyleSheet, ScrollView, Linking, Pressable } from 'react-native';;
import { Text, Card, useTheme, IconButton, Divider, Menu } from 'react-native-paper';
import { db } from '../../src/db/client';
import { settings as dbSettings, countries } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { EMERGENCY_NUMBERS, PUBLIC_HOLIDAYS, EMBASSIES } from '../../src/lib/local-info-data';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PlugIcon } from '../../src/components/PlugIcons';
import CustomSegmentedControl from '../../src/components/ui/CustomSegmentedControl';
import { tokens } from '../../src/theme/tokens';

export default function LocalInfoScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { activeTrip } = useTripStore();
  
  const [activeTab, setActiveTab] = useState('emergency');
  const [holidayYear, setHolidayYear] = useState('2026');
  const [yearMenuVisible, setYearMenuVisible] = useState(false);
  
  const [homeCountryCode, setHomeCountryCode] = useState('US');
  const activeCountryData = COUNTRIES.find((c: any) => c.name === activeTrip?.destinationCountry);
  const destinationCode = activeCountryData?.code || 'FR';

  useEffect(() => {
    async function loadSettings() {
      try {
        const settingsRes = await db.select().from(dbSettings).limit(1);
        if (settingsRes.length > 0 && settingsRes[0].homeCountry) {
          let cObj = await db.select().from(countries).where(eq(countries.code, settingsRes[0].homeCountry)).limit(1);
          if (cObj.length === 0) {
            cObj = await db.select().from(countries).where(eq(countries.name, settingsRes[0].homeCountry)).limit(1);
          }
          if (cObj.length > 0) {
            setHomeCountryCode(cObj[0].code);
          }
        }
      } catch (error) {
        console.error('Failed to load home country:', error);
      }
    }
    loadSettings();
  }, []);

  const emergencyData = EMERGENCY_NUMBERS[destinationCode];
  const holidaysData = PUBLIC_HOLIDAYS[destinationCode]?.[holidayYear] || [];
  const embassyData = EMBASSIES[destinationCode]?.[homeCountryCode] || null;

  const homeCountry = COUNTRIES.find((c: any) => c.code === homeCountryCode) || COUNTRIES[0];
  const destCountry = COUNTRIES.find((c: any) => c.code === destinationCode) || COUNTRIES[6];
  const homePlugs = homeCountry.plugs || { voltage: 'Unknown', frequency: 'Unknown', types: [] };
  const destPlugs = destCountry.plugs || { voltage: 'Unknown', frequency: 'Unknown', types: [] };
  const needsAdapter = !homePlugs.types.some((t: string) => destPlugs.types.includes(t));
  const needsConverter = homePlugs.voltage !== destPlugs.voltage;

  const translatedHomeCountryName = t(`countries.${homeCountry.code}`, homeCountry.name);
  const translatedDestCountryName = t(`countries.${destCountry.code}`, destCountry.name);

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`).catch(err => console.error('Error opening dialer', err));
  };

  const handleOpenUrl = (url: string) => {
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(formattedUrl).catch(err => console.error('Error opening url', err));
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ModuleHeader title={t("modules.localInfo.headerTitle", "Local Info")} />

      <View style={{ width: '100%', position: 'relative', marginTop: 24 }}>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: theme.colors.outlineVariant, zIndex: 0 }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 4, paddingHorizontal: 16 }}>
          {[
            { value: 'emergency', label: t('modules.localInfo.tabEmergency', 'Emergency') },
            { value: 'holidays', label: t('modules.localInfo.tabHolidays', 'Holidays') },
            { value: 'embassy', label: t('modules.localInfo.tabEmbassy', 'Embassy') },
            { value: 'plugs', label: t('modules.localInfo.tabPlugs', 'Plugs') },
          ].map((tab) => {
            const isSelected = activeTab === tab.value;
            return (
              <Pressable
                key={tab.value}
                onPress={() => setActiveTab(tab.value)}
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
                    borderColor: theme.colors.outlineVariant,
                    backgroundColor: theme.colors.surfaceVariant,
                    zIndex: 1
                  },
                  isSelected && { 
                    backgroundColor: theme.colors.background, 
                    borderBottomColor: theme.colors.background,
                    zIndex: 2
                  }
                ]}
              >
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: isSelected ? '600' : '500', 
                  color: isSelected ? theme.colors.onSurface : theme.colors.onSurfaceVariant 
                }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {activeTab === 'emergency' && (
          <View>
            <Text variant="titleMedium" style={{ marginBottom: 16, color: theme.colors.onBackground, }}>
              {t("modules.localInfo.emergencyNumbersIn", "Emergency Numbers in {{country}}", { country: translatedDestCountryName })}
            </Text>
            {emergencyData ? (
              <Card style={styles.card} mode="contained">
                <Card.Content style={{ gap: 16 }}>
                  
                  <View style={styles.row}>
                    <View style={styles.iconContainer}>
                      <IconButton icon="phone-alert" size={24} iconColor={theme.colors.error} />
                      <View>
                        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>{t("modules.localInfo.generalEmergency", "General Emergency")}</Text>
                        <Text variant="headlineMedium" style={{  color: theme.colors.error }}>{emergencyData.general}</Text>
                      </View>
                    </View>
                    <Button mode="contained" buttonColor={theme.colors.error} onPress={() => handleCall(emergencyData.general)}>{t("modules.localInfo.callButton", "Call")}</Button>
                  </View>
                  <Divider />

                  <View style={styles.row}>
                    <View style={styles.iconContainer}>
                      <IconButton icon="police-badge" size={24} iconColor={theme.colors.primary} />
                      <View>
                        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>{t("modules.localInfo.police", "Police")}</Text>
                        <Text variant="headlineMedium" style={{  color: theme.colors.primary }}>{emergencyData.police}</Text>
                      </View>
                    </View>
                    <Button mode="contained" onPress={() => handleCall(emergencyData.police)}>{t("modules.localInfo.callButton", "Call")}</Button>
                  </View>
                  <Divider />

                  <View style={styles.row}>
                    <View style={styles.iconContainer}>
                      <IconButton icon="ambulance" size={24} iconColor="#E57373" />
                      <View>
                        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>{t("modules.localInfo.ambulance", "Ambulance")}</Text>
                        <Text variant="headlineMedium" style={{  color: "#E57373" }}>{emergencyData.ambulance}</Text>
                      </View>
                    </View>
                    <Button mode="contained" buttonColor="#E57373" onPress={() => handleCall(emergencyData.ambulance)}>{t("modules.localInfo.callButton", "Call")}</Button>
                  </View>
                  <Divider />

                  <View style={styles.row}>
                    <View style={styles.iconContainer}>
                      <IconButton icon="fire-truck" size={24} iconColor="#FF9800" />
                      <View>
                        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>{t("modules.localInfo.fire", "Fire Department")}</Text>
                        <Text variant="headlineMedium" style={{  color: "#FF9800" }}>{emergencyData.fire}</Text>
                      </View>
                    </View>
                    <Button mode="contained" buttonColor="#FF9800" onPress={() => handleCall(emergencyData.fire)}>{t("modules.localInfo.callButton", "Call")}</Button>
                  </View>

                </Card.Content>
              </Card>
            ) : (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>{t("modules.localInfo.noEmergencyData", "No emergency data available for this country.")}</Text>
            )}
          </View>
        )}

        {activeTab === 'holidays' && (
          <View>
            <View style={{ flexDirection: 'column', alignItems: 'flex-start', marginBottom: 16, gap: 12 }}>
              <Text variant="titleMedium" style={{ color: theme.colors.onBackground, }}>
                {t("modules.localInfo.holidaysIn", "Public Holidays in {{country}}", { country: translatedDestCountryName })}
              </Text>
              <Menu
                visible={yearMenuVisible}
                onDismiss={() => setYearMenuVisible(false)}
                contentStyle={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant,
                  marginTop: 4,
                }}
                anchor={
                  <Pressable 
                    onPress={() => setYearMenuVisible(true)}
                    style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      gap: 8, 
                      paddingHorizontal: 12, 
                      paddingVertical: 6, 
                      backgroundColor: theme.colors.surface, 
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: theme.colors.outlineVariant,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 1
                    }}
                  >
                    <Text style={{ fontSize: 14,  color: theme.colors.onSurface }}>
                      {holidayYear}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color={theme.colors.onSurfaceVariant} />
                  </Pressable>
                }
              >
                <Menu.Item onPress={() => { setHolidayYear('2026'); setYearMenuVisible(false); }} title="2026" trailingIcon={holidayYear === '2026' ? 'check' : undefined} />
                <Menu.Item onPress={() => { setHolidayYear('2027'); setYearMenuVisible(false); }} title="2027" trailingIcon={holidayYear === '2027' ? 'check' : undefined} />
              </Menu>
            </View>

            {holidaysData.length > 0 ? (
              <Card style={styles.card} mode="contained">
                <Card.Content style={{ padding: 0 }}>
                  {holidaysData.map((h: any, i: number) => {
                    const dateObj = new Date(h.date);
                    const isPassed = dateObj < new Date();
                    
                    let isDuringTrip = false;
                    if (activeTrip?.startDate && activeTrip?.endDate) {
                      const tripStart = new Date(activeTrip.startDate);
                      const tripEnd = new Date(activeTrip.endDate);
                      tripStart.setHours(0,0,0,0);
                      tripEnd.setHours(23,59,59,999);
                      if (dateObj >= tripStart && dateObj <= tripEnd) {
                        isDuringTrip = true;
                      }
                    }

                    return (
                      <View key={i} style={[
                        styles.holidayRow, 
                        i !== holidaysData.length - 1 && styles.borderBottom, 
                        isPassed && !isDuringTrip && { opacity: 0.5 },
                        isDuringTrip && { backgroundColor: theme.colors.secondaryContainer }
                      ]}>
                        <View style={[styles.holidayDate, isDuringTrip && { backgroundColor: theme.colors.primary }]}>
                          <Text variant="titleMedium" style={{  color: isDuringTrip ? theme.colors.onPrimary : theme.colors.primary }}>{dateObj.getDate()}</Text>
                          <Text variant="labelSmall" style={{ color: isDuringTrip ? theme.colors.onPrimary : theme.colors.onSurfaceVariant, textTransform: 'uppercase' }}>
                            {dateObj.toLocaleString(i18n.language || 'en-US', { month: 'short' })}
                          </Text>
                        </View>
                        <View style={styles.holidayInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text variant="bodyLarge" style={{ color: isDuringTrip ? theme.colors.onSecondaryContainer : theme.colors.onSurface }}>{h.name}</Text>
                          </View>
                          <Text variant="bodySmall" style={{ color: isDuringTrip ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant, opacity: isDuringTrip ? 0.8 : 1 }}>
                            {dateObj.toLocaleString(i18n.language || 'en-US', { weekday: 'long' })}
                          </Text>
                        </View>
                        {isDuringTrip && (
                          <View style={{ position: 'absolute', bottom: 12, right: 16, backgroundColor: '#4A2C8F', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 10, }}>{t("modules.localInfo.duringTrip", "DURING TRIP")}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </Card.Content>
              </Card>
            ) : (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>{t("modules.localInfo.noHolidayData", "No holiday data available for {{year}}.", { year: holidayYear })}</Text>
            )}
          </View>
        )}

        {activeTab === 'embassy' && (
          <View>
            <Text variant="titleMedium" style={{ marginBottom: 16, color: theme.colors.onBackground, }}>
              {t("modules.localInfo.embassyTitle", "Embassy Info")}
            </Text>
            <Text variant="bodyMedium" style={{ marginBottom: 16, color: theme.colors.onSurfaceVariant }}>
              {t("modules.localInfo.embassyDesc", "The embassy of {{homeCountry}} in {{destCountry}}.", { homeCountry: translatedHomeCountryName, destCountry: translatedDestCountryName })}
            </Text>

            {embassyData ? (
              <Card style={styles.card} mode="contained">
                <Card.Content style={{ gap: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <IconButton icon="bank" size={32} iconColor={theme.colors.primary} style={{ margin: 0, backgroundColor: theme.colors.primaryContainer }} />
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={{ }}>{t('modules.localInfo.address', 'Address')}</Text>
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{embassyData.address}</Text>
                      <View style={{ alignItems: 'flex-start', marginTop: 8 }}>
                        <Button 
                          mode="outlined" 
                          icon="map-marker"
                          disabled={!embassyData.address || embassyData.address === 'Address not available' || embassyData.address === 'N/A'}
                          onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(embassyData.address)}`)}
                        >
                          {t('modules.localInfo.showOnMap', 'Show on map')}
                        </Button>
                      </View>
                    </View>
                  </View>

                  <Divider />

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <IconButton icon="phone" size={32} iconColor={theme.colors.primary} style={{ margin: 0, backgroundColor: theme.colors.primaryContainer }} />
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={{ }}>{t('modules.localInfo.phone', 'Phone')}</Text>
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{embassyData.phone}</Text>
                      <View style={{ alignItems: 'flex-start', marginTop: 8 }}>
                        <Button mode="outlined" icon="phone" disabled={!embassyData.phone || embassyData.phone === 'Phone not available' || embassyData.phone === 'N/A'} onPress={() => handleCall(embassyData.phone)}>{t("modules.localInfo.callButton", "Call")}</Button>
                      </View>
                    </View>
                  </View>

                  <Divider />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <IconButton icon="web" size={32} iconColor={theme.colors.primary} style={{ margin: 0, backgroundColor: theme.colors.primaryContainer }} />
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={{ }}>{t('modules.localInfo.website', 'Website')}</Text>
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{embassyData.website || t('modules.localInfo.notAvailable', 'Not available')}</Text>
                      <View style={{ alignItems: 'flex-start', marginTop: 8 }}>
                        <Button mode="outlined" icon="open-in-new" disabled={!embassyData.website || embassyData.website === 'N/A'} onPress={() => handleOpenUrl(embassyData.website!)}>{t("modules.localInfo.visitButton", "Visit")}</Button>
                      </View>
                    </View>
                  </View>

                </Card.Content>
              </Card>
            ) : (
              <Card style={styles.card} mode="contained">
                <Card.Content>
                  <Text variant="bodyLarge" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, marginVertical: 24 }}>
                    {t("modules.localInfo.embassyUnavailable", "Embassy information for {{homeCountry}} in {{destCountry}} is currently unavailable.", { homeCountry: translatedHomeCountryName, destCountry: translatedDestCountryName })}
                  </Text>
                </Card.Content>
              </Card>
            )}
          </View>
        )}

        {activeTab === 'plugs' && (
          <View>
            <Card style={[styles.statusCard, { backgroundColor: needsAdapter ? tokens.colors.state.errorSoft : theme.colors.primaryContainer }]} mode="contained">
              <Card.Content style={styles.statusContent}>
                <MaterialIcons 
                  name={needsAdapter ? 'electrical-services' : 'check-circle'} 
                  size={32} 
                  color={needsAdapter ? theme.colors.error : theme.colors.onPrimaryContainer} 
                  style={{ marginBottom: 8 }}
                />
                <Text variant="headlineSmall" style={{  color: needsAdapter ? theme.colors.error : theme.colors.onPrimaryContainer, textAlign: 'center' }}>
                  {needsAdapter ? t('modules.plugVoltage.incompatibleTitle', 'Adapter Required') : t('modules.plugVoltage.compatibleTitle', 'No Adapter Needed')}
                </Text>
                <Text variant="bodyMedium" style={{ color: needsAdapter ? theme.colors.error : theme.colors.onPrimaryContainer, textAlign: 'center', marginTop: 8 }}>
                  {needsAdapter ? t('modules.plugVoltage.incompatibleDesc', 'You will need a travel adapter for {{country}}.', { country: translatedDestCountryName }) : t('modules.plugVoltage.compatibleDesc', 'Your plugs will fit in {{country}}.', { country: translatedDestCountryName })}
                </Text>
              </Card.Content>
            </Card>

            {needsConverter && (
              <View style={[styles.warningBox, { backgroundColor: theme.colors.tertiaryContainer }]}>
                <MaterialIcons name="warning" size={24} color={theme.colors.onTertiaryContainer} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="titleMedium" style={{  color: theme.colors.onTertiaryContainer }}>{t("modules.plugVoltage.voltageMismatchTitle", "Voltage Difference")}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onTertiaryContainer, marginTop: 4 }}>
                    {t("modules.plugVoltage.voltageMismatchDesc", '{{home}} uses {{homeVolts}}, but {{dest}} uses {{destVolts}}. Check if your devices say "100-240V". If not, you need a voltage converter, not just an adapter.', { home: translatedHomeCountryName, homeVolts: homePlugs.voltage, dest: translatedDestCountryName, destVolts: destPlugs.voltage })}
                  </Text>
                </View>
              </View>
            )}

            <Text variant="titleMedium" style={{  marginBottom: 16, marginTop: 8, textAlign: 'center' }}>{t("modules.plugVoltage.plugTypesTitle", "{{country}} Socket Types", { country: translatedDestCountryName })}</Text>
            
            <View style={styles.iconsGrid}>
              {destPlugs.types.map((type: string) => (
                <View key={type} style={[styles.iconWrapper, { backgroundColor: theme.colors.surface }]}>
                  <PlugIcon type={type} size={90} color={theme.colors.onSurface} />
                  <Text variant="titleMedium" style={{  marginTop: 12 }}>{t("modules.plugVoltage.typeN", "Type {{type}}", { type })}</Text>
                </View>
              ))}
            </View>

            <Divider style={{ marginVertical: 24 }} />

            <View style={styles.detailsRow}>
              <View style={styles.detailBox}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, }}>{`${t("modules.localInfo.origin", "Origin").toUpperCase()} (${homeCountry.code})`}</Text>
                <Text variant="titleLarge" style={{  marginTop: 4 }}>{homePlugs.voltage}</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{homePlugs.frequency}</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>{t("modules.plugVoltage.typesList", "Type {{types}}", { types: homePlugs.types.join(', ') })}</Text>
              </View>

              <View style={[styles.verticalDivider, { backgroundColor: theme.colors.outlineVariant }]} />

              <View style={styles.detailBox}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, }}>{t("modules.plugVoltage.destCountryCode", "LOCAL ({{code}})", { code: destCountry.code })}</Text>
                <Text variant="titleLarge" style={{  marginTop: 4 }}>{destPlugs.voltage}</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{destPlugs.frequency}</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>{t("modules.plugVoltage.typesList", "Type {{types}}", { types: destPlugs.types.join(', ') })}</Text>
              </View>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#ffffff', marginBottom: 24, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  holidayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  holidayDate: { width: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 8, paddingVertical: 8, marginRight: 16 },
  holidayInfo: { flex: 1 },
  statusCard: { elevation: 0, borderRadius: 24, marginBottom: 16 },
  statusContent: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  warningBox: { flexDirection: 'row', padding: 16, borderRadius: 16, marginBottom: 24, alignItems: 'center' },
  iconsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  iconWrapper: { alignItems: 'center', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, minWidth: 120 },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' },
  detailBox: { alignItems: 'center', flex: 1 },
  verticalDivider: { width: 1, height: 60 }
});
