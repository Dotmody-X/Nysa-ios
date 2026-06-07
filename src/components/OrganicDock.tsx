import React from 'react';
import { Pressable, View } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

type Item = { name: string; icon: keyof typeof Ionicons.glyphMap };

const ITEMS: Item[] = [
  { name: 'home', icon: 'sparkles' },
  { name: 'work', icon: 'briefcase' },
  { name: 'planning', icon: 'calendar' },
  { name: 'wellbeing', icon: 'heart' },
  { name: 'goals', icon: 'flag' },
];

const SLOT = 56;

/**
 * Dark floating dock. The active item swells into a lime disc (the "casse")
 * that bumps up out of the bar — the mobile take on the sidebar reference.
 */
export function OrganicDock({ state, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;

  // Full-screen surfaces (chat assistant) hide the dock entirely.
  if (activeName === 'assistant') return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        paddingBottom: insets.bottom > 0 ? insets.bottom : 14,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.ink,
          borderRadius: theme.radius.pill,
          paddingHorizontal: 10,
          height: 64,
          shadowColor: theme.colors.ink,
          shadowOpacity: 0.22,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 12 },
          elevation: 14,
        }}
      >
        {ITEMS.map((item) => {
          const focused = item.name === activeName;
          return (
            <Pressable
              key={item.name}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={() => {
                if (!focused) navigation.navigate(item.name as never);
              }}
              style={{ width: SLOT, height: 64, alignItems: 'center', justifyContent: 'center' }}
            >
              <MotiView
                animate={{
                  translateY: focused ? -24 : 0,
                  scale: focused ? 1 : 0.9,
                  backgroundColor: focused ? theme.colors.primary : 'rgba(0,0,0,0)',
                }}
                transition={{ type: 'spring', damping: 15, stiffness: 180 }}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: theme.radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  // Page-coloured ring → the dark bar reads as notched around the active disc.
                  borderWidth: focused ? 5 : 0,
                  borderColor: theme.colors.bg,
                  shadowColor: theme.colors.ink,
                  shadowOpacity: focused ? 0.3 : 0,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 6 },
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={focused ? theme.colors.onPrimary : theme.colors.bg}
                  style={{ opacity: focused ? 1 : 0.6 }}
                />
              </MotiView>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
