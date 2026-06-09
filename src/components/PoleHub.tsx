import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

type Pole = { key: string; route: string; label: string; icon: keyof typeof Ionicons.glyphMap };

const POLES: Pole[] = [
  { key: 'planning', route: '/planning', label: 'Planning', icon: 'calendar' },
  { key: 'work', route: '/work', label: 'Travail', icon: 'briefcase' },
  { key: 'wellbeing', route: '/wellbeing', label: 'Bien-être', icon: 'heart' },
  { key: 'finance', route: '/finance', label: 'Finances', icon: 'wallet' },
  { key: 'home', route: '/household', label: 'Maison', icon: 'home' },
  { key: 'relationships', route: '/relationships', label: 'Relations', icon: 'people' },
  { key: 'learning', route: '/learning', label: 'Apprentissage', icon: 'book' },
  { key: 'leisure', route: '/leisure', label: 'Loisirs', icon: 'game-controller' },
];

/** Full-screen grid of all poles, with a staggered "deploy" animation. */
export function PoleHub({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const router = useRouter();

  const go = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as never), 80);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(26,7,8,0.55)' }]} />
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: theme.spacing(5), paddingBottom: theme.spacing(28) }} pointerEvents="box-none">
        <Text variant="title" color={theme.colors.bg} style={{ marginBottom: theme.spacing(3) }}>
          Tes pôles
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {POLES.map((p, i) => {
            const pal = theme.poleColors[p.key];
            return (
              <MotiView
                key={p.key}
                from={{ opacity: 0, scale: 0.6, translateY: 20 }}
                animate={{ opacity: 1, scale: 1, translateY: 0 }}
                transition={{ type: 'spring', damping: 14, stiffness: 200, delay: 40 * i }}
                style={{ width: '47%' }}
              >
                <Pressable
                  onPress={() => go(p.route)}
                  style={{
                    backgroundColor: pal.solid,
                    borderRadius: theme.radius.bento,
                    padding: theme.spacing(4),
                    minHeight: 96,
                    justifyContent: 'space-between',
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: theme.radius.pill,
                      backgroundColor: 'rgba(255,255,255,0.25)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={p.icon} size={20} color={pal.on} />
                  </View>
                  <Text variant="body" color={pal.on} style={{ fontFamily: theme.fonts.display }}>
                    {p.label}
                  </Text>
                </Pressable>
              </MotiView>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}
