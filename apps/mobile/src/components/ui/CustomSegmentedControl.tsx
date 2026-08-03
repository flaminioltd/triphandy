import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';

/**
 * Configuration props for individual buttons within the segmented control.
 */
export interface SegmentedButtonProps {
  value: string;
  label?: string;
  icon?: string;
  iconSize?: number;
  iconFamily?: 'Ionicons' | 'MaterialCommunityIcons' | 'MaterialIcons';
  render?: (isSelected: boolean) => React.ReactNode;
  style?: ViewStyle;
  labelStyle?: any;
  disabled?: boolean;
}

interface CustomSegmentedControlProps {
  value: string;
  onValueChange: (value: string) => void;
  buttons: SegmentedButtonProps[];
  style?: ViewStyle;
  pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
  disabled?: boolean;
}

/**
 * A custom Segmented Control component used for switching between mutually exclusive options.
 * Matches Material Design 3 segmented button aesthetics while resolving rendering bugs 
 * found in the default react-native-paper SegmentedButtons implementation.
 */
export default function CustomSegmentedControl({
  value,
  onValueChange,
  buttons,
  style,
  pointerEvents,
  disabled
}: CustomSegmentedControlProps) {
  const theme = useTheme();

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.outline 
        },
        disabled && { opacity: 0.5 },
        style
      ]}
      pointerEvents={disabled ? 'none' : pointerEvents}
    >
      {buttons.map((btn) => {
        const isSelected = value === btn.value;
        return (
          <Pressable
            key={btn.value}
            onPress={() => onValueChange(btn.value)}
            disabled={btn.disabled || disabled}
            style={({ pressed }) => [
              styles.button,
              { flex: (btn.style as any)?.flex || 1 },
              isSelected && {
                backgroundColor: theme.colors.secondaryContainer,
                elevation: 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
              },
              !isSelected && pressed && {
                backgroundColor: 'rgba(0,0,0,0.05)',
              },
              btn.style
            ]}
          >
            {btn.render ? (
              btn.render(isSelected)
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {btn.icon && (
                  <View pointerEvents="none" style={btn.label ? { marginRight: 4 } : {}}>
                    {btn.iconFamily === 'Ionicons' ? (
                      <Ionicons 
                        name={btn.icon as any} 
                        size={btn.iconSize || 22} 
                        color={isSelected ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant} 
                      />
                    ) : btn.iconFamily === 'MaterialIcons' ? (
                      <MaterialIcons 
                        name={btn.icon as any} 
                        size={btn.iconSize || 22} 
                        color={isSelected ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant} 
                      />
                    ) : (
                      <MaterialCommunityIcons 
                        name={btn.icon as any} 
                        size={btn.iconSize || 22} 
                        color={isSelected ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant} 
                      />
                    )}
                  </View>
                )}
                {btn.label && (
                  <Text 
                    numberOfLines={1}
                    style={[
                      styles.label,
                      { 
                        color: isSelected 
                          ? theme.colors.onSecondaryContainer 
                          : theme.colors.onSurfaceVariant 
                      },
                      btn.labelStyle
                    ]}
                  >
                    {btn.label}
                  </Text>
                )}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    padding: 2,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  label: {
    fontSize: 14,
    
    textAlign: 'center',
  }
});
