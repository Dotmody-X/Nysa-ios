import React, { useState } from 'react';
import { Modal, Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

/** Small reusable building blocks shared by the simple list-style pole screens. */

export function BackButton({ onPress }: { onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
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
        marginBottom: theme.spacing(4),
      }}
    >
      <Ionicons name="chevron-back" size={22} color={theme.colors.ink} />
    </Pressable>
  );
}

export function Section({ title, right }: { title: string; right?: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={{ marginTop: theme.spacing(7), marginBottom: theme.spacing(3), flexDirection: 'row', alignItems: 'center' }}>
      <Text variant="title" style={{ flex: 1 }}>
        {title}
      </Text>
      {right}
    </View>
  );
}

export function ListRow({ children, tone }: { children: React.ReactNode; tone?: string }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: tone ?? theme.colors.surface,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing(4),
      }}
    >
      {children}
    </View>
  );
}

export function AddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (t: string) => void }) {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const submit = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText('');
  };
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
      <Field value={text} onChangeText={setText} onSubmitEditing={submit} returnKeyType="done" placeholder={placeholder} style={{ flex: 1 }} />
      <Pressable onPress={submit} style={{ width: 48, borderRadius: theme.radius.md, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="add" size={24} color={theme.colors.onPrimary} />
      </Pressable>
    </View>
  );
}

export function Field({ style, ...props }: TextInputProps) {
  const { theme } = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.colors.muted}
      style={[
        {
          fontFamily: theme.fonts.body,
          fontSize: 15,
          color: theme.colors.ink,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          paddingHorizontal: 16,
          paddingVertical: 12,
        },
        style,
      ]}
      {...props}
    />
  );
}

export function PillButton({ label, onPress, filled }: { label: string; onPress: () => void; filled?: boolean }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: theme.radius.pill,
        backgroundColor: filled ? theme.colors.primary : theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Ionicons name="add" size={16} color={filled ? theme.colors.onPrimary : theme.colors.ink} />
      <Text variant="label" color={filled ? theme.colors.onPrimary : theme.colors.ink}>
        {label}
      </Text>
    </Pressable>
  );
}

export function DeleteX({ onPress }: { onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Ionicons name="close" size={18} color={theme.colors.muted} />
    </Pressable>
  );
}

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(26,7,8,0.45)', justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: theme.colors.bg, borderTopLeftRadius: theme.radius.bento, borderTopRightRadius: theme.radius.bento, padding: theme.spacing(6), gap: theme.spacing(3) }}
        >
          <Text variant="title">{title}</Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ marginTop: theme.spacing(1), paddingVertical: 14, borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: theme.colors.primary }}>
      <Text variant="label" color={theme.colors.onPrimary}>
        {label}
      </Text>
    </Pressable>
  );
}
