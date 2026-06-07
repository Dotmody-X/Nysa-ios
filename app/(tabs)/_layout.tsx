import { Tabs } from 'expo-router';
import { OrganicDock } from '@/components/OrganicDock';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <OrganicDock {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="work" options={{ title: 'Travail' }} />
      <Tabs.Screen name="planning" options={{ title: 'Planning' }} />
      <Tabs.Screen name="wellbeing" options={{ title: 'Bien-être' }} />
      <Tabs.Screen name="goals" options={{ title: 'Objectifs' }} />
      {/* Hidden from the dock — reached via the account button / router.push */}
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="poles" options={{ href: null }} />
      <Tabs.Screen name="assistant" options={{ href: null }} />
    </Tabs>
  );
}
