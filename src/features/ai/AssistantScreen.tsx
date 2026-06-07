import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { Text } from '@/components/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { runAssistant, SKILL_EXAMPLES } from './skills';
import { useLlmStatus } from './llmStatus';

type Msg = { role: 'user' | 'assistant'; text: string };

function LlmBadge() {
  const { theme } = useTheme();
  const { state, progress } = useLlmStatus();
  if (state === 'off') return null; // no on-device model installed
  const label =
    state === 'ready'
      ? 'IA locale prête'
      : state === 'downloading'
        ? `Téléchargement du modèle ${Math.round(progress * 100)}%`
        : state === 'loading'
          ? 'Chargement du modèle…'
          : 'IA locale indisponible';
  const color = state === 'ready' ? theme.colors.success : state === 'error' ? theme.colors.danger : theme.colors.muted;
  return (
    <Text variant="caption" color={color} style={{ marginTop: 2 }}>
      ● {label}
    </Text>
  );
}

export function AssistantScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', text: 'Salut ! Demande-moi de noter quelque chose, pose une question sur tes données, ou dis-moi où aller.' },
  ]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (value: string) => {
    const input = value.trim();
    if (!input || busy) return;
    setText('');
    setMessages((m) => [...m, { role: 'user', text: input }]);
    setBusy(true);
    try {
      const res = await runAssistant(input);
      setMessages((m) => [...m, { role: 'assistant', text: res.message }]);
      if (res.navigateTo) setTimeout(() => router.push(res.navigateTo as never), 500);
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + theme.spacing(2),
          paddingHorizontal: theme.spacing(5),
          paddingBottom: theme.spacing(3),
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
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
          <Ionicons name="chevron-back" size={22} color={theme.colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="sparkles" size={22} color={theme.colors.primary} />
            <Text variant="title">Assistant</Text>
          </View>
          <LlmBadge />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: theme.spacing(5), paddingBottom: theme.spacing(4), gap: 10 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m, i) => (
            <MotiView
              key={i}
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                backgroundColor: m.role === 'user' ? theme.colors.primary : theme.colors.surface,
                borderWidth: m.role === 'user' ? 0 : 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                paddingVertical: 12,
                paddingHorizontal: 16,
              }}
            >
              <Text variant="body" color={m.role === 'user' ? theme.colors.onPrimary : theme.colors.ink}>
                {m.text}
              </Text>
            </MotiView>
          ))}

          {/* Suggestions */}
          {messages.length <= 1 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing(2) }}>
              {SKILL_EXAMPLES.slice(0, 6).map((ex) => (
                <Pressable
                  key={ex}
                  onPress={() => send(ex)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: theme.radius.pill,
                    backgroundColor: theme.colors.surfaceAlt,
                  }}
                >
                  <Text variant="label" color={theme.colors.inkSoft}>
                    {ex}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        {/* Input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: theme.spacing(5),
            paddingBottom: insets.bottom + theme.spacing(3),
            paddingTop: theme.spacing(2),
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => send(text)}
            returnKeyType="send"
            placeholder="Écris à l'assistant…"
            placeholderTextColor={theme.colors.muted}
            style={{
              flex: 1,
              fontFamily: theme.fonts.body,
              fontSize: 15,
              color: theme.colors.ink,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.pill,
              paddingHorizontal: 18,
              paddingVertical: 12,
            }}
          />
          <Pressable
            onPress={() => send(text)}
            style={{
              width: 48,
              height: 48,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-up" size={22} color={theme.colors.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
