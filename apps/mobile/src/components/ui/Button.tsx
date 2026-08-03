import React, { useRef } from 'react';
import { Animated, Pressable, ViewStyle, StyleProp } from 'react-native';
import { Button as PaperButton, useTheme } from 'react-native-paper';
import { tokens } from '../../theme/tokens';

type PaperButtonProps = React.ComponentProps<typeof PaperButton>;

type ButtonVariant = 'main' | 'alternative' | 'destructive';

interface CustomButtonProps extends Omit<PaperButtonProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  variant?: ButtonVariant;
}

export default function Button({
  mode,
  variant = 'main',
  style,
  onPress,
  children,
  ...props
}: CustomButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const theme = useTheme();

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const animatedStyle = {
    transform: [{ scale }],
  };

  const roundedStyle = {
    borderRadius: 999,
    ...(props.compact ? {} : { minWidth: 100 }),
  };

  let resolvedMode = mode;
  let resolvedButtonColor = props.buttonColor;
  let resolvedTextColor = props.textColor;
  let borderStyle = {};

  if (!mode) {
    if (variant === 'main') {
      resolvedMode = 'contained';
    } else if (variant === 'alternative') {
      resolvedMode = 'outlined';
      resolvedButtonColor = 'transparent';
      resolvedTextColor = tokens.colors.ui.primaryPurple;
      borderStyle = { borderColor: theme.colors.outline };
    } else if (variant === 'destructive') {
      resolvedMode = 'contained';
      resolvedButtonColor = tokens.colors.state.errorSoft;
      resolvedTextColor = tokens.colors.state.error;
    }
  }

  return (
    <Animated.View style={animatedStyle}>
      <PaperButton
        mode={resolvedMode}
        buttonColor={resolvedButtonColor}
        textColor={resolvedTextColor}
        {...props}
        style={[roundedStyle, borderStyle, style]} // Apply all original styles to the PaperButton directly
        onPressIn={(e) => {
          handlePressIn();
          props.onPressIn?.(e);
        }}
        onPressOut={(e) => {
          handlePressOut();
          props.onPressOut?.(e);
        }}
        onPress={onPress}
      >
        {children}
      </PaperButton>
    </Animated.View>
  );
}
