import React from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Blob } from './Blob';

type ScreenProps = ViewProps & {
  scroll?: boolean;
  /** Show the ambient background blobs (default true). */
  decorated?: boolean;
  /** Show the account button at the top of the content (default true). */
  account?: boolean;
  children: React.ReactNode;
};

/** Page wrapper: themed background + ambient blobs + safe-area padding.
 * The account button sits in the content flow (top-right) so it scrolls away
 * naturally instead of floating fixed over the page. */
export function Screen({
  scroll = true,
  decorated = true,
  account = true,
  children,
  style,
  ...rest
}: ScreenProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const padding = {
    paddingTop: insets.top + theme.spacing(3),
    paddingHorizontal: theme.spacing(5),
    paddingBottom: insets.bottom + theme.spacing(28), // clearance for the dock
  };

  const AccountButton = account ? (
    <View style={{ alignItems: 'flex-end', marginBottom: theme.spacing(2) }}>
      <Pressable
        onPress={() => router.push('/settings')}
        hitSlop={10}
        style={{
          width: 44,
          height: 44,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="person" size={20} color={theme.colors.ink} />
      </Pressable>
    </View>
  ) : null;

  const Background = decorated ? (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Blob
        colors={theme.blobs.secondary}
        size={360}
        seed={7}
        opacity={0.18}
        style={{ position: 'absolute', top: -120, right: -130 }}
      />
      <Blob
        colors={theme.blobs.primary}
        size={320}
        seed={2}
        opacity={0.16}
        style={{ position: 'absolute', bottom: 40, left: -140 }}
      />
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {Background}
      {scroll ? (
        <ScrollView
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={padding}
          showsVerticalScrollIndicator={false}
        >
          {AccountButton}
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padding, style]} {...rest}>
          {AccountButton}
          {children}
        </View>
      )}
    </View>
  );
}
