import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import { useTheme } from '@/theme/ThemeProvider';
import type { EnergyPayload } from '@/poles/types';

type Rating = 1 | 2 | 3 | 4 | 5;

/** Quick post-session check-in. Feeds the Energy & Focus tracker. */
export function EnergyModal({
  visible,
  durationLabel,
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  durationLabel: string;
  onCancel: () => void;
  onSubmit: (energy: EnergyPayload) => void;
}) {
  const { theme } = useTheme();
  const [level, setLevel] = useState<Rating>(3);
  const [focus, setFocus] = useState<Rating>(3);

  const Scale = ({ value, onChange }: { value: Rating; onChange: (r: Rating) => void }) => (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
      {([1, 2, 3, 4, 5] as Rating[]).map((r) => {
        const active = r <= value;
        return (
          <Pressable
            key={r}
            onPress={() => onChange(r)}
            style={{
              width: 44,
              height: 44,
              borderRadius: theme.radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt,
            }}
          >
            <Text variant="label" color={active ? theme.colors.onPrimary : theme.colors.muted}>
              {r}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(26,7,8,0.45)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.bg,
            borderTopLeftRadius: theme.radius.bento,
            borderTopRightRadius: theme.radius.bento,
            padding: theme.spacing(6),
            gap: theme.spacing(4),
          }}
        >
          <View>
            <Text variant="title">Session terminée</Text>
            <Text variant="caption" color={theme.colors.inkSoft}>
              {durationLabel} · comment c'était ?
            </Text>
          </View>

          <View>
            <Text variant="label" color={theme.colors.inkSoft}>
              Énergie
            </Text>
            <Scale value={level} onChange={setLevel} />
          </View>

          <View>
            <Text variant="label" color={theme.colors.inkSoft}>
              Focus
            </Text>
            <Scale value={focus} onChange={setFocus} />
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: theme.spacing(2) }}>
            <Pressable
              onPress={onCancel}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: theme.radius.pill,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text variant="label">Ignorer</Text>
            </Pressable>
            <Pressable
              onPress={() => onSubmit({ level, focus })}
              style={{
                flex: 2,
                paddingVertical: 14,
                borderRadius: theme.radius.pill,
                alignItems: 'center',
                backgroundColor: theme.colors.primary,
              }}
            >
              <Text variant="label" color={theme.colors.onPrimary}>
                Enregistrer
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
