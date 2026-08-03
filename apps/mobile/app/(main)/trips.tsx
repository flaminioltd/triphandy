import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image, Alert, ImageBackground } from 'react-native';
import { Text, useTheme, Modal, Portal, Divider, Switch } from 'react-native-paper';
import Button from '../../src/components/ui/Button';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { useTripStore } from '../../src/stores/trip-store';
import { useAppStore } from '../../src/stores/app-store';
import { COUNTRIES } from '../../src/lib/countries';
import { COVER_IMAGES } from '../../src/lib/assets';
import AddTripModal from '../../src/components/AddTripModal';
import PastTripSummaryModal from '../../src/components/PastTripSummaryModal';
import ProUpgradeModal from '../../src/components/ProUpgradeModal';
import ProIcon from '../../src/components/ProIcon';
import { useTranslation } from 'react-i18next';

export default function TripsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { trips, activeTrip, loadTrips, removeTrip, updateTrip, expenses } = useTripStore();
  const { settings, loadSettings } = useAppStore();
  const { t, i18n } = useTranslation();

  const [editingTrip, setEditingTrip] = useState<any>(null);
  const [editStartDate, setEditStartDate] = useState<Date | null>(null);
  const [editEndDate, setEditEndDate] = useState<Date | null>(null);
  const [editNotSetYet, setEditNotSetYet] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isAddTripVisible, setAddTripVisible] = useState(false);
  const [budgetViewMode, setBudgetViewMode] = useState<'total' | 'daily'>('total');
  const [summaryTrip, setSummaryTrip] = useState<any>(null);
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);
  const [isPremiumModalVisible, setPremiumModalVisible] = useState(false);
  
  const [editTempStart, setEditTempStart] = useState<string | null>(null);
  const [editMarkedDates, setEditMarkedDates] = useState<any>({});

  useEffect(() => {
    loadTrips();
    loadSettings();
  }, []);

  const openEditModal = (trip: any) => {
    setEditingTrip(trip);
    setEditStartDate(trip.startDate ? new Date(trip.startDate) : null);
    setEditEndDate(trip.endDate ? new Date(trip.endDate) : null);
    setEditNotSetYet(!trip.startDate && !trip.endDate);
  };

  const openSummaryModal = (trip: any) => {
    setSummaryTrip(trip);
    setIsSummaryVisible(true);
  };

  const handleEditDayPress = (day: any) => {
    if (!editTempStart) {
      setEditTempStart(day.dateString);
      setEditMarkedDates({
        [day.dateString]: { startingDay: true, endingDay: true, color: theme.colors.primary, textColor: 'white' }
      });
      setEditStartDate(new Date(day.timestamp));
      setEditEndDate(null);
    } else {
      const start = new Date(editTempStart);
      const end = new Date(day.timestamp);
      if (end < start) {
        setEditTempStart(day.dateString);
        setEditMarkedDates({
          [day.dateString]: { startingDay: true, endingDay: true, color: theme.colors.primary, textColor: 'white' }
        });
        setEditStartDate(new Date(day.timestamp));
        setEditEndDate(null);
      } else {
        const range: any = {};
        let current = new Date(start);
        while (current <= end) {
          const dateString = current.toISOString().split('T')[0];
          if (current.getTime() === start.getTime()) {
            range[dateString] = { startingDay: true, color: theme.colors.primary, textColor: 'white' };
          } else if (current.getTime() === end.getTime()) {
            range[dateString] = { endingDay: true, color: theme.colors.primary, textColor: 'white' };
          } else {
            range[dateString] = { color: theme.colors.primaryContainer, textColor: theme.colors.onPrimaryContainer };
          }
          current.setDate(current.getDate() + 1);
        }
        setEditMarkedDates(range);
        setEditStartDate(start);
        setEditEndDate(end);
        setEditTempStart(null);
        setTimeout(() => setShowPicker(false), 300);
      }
    }
  };

  const saveEditTrip = async () => {
    if (editingTrip) {
      await updateTrip(editingTrip.id, {
        startDate: editNotSetYet ? null : editStartDate,
        endDate: editNotSetYet ? null : editEndDate,
      });
      setEditingTrip(null);
      loadTrips();
    }
  };

  const handleDelete = (id: string, destination: string) => {
    const destCode = COUNTRIES.find(c => c.name === destination)?.code;
    const translatedDest = destCode ? t(`countries.${destCode}`, destination) : destination;
    Alert.alert(
      t('tripsScreen.deleteTripAlertTitle', 'Delete Trip'),
      t('tripsScreen.deleteTripAlertMessage', { country: translatedDest, defaultValue: `Are you sure you want to delete your trip to ${translatedDest}?` }),
      [
        { text: t('tripsScreen.editTripCancel', 'Cancel'), style: "cancel" },
        { 
          text: t('tripsScreen.deleteTripAlertTitle', 'Delete'), 
          style: "destructive", 
          onPress: () => removeTrip(id) 
        }
      ]
    );
  };

  const formatDateRange = (start: Date | null | undefined, end: Date | null | undefined) => {
    if (!start || !end) return t('tripsScreen.datesPending', 'Dates pending');
    const s = new Date(start);
    const e = new Date(end);
    const locale = i18n.language || 'en-US';
    return `${s.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} — ${e.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  // Basic separation logic
  const today = new Date();
  today.setHours(0,0,0,0);

  const isPastTrip = (t: any) => {
    if (!t.endDate) return false;
    const e = new Date(t.endDate);
    e.setHours(0,0,0,0);
    return e < today;
  };

  const upcomingTrips = trips
    .filter(t => t.id !== activeTrip?.id && !isPastTrip(t))
    .sort((a, b) => {
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
  const pastTrips = trips.filter(t => t.id !== activeTrip?.id && isPastTrip(t));

  const getTripStatus = (start: Date | null | undefined, end: Date | null | undefined) => {
    if (!start || !end) return { title: t('tripsScreen.tripStatus.pending'), subtitle: t('tripsScreen.tripStatus.pendingSubtitle') };
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const s = new Date(start);
    s.setHours(0,0,0,0);
    const e = new Date(end);
    e.setHours(0,0,0,0);
    
    if (today < s) {
      const diffTime = Math.abs(s.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { title: t('tripsScreen.tripStatus.upcoming'), subtitle: t('tripsScreen.tripStatus.upcomingSubtitle', { days: diffDays }) };
    } else if (today >= s && today <= e) {
      const diffTimeStart = Math.abs(today.getTime() - s.getTime());
      const currentDay = Math.floor(diffTimeStart / (1000 * 60 * 60 * 24)) + 1;
      
      const totalTime = Math.abs(e.getTime() - s.getTime());
      const totalDays = Math.ceil(totalTime / (1000 * 60 * 60 * 24)) + 1;
      
      return { title: t('tripsScreen.tripStatus.ongoing'), subtitle: t('tripsScreen.tripStatus.ongoingSubtitle', { current: currentDay, total: totalDays }) };
    } else {
      return { title: t('tripsScreen.tripStatus.completed'), subtitle: t('tripsScreen.tripStatus.completedSubtitle') };
    }
  };

  const statusInfo = activeTrip ? getTripStatus(activeTrip.startDate, activeTrip.endDate) : { title: t('tripsScreen.tripStatus.pending'), subtitle: t('tripsScreen.tripStatus.pendingSubtitle') };

  // Budget calculations for active trip
  const homeCountry = settings?.homeCountry;
  const homeCurrency = settings?.homeCurrency || (homeCountry ? COUNTRIES.find((c: any) => c.code === homeCountry || c.name === homeCountry)?.currencyCode : null) || 'USD';
  
  const budgetNum = activeTrip?.budget || 0;
  const budgetType = activeTrip?.budgetType || 'trip';
  const trackCurrency = activeTrip?.trackCurrency || 'local';
  
  const tripDays = activeTrip?.startDate && activeTrip?.endDate ? 
    Math.max(1, Math.ceil((new Date(activeTrip.endDate).getTime() - new Date(activeTrip.startDate).getTime()) / (1000 * 60 * 60 * 24))) 
    : 1;

  const totalTripBudget = budgetType === 'trip' ? budgetNum : budgetNum * tripDays;
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const spentTodayDisplay = expenses
    .filter(e => new Date(e.date).getTime() >= todayStart.getTime())
    .reduce((sum, e) => sum + (trackCurrency === 'home' ? (e.convertedAmount || 0) : e.localAmount), 0);

  const totalSpentDisplay = expenses.reduce((sum, e) => sum + (trackCurrency === 'home' ? (e.convertedAmount || 0) : e.localAmount), 0);
  const totalProgress = totalTripBudget > 0 ? Math.min(1, totalSpentDisplay / totalTripBudget) : 0;
  
  const todayBudgetLimit = budgetType === 'trip' ? (budgetNum / tripDays) : budgetNum;
  const todayProgress = todayBudgetLimit > 0 ? Math.min(1, spentTodayDisplay / todayBudgetLimit) : 0;

  const currentProgress = budgetViewMode === 'total' ? totalProgress : todayProgress;
  const currentProgressPercent = Math.round(currentProgress * 100);

  const getProgressColor = (progress: number) => {
    if (progress < 0.5) return '#4CAF50'; // Green
    if (progress < 0.7) return '#FF9800'; // Light Orange
    if (progress < 0.9) return '#F57C00'; // Dark Orange
    return '#F44336'; // Red
  };

  const miniButtonContentStyle = { height: 24 };
  const miniButtonLabelStyle = { fontSize: 10, marginHorizontal: 12, marginVertical: 2 };

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View>
          <Text variant="headlineLarge" style={{ color: theme.colors.onSurface, }}>{t('tripsScreen.headerTitle')}</Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            {t('tripsScreen.headerSubtitle')}
          </Text>
        </View>
      </View>

      {/* Plan New Trip */}
      <Pressable 
        onPress={() => setAddTripVisible(true)}
        style={({pressed}) => [
          styles.addCardRow, 
          { borderColor: theme.colors.outlineVariant, marginBottom: 32 },
          pressed && { backgroundColor: theme.colors.surfaceVariant }
        ]}
      >
        <View style={[styles.addIconContainerSmall, { backgroundColor: theme.colors.surfaceVariant }]}>
          <MaterialIcons name="add" size={24} color={theme.colors.primary} />
        </View>
        <View style={{ marginLeft: 16 }}>
          <Text variant="titleMedium" style={{  color: theme.colors.onSurface }}>{t('tripsScreen.planNewTripTitle')}</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t('tripsScreen.planNewTripSubtitle')}</Text>
        </View>
      </Pressable>

      {/* Active Trip Bento */}
      {activeTrip && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="near-me" size={24} color={theme.colors.primary} />
            <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{t('tripsScreen.activeTripTitle')}</Text>
          </View>
          <View style={[styles.combinedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            {/* Main Feature */}
            <View style={styles.combinedFeatureArea}>
              {(() => {
                const activeCountryCode = COUNTRIES.find(c => c.name === activeTrip.destinationCountry)?.code;
                if (activeCountryCode && COVER_IMAGES[activeCountryCode]) {
                  return <Image source={COVER_IMAGES[activeCountryCode]} style={[styles.mainFeatureBg, { width: '100%', height: '100%' }]} resizeMode="cover" />;
                }
                return <View style={[styles.mainFeatureBg, { backgroundColor: theme.colors.primaryContainer }]} />;
              })()}
              <View style={styles.mainFeatureContent}>
                <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.badgeText, { color: theme.colors.onPrimary }]}>{statusInfo.title.toUpperCase()}</Text>
                </View>
                <Text variant="headlineMedium" style={{ color: '#fff', }}>
                  {(() => {
                    const code = COUNTRIES.find(c => c.name === activeTrip.destinationCountry)?.code;
                    return code ? t(`countries.${code}`, activeTrip.destinationCountry) : activeTrip.destinationCountry;
                  })()}
                </Text>
                <Text variant="bodyLarge" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {formatDateRange(activeTrip.startDate, activeTrip.endDate)}
                </Text>
              </View>
            </View>

            {/* Status Info */}
            <View style={styles.combinedStatusArea}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>{t('tripsScreen.tripStatusLabel')}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <MaterialIcons name="calendar-today" size={20} color={theme.colors.primary} />
                </View>
                <View>
                  <Text variant="titleMedium" style={{  color: theme.colors.onSurface }}>{statusInfo.title}</Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{statusInfo.subtitle}</Text>
                </View>
              </View>

              <View style={[styles.budgetArea, { borderTopColor: theme.colors.outlineVariant }]}>
                {/* Row 1 */}
                <View style={{ marginBottom: 8 }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {budgetViewMode === 'total' ? t('tripsScreen.tripBudgetUsed') : t('tripsScreen.dailyBudgetUsed')}
                  </Text>
                </View>

                {/* Row 2 */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Button 
                    variant="alternative"
                    compact
                    onPress={() => {
                      if (!settings?.isPremium) {
                        setPremiumModalVisible(true);
                      } else {
                        router.push('/modules/budget-tracker');
                      }
                    }}
                    icon={!settings?.isPremium ? () => <ProIcon size={14} /> : undefined}
                    contentStyle={[miniButtonContentStyle, !settings?.isPremium && { flexDirection: 'row-reverse' }]}
                    labelStyle={miniButtonLabelStyle}
                  >
                    {(!activeTrip.budget || activeTrip.budget <= 0) ? t('tripsScreen.budgetSet') : t('tripsScreen.budgetAdjust')}
                  </Button>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, marginRight: 0, color: budgetViewMode === 'daily' ? theme.colors.onSurface : theme.colors.onSurfaceVariant, fontWeight: budgetViewMode === 'daily' ? 'bold' : 'normal' }}>{t('tripsScreen.budgetDaily')}</Text>
                        <Switch 
                          value={budgetViewMode === 'total'} 
                          onValueChange={(val) => setBudgetViewMode(val ? 'total' : 'daily')} 
                          color={theme.colors.primary}
                          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }], marginHorizontal: -4 }}
                        />
                        <Text style={{ fontSize: 12, marginLeft: 0, color: budgetViewMode === 'total' ? theme.colors.onSurface : theme.colors.onSurfaceVariant, fontWeight: budgetViewMode === 'total' ? 'bold' : 'normal' }}>{t('tripsScreen.budgetTrip')}</Text>
                      </View>
                    </View>
                </View>

                {/* Row 3 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={[styles.progressBar, { backgroundColor: theme.colors.surfaceVariant, flex: 1, marginRight: 12 }]}>
                    <View style={[styles.progressFill, { backgroundColor: getProgressColor(currentProgress), width: `${currentProgressPercent}%` }]} />
                  </View>
                  <Text variant="bodySmall" style={{  color: theme.colors.onSurface }}>{currentProgressPercent}%</Text>
                </View>
              </View>

              <Divider style={{ marginVertical: 16 }} />

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-start' }}>
                <Button 
                  variant="alternative"
                  compact
                  onPress={() => openEditModal(activeTrip)} 
                  contentStyle={miniButtonContentStyle}
                  labelStyle={miniButtonLabelStyle}
                >
                  {t('tripsScreen.editTripButton')}
                </Button>
                <Button 
                  variant="destructive"
                  compact
                  onPress={() => handleDelete(activeTrip.id, activeTrip.destinationCountry)} 
                  contentStyle={miniButtonContentStyle}
                  labelStyle={miniButtonLabelStyle}
                >
                  {t('tripsScreen.deleteTripButton')}
                </Button>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Upcoming Trips */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="event" size={24} color={theme.colors.primary} />
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{t('tripsScreen.upcomingTripsTitle')}</Text>
        </View>

        <View style={styles.grid}>
          {upcomingTrips.map(trip => {
            const countryCode = COUNTRIES.find(c => c.name === trip.destinationCountry)?.code;
            return (
              <View key={trip.id} style={[styles.tripCard, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
                {countryCode && COVER_IMAGES[countryCode] ? (
                  <View style={styles.tripCardImagePlaceholder}>
                    <Image 
                      source={COVER_IMAGES[countryCode]} 
                      style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
                      resizeMode="cover"
                    />
                    <View style={styles.tripCardOverlay}>
                      <Text variant="titleLarge" style={{  color: '#fff' }}>
                        {countryCode ? t(`countries.${countryCode}`, trip.destinationCountry) : trip.destinationCountry}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.tripCardImagePlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <View style={styles.tripCardOverlay}>
                      <MaterialIcons name="image" size={32} color={theme.colors.onSurfaceVariant} style={{ position: 'absolute', alignSelf: 'center', top: '40%' }} />
                      <Text variant="titleLarge" style={{  color: theme.colors.onSurfaceVariant }}>
                        {countryCode ? t(`countries.${countryCode}`, trip.destinationCountry) : trip.destinationCountry}
                      </Text>
                    </View>
                  </View>
                )}
                <View style={styles.tripCardContent}>
                  <Text variant="labelMedium" style={{ color: theme.colors.primary,  marginBottom: 12 }}>
                    {trip.startDate && trip.endDate ? formatDateRange(trip.startDate, trip.endDate) : t('tripsScreen.tbd', 'TBD')}
                  </Text>
                  
                  <View style={{ marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button 
                        variant="alternative"
                        compact
                        onPress={() => openEditModal(trip)} 
                        contentStyle={miniButtonContentStyle}
                        labelStyle={miniButtonLabelStyle}
                      >
                        {t('tripsScreen.editButton')}
                      </Button>
                      <Button 
                        variant="destructive"
                        compact
                        onPress={() => handleDelete(trip.id, trip.destinationCountry)} 
                        contentStyle={miniButtonContentStyle}
                        labelStyle={miniButtonLabelStyle}
                      >
                        {t('tripsScreen.deleteButton')}
                      </Button>
                    </View>
                    <Button 
                      variant="main"
                      compact
                      onPress={() => useTripStore.getState().setActiveTrip(trip.id)} 
                      contentStyle={miniButtonContentStyle}
                      labelStyle={miniButtonLabelStyle}
                    >
                      {t('tripsScreen.setActiveButton')}
                    </Button>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Past Trips */}
      {pastTrips.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="history" size={24} color={theme.colors.primary} />
            <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{t('tripsScreen.pastTripsTitle')}</Text>
          </View>

          <View style={[styles.listContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            {pastTrips.map((trip, idx) => (
              <View key={trip.id} style={[
                styles.listItem,
                idx !== pastTrips.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant }
              ]}>
                <View style={styles.listItemContent}>
                  <Text variant="titleMedium" style={{  color: theme.colors.onSurface }}>
                    {(() => {
                      const pastCode = COUNTRIES.find(c => c.name === trip.destinationCountry)?.code;
                      return pastCode ? t(`countries.${pastCode}`, trip.destinationCountry) : trip.destinationCountry;
                    })()}
                  </Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatDateRange(trip.startDate, trip.endDate)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                  <Pressable onPress={() => openSummaryModal(trip)}>
                    <MaterialCommunityIcons name="file-document-outline" size={24} color={theme.colors.primary} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(trip.id, trip.destinationCountry)}>
                    <MaterialIcons name="delete-outline" size={24} color={theme.colors.error} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

    </ScrollView>
    
    <Portal>
      <Modal visible={!!editingTrip} onDismiss={() => setEditingTrip(null)} contentContainerStyle={{ backgroundColor: theme.colors.surface, margin: 24, padding: 24, borderRadius: 16 }}>
        {editingTrip && (
          <View>
            <Text variant="titleLarge" style={{  marginBottom: 16 }}>{t('tripsScreen.editTripModalTitle', { country: (() => {
              const editCode = COUNTRIES.find(c => c.name === editingTrip.destinationCountry)?.code;
              return editCode ? t(`countries.${editCode}`, editingTrip.destinationCountry) : editingTrip.destinationCountry;
            })() })}</Text>
            
            <View style={{ marginBottom: 24 }}>
              <View style={{ marginBottom: 8 }}>
                <Pressable 
                  onPress={() => setShowPicker(true)} 
                  disabled={editNotSetYet}
                  style={({ pressed }) => [
                    { 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      borderColor: theme.colors.outlineVariant, 
                      borderWidth: 1,
                      borderRadius: 999,
                      opacity: editNotSetYet ? 0.5 : 1, 
                      height: 52,
                      backgroundColor: pressed ? theme.colors.surfaceVariant : 'transparent'
                    }
                  ]}
                >
                  <MaterialIcons name="date-range" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 16, color: theme.colors.primary, }}>
                    {editStartDate && editEndDate 
                      ? `${editStartDate.toLocaleDateString('en-GB')} - ${editEndDate.toLocaleDateString('en-GB')}`
                      : t('tripsScreen.selectDateRange')}
                  </Text>
                </Pressable>
              </View>

              <Pressable 
                 style={[{ flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: 'transparent' }]}
                 onPress={() => setEditNotSetYet(!editNotSetYet)}
              >
                <MaterialIcons name={editNotSetYet ? 'check-circle' : 'radio-button-unchecked'} size={24} color={theme.colors.primary} />
                <Text style={{ marginLeft: 8, color: theme.colors.onSurface }}>{t('tripsScreen.datesNotSetYet')}</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <Button variant="alternative" onPress={() => setEditingTrip(null)}>{t('tripsScreen.editTripCancel')}</Button>
              <Button 
                variant="main" 
                onPress={saveEditTrip}
                disabled={!editNotSetYet && (!editStartDate || !editEndDate)}
              >
                {t('tripsScreen.editTripSave')}
              </Button>
            </View>

            <Portal>
              <Modal visible={showPicker} onDismiss={() => setShowPicker(false)} contentContainerStyle={{ margin: 24, borderRadius: 16, overflow: 'hidden', backgroundColor: theme.colors.surface }}>
                {showPicker && (
                  <Calendar
                    minDate={new Date().toISOString().split('T')[0]}
                    markingType={'period'}
                    markedDates={editMarkedDates}
                    onDayPress={handleEditDayPress}
                    theme={{
                      todayTextColor: theme.colors.primary,
                      arrowColor: theme.colors.primary,
                    }}
                  />
                )}
              </Modal>
            </Portal>
          </View>
        )}
      </Modal>
    </Portal>

    <AddTripModal 
      visible={isAddTripVisible} 
      onDismiss={() => setAddTripVisible(false)} 
    />

    <PastTripSummaryModal 
      visible={isSummaryVisible} 
      trip={summaryTrip} 
      onDismiss={() => setIsSummaryVisible(false)} 
    />
    
    <ProUpgradeModal 
      visible={isPremiumModalVisible} 
      onDismiss={() => setPremiumModalVisible(false)} 
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    
  },
  combinedCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  combinedFeatureArea: {
    aspectRatio: 16/9,
  },
  combinedStatusArea: {
    padding: 24,
  },
  mainFeatureBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  mainFeatureContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.2)'
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 10,
    
  },
  statusCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetArea: {
    borderTopWidth: 1,
    paddingTop: 24,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  grid: {
    flexDirection: 'column',
    gap: 16,
  },
  addCardRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 16,
  },
  addIconContainerSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tripCardImagePlaceholder: {
    height: 140,
    width: '100%',
  },
  tripCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  tripCardContent: {
    padding: 12,
    flex: 1,
  },
  listContainer: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  listItemContent: {
    flex: 1,
  }
});
