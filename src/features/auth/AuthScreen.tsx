import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BackButton, Field } from '@/components/ListUI';
import { useTheme } from '@/theme/ThemeProvider';
import { signIn, signUp } from './auth';

export function AuthScreen({ gate = false }: { gate?: boolean }) {
  const { theme } = useTheme();
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    if (!email.trim() || password.length < 6) {
      setMsg({ ok: false, text: 'Email valide + mot de passe ≥ 6 caractères.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { error } = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
      if (error) {
        setMsg({ ok: false, text: error.message });
      } else if (mode === 'signup') {
        setMsg({ ok: true, text: 'Compte créé. Vérifie tes emails si une confirmation est demandée.' });
      } else if (!gate) {
        router.back();
      }
      // In gate mode, a successful sign-in updates the session, which the root
      // layout watches to reveal the app — no manual navigation needed.
    } catch (e) {
      setMsg({ ok: false, text: 'Connexion impossible. Vérifie ta config Supabase (.env).' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen account={false}>
      {gate ? null : <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))} />}

      <Text variant="display">{mode === 'signin' ? 'Bienvenue' : 'Créer un compte'}</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        {gate ? 'Connecte-toi pour accéder à Nysa.' : 'Pour sauvegarder et synchroniser tes données.'}
      </Text>

      <View style={{ marginTop: theme.spacing(6), gap: theme.spacing(3) }}>
        <Field
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field
          value={password}
          onChangeText={setPassword}
          placeholder="Mot de passe"
          secureTextEntry
          autoCapitalize="none"
        />

        {msg ? (
          <Text variant="caption" color={msg.ok ? theme.colors.success : theme.colors.danger}>
            {msg.text}
          </Text>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={busy}
          style={{
            paddingVertical: 16,
            borderRadius: theme.radius.pill,
            alignItems: 'center',
            backgroundColor: theme.colors.primary,
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <Text variant="label" color={theme.colors.onPrimary}>
              {mode === 'signin' ? 'Se connecter' : 'Créer le compte'}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text variant="label" color={theme.colors.inkSoft}>
            {mode === 'signin' ? 'Pas de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
          </Text>
        </Pressable>
      </View>

      <Text variant="caption" color={theme.colors.muted} style={{ marginTop: theme.spacing(6) }}>
        Apple et Google arriveront ensuite (ils demandent une configuration native).
      </Text>
    </Screen>
  );
}
