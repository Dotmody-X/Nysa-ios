import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BentoCard } from '@/components/BentoCard';
import { useTheme } from '@/theme/ThemeProvider';
import { themes, type ThemeName } from '@/theme/tokens';
import { useLlmStatus } from '@/features/ai/llmStatus';
import { useSession, signOut } from '@/features/auth/auth';
import { useSyncStatus } from '@/db/sync/syncStore';
import { useNavPrefs } from '@/features/nav/navPrefs';
import { POLE_CATALOG } from '@/poles/catalog';
import { useCalendarSync } from '@/features/planning/deviceCalendar';
import { Platform, Alert } from 'react-native';
import { dedupeEntries, clearDemoData } from '@/db/maintenance';
import { GroupesSettings } from '@/features/work/GroupesSettings';
import { useProfile, type Sex } from '@/features/profile/profile';

export default function AccountScreen() {
  const { theme, themeName, setTheme } = useTheme();
  const router = useRouter();
  const names = Object.keys(themes) as ThemeName[];
  const { session } = useSession();
  const { syncing, lastSyncedAt, error: syncError, run: runSync } = useSyncStatus();
  const { poles: navPoles, choose: choosePole } = useNavPrefs();
  const { sex, setSex } = useProfile();
  const SEX_OPTIONS: { key: Sex; label: string }[] = [
    { key: 'female', label: 'Femme' },
    { key: 'male', label: 'Homme' },
    { key: 'unspecified', label: 'Non précisé' },
  ];
  const { connected: calConnected, busy: calBusy, connect: connectCal, disconnect: disconnectCal } = useCalendarSync();
  const calProvider = Platform.OS === 'ios' ? 'iCloud / Apple Calendrier' : 'Google Agenda';
  const onToggleCal = async () => {
    if (calConnected) {
      disconnectCal();
      return;
    }
    const res = await connectCal();
    if (!res.ok) Alert.alert('Calendrier', res.error ?? 'Connexion impossible');
  };
  const onDedupe = async () => {
    const n = await dedupeEntries();
    Alert.alert('Nettoyage', n > 0 ? `${n} doublon${n > 1 ? 's' : ''} supprimé${n > 1 ? 's' : ''}.` : 'Aucun doublon trouvé.');
  };
  const onClearDemo = () => {
    Alert.alert('Données de démo', 'Supprimer les projets, tâches et habitudes de démonstration (App Nysa, Client freelance…) ainsi que leurs données associées ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const n = await clearDemoData();
          Alert.alert('Données de démo', n > 0 ? `${n} entrée${n > 1 ? 's' : ''} de démo supprimée${n > 1 ? 's' : ''}.` : 'Aucune donnée de démo trouvée.');
        },
      },
    ]);
  };
  const { enabled: llmEnabled, state: llmState, progress: llmProgress, setEnabled: setLlmEnabled } = useLlmStatus();
  const llmLabel =
    !llmEnabled
      ? 'Désactivée'
      : llmState === 'ready'
        ? 'Prête'
        : llmState === 'downloading'
          ? `Téléchargement ${Math.round(llmProgress * 100)}%`
          : llmState === 'error'
            ? 'Erreur'
            : 'Chargement…';

  return (
    <Screen account={false}>
      {/* Back to where the account button was tapped from */}
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
          marginBottom: theme.spacing(4),
        }}
      >
        <Ionicons name="chevron-back" size={22} color={theme.colors.ink} />
      </Pressable>

      <Text variant="display">Compte</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Ton profil et tes réglages.
      </Text>

      <View style={{ marginTop: theme.spacing(6) }}>
        {session ? (
          <Pressable
            onPress={() => signOut()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: theme.spacing(4),
            }}
          >
            <Ionicons name="person-circle" size={36} color={theme.colors.accent} />
            <View style={{ flex: 1 }}>
              <Text variant="body">{session.user.email}</Text>
              <Text variant="label" color={theme.colors.muted}>
                Connecté · appuie pour te déconnecter
              </Text>
            </View>
            <Ionicons name="log-out-outline" size={20} color={theme.colors.muted} />
          </Pressable>
        ) : (
          <BentoCard
            tone="accent"
            span={2}
            icon="person"
            title="Pas connecté"
            subtitle="Connecte-toi pour sauvegarder & synchroniser"
            onPress={() => router.push('/auth')}
          />
        )}
      </View>

      {session ? (
        <Pressable
          onPress={() => runSync()}
          style={{
            marginTop: theme.spacing(3),
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing(4),
          }}
        >
          <Ionicons name={syncing ? 'sync' : 'cloud-done-outline'} size={22} color={theme.colors.accent} />
          <View style={{ flex: 1 }}>
            <Text variant="body">Synchronisation</Text>
            <Text variant="label" color={syncError ? theme.colors.danger : theme.colors.muted}>
              {syncing
                ? 'Synchronisation…'
                : syncError
                  ? syncError
                  : lastSyncedAt
                    ? `Dernière : ${new Date(lastSyncedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Appuie pour synchroniser'}
            </Text>
          </View>
          <Ionicons name="refresh" size={18} color={theme.colors.muted} />
        </Pressable>
      ) : null}

      <View style={{ marginTop: theme.spacing(7) }}>
        <Text variant="title">Profil</Text>
        <Text variant="caption" color={theme.colors.inkSoft} style={{ marginBottom: theme.spacing(2) }}>
          Le suivi du cycle menstruel n'apparaît que pour le profil « Femme ».
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {SEX_OPTIONS.map((opt) => {
            const active = opt.key === sex;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setSex(opt.key)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: active ? theme.colors.ink : theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}
              >
                <Text variant="label" color={active ? theme.colors.bg : theme.colors.ink}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: theme.spacing(7) }}>
        <Text variant="title">Pôles dans la barre</Text>
        <Text variant="caption" color={theme.colors.inkSoft} style={{ marginBottom: theme.spacing(2) }}>
          Choisis les 2 pôles affichés dans le dock (entre Accueil et Objectifs).
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {POLE_CATALOG.map((p) => {
            const active = navPoles.includes(p.key);
            return (
              <Pressable
                key={p.key}
                onPress={() => choosePole(p.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: theme.radius.pill,
                  backgroundColor: active ? theme.colors.ink : theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Ionicons name={p.icon} size={16} color={active ? theme.colors.bg : theme.colors.muted} />
                <Text variant="label" color={active ? theme.colors.bg : theme.colors.ink}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: theme.spacing(7) }}>
        <Text variant="title">Calendrier</Text>
        <Text variant="caption" color={theme.colors.inkSoft} style={{ marginBottom: theme.spacing(2) }}>
          Synchronise tes événements Planning avec {calProvider}.
        </Text>
        <Pressable
          onPress={onToggleCal}
          disabled={calBusy}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing(4),
            opacity: calBusy ? 0.6 : 1,
          }}
        >
          <Ionicons name={calConnected ? 'calendar' : 'calendar-outline'} size={22} color={theme.colors.accent} />
          <View style={{ flex: 1 }}>
            <Text variant="body">{calConnected ? 'Connecté' : 'Connecter le calendrier'}</Text>
            <Text variant="label" color={theme.colors.muted}>
              {calBusy ? 'Connexion…' : calConnected ? `Synchronisé avec ${calProvider}` : 'Appuie pour autoriser'}
            </Text>
          </View>
          <Ionicons name={calConnected ? 'close-circle-outline' : 'chevron-forward'} size={18} color={theme.colors.muted} />
        </Pressable>
      </View>

      <View style={{ marginTop: theme.spacing(7) }}>
        <Text variant="title">Données</Text>
        <Text variant="caption" color={theme.colors.inkSoft} style={{ marginBottom: theme.spacing(2) }}>
          Supprime les projets, tâches et habitudes en double.
        </Text>
        <Pressable
          onPress={onDedupe}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing(4),
          }}
        >
          <Ionicons name="sparkles-outline" size={22} color={theme.colors.accent} />
          <Text variant="body" style={{ flex: 1 }}>
            Nettoyer les doublons
          </Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
        </Pressable>
        <Pressable
          onPress={onClearDemo}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginTop: theme.spacing(3),
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing(4),
          }}
        >
          <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
          <Text variant="body" style={{ flex: 1 }}>
            Effacer les données de démo
          </Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
        </Pressable>
      </View>

      <View style={{ marginTop: theme.spacing(7) }}>
        <GroupesSettings />
      </View>

      <View style={{ marginTop: theme.spacing(7) }}>
        <Text variant="title">Thème</Text>
        <Text variant="caption" color={theme.colors.inkSoft} style={{ marginBottom: theme.spacing(2) }}>
          Vrais style packs — pas un simple changement de couleur.
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {names.map((name) => {
            const active = name === themeName;
            return (
              <Pressable
                key={name}
                onPress={() => setTheme(name)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: theme.radius.pill,
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Text variant="label" color={active ? theme.colors.onPrimary : theme.colors.ink}>
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: theme.spacing(7) }}>
        <Text variant="title">Assistant IA locale</Text>
        <Text variant="caption" color={theme.colors.inkSoft} style={{ marginBottom: theme.spacing(2) }}>
          Modèle on-device pour comprendre le langage libre. Télécharge ~1 Go la première fois. À éviter sur simulateur (lourd).
        </Text>
        <Pressable
          onPress={() => setLlmEnabled(!llmEnabled)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing(4),
          }}
        >
          <Ionicons name="sparkles" size={22} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text variant="body">IA locale</Text>
            <Text variant="label" color={theme.colors.muted}>
              {llmLabel}
            </Text>
          </View>
          <View
            style={{
              width: 52,
              height: 30,
              borderRadius: 999,
              backgroundColor: llmEnabled ? theme.colors.primary : theme.colors.surfaceAlt,
              padding: 3,
              justifyContent: 'center',
              alignItems: llmEnabled ? 'flex-end' : 'flex-start',
            }}
          >
            <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: theme.colors.surface }} />
          </View>
        </Pressable>
      </View>

      <View style={{ marginTop: theme.spacing(7) }}>
        <BentoCard tone="surface" span={2} accent="primary" icon="information-circle" title="Nysa" subtitle="Version 0.1.0" />
      </View>
    </Screen>
  );
}
