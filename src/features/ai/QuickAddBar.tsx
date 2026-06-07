import React, { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Text';
import { captureText } from './assist';

/**
 * Natural-language capture bar — the visible face of the AI copilote.
 * Type a sentence ("couru 30 min", "dormi 7h", "tâche: relancer client")
 * and it creates the right entry in the right pole.
 */
export function QuickAddBar() {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const submit = async () => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      const result = await captureText(value);
      if (result) {
        setFeedback({ ok: true, msg: `Ajouté · ${result}` });
        setText('');
      } else {
        setFeedback({ ok: false, msg: "Pas compris — essaie « médité 10 min »" });
      }
    } finally {
      setBusy(false);
      setTimeout(() => setFeedback(null), 2600);
    }
  };

  return (
    <View style={{ marginTop: theme.spacing(4) }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.pill,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingLeft: 16,
          paddingRight: 6,
          paddingVertical: 6,
        }}
      >
        <Ionicons name="sparkles" size={18} color={theme.colors.primary} />
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          returnKeyType="send"
          placeholder="Note rapide… ex : médité 10 min"
          placeholderTextColor={theme.colors.muted}
          style={{
            flex: 1,
            fontFamily: theme.fonts.body,
            fontSize: 15,
            color: theme.colors.ink,
            paddingVertical: 8,
          }}
        />
        <Pressable
          onPress={submit}
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {busy ? (
            <ActivityIndicator size="small" color={theme.colors.onPrimary} />
          ) : (
            <Ionicons name="arrow-up" size={20} color={theme.colors.onPrimary} />
          )}
        </Pressable>
      </View>

      {feedback ? (
        <MotiView
          from={{ opacity: 0, translateY: -4 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={{ marginTop: 8, marginLeft: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Ionicons
            name={feedback.ok ? 'checkmark-circle' : 'help-circle'}
            size={16}
            color={feedback.ok ? theme.colors.success : theme.colors.muted}
          />
          <Text variant="caption" color={feedback.ok ? theme.colors.success : theme.colors.muted}>
            {feedback.msg}
          </Text>
        </MotiView>
      ) : null}
    </View>
  );
}
