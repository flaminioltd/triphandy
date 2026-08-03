import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Animated, Platform, UIManager, Image } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../stores/app-store';
const NavItem = ({ active, title, icon, onPress, theme }: { active: boolean, title: string, icon: keyof typeof MaterialIcons.glyphMap, onPress: () => void, theme: any }) => {
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: active ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [active]);

  const maxWidth = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 100] });
  const paddingHorizontal = anim.interpolate({ inputRange: [0, 1], outputRange: [8, 16] });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

  // Use string interpolation or ref for backgroundColor to avoid re-renders disrupting the animation
  const backgroundColor = active ? theme.colors.primary : 'transparent';

  return (
    <Pressable onPress={onPress}>
      <Animated.View 
        style={[
          styles.pill, 
          { 
            backgroundColor,
            paddingHorizontal
          }
        ]}
      >
        <MaterialIcons 
          name={icon} 
          size={24} 
          color={active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant} 
        />
        <Animated.View style={{ maxWidth, opacity, overflow: 'hidden' }}>
          <View style={{ flexShrink: 0, paddingLeft: 6 }}>
            <Text 
              variant="labelLarge" 
              style={[
                styles.pillText,
                { color: active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

export default function MainAppHeader() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { settings } = useAppStore();

  const [localActive, setLocalActive] = useState<string>(pathname);

  useEffect(() => {
    setLocalActive(pathname);
  }, [pathname]);

  const handleNav = (route: string) => {
    if (localActive === route) return;
    setLocalActive(route);
    router.navigate(route as any);
  };

  const isHome = localActive === '/(main)' || localActive === '/';
  const isTrips = localActive === '/(main)/trips' || localActive === '/trips';
  const isSettings = localActive === '/(main)/settings' || localActive === '/settings';

  return (
    <View style={[
      styles.header, 
      { 
        paddingTop: insets.top,
        backgroundColor: theme.colors.surface,
        borderBottomColor: theme.colors.surfaceVariant,
      }
    ]}>
      <View style={styles.content}>
        {settings?.isPremium ? (
          <Image source={require('../../../assets/full-logo-pro.png')} style={{ height: 36, width: 115, resizeMode: 'contain', marginLeft: 8 }} />
        ) : (
          <Image source={require('../../../assets/images/Logo.png')} style={{ height: 36, width: 115, resizeMode: 'contain', marginLeft: 8 }} />
        )}

        <View style={styles.nav}>
          <NavItem active={isHome} title={t('navigation.tabs.home', 'Home')} icon="home" onPress={() => handleNav('/(main)')} theme={theme} />
          <NavItem active={isTrips} title={t('navigation.tabs.myTrips', 'Trips')} icon="flight" onPress={() => handleNav('/(main)/trips')} theme={theme} />
          <NavItem active={isSettings} title={t('navigation.tabs.settings', 'Settings')} icon="settings" onPress={() => handleNav('/(main)/settings')} theme={theme} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    zIndex: 50,
  },
  content: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  title: {
    
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 24,
  },
  pillText: {
    
  }
});
