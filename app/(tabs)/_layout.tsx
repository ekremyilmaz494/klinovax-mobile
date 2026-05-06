import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { darkTheme, FontFamily, lightTheme } from '@/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUnreadCount } from '@/hooks/use-notifications';

export default function TabLayout() {
  // Bildirim tab badge'i — query her tab focus'ta refetch oluyor (notifications.tsx
  // useFocusEffect). Burada sadece unread count'u izle ve `tabBarBadge` prop'una
  // bağla; React-Navigation re-render'da badge'i günceller.
  const unreadCount = useUnreadCount();
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? darkTheme : lightTheme;

  return (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        tabBarActiveTintColor: t.accent.clay,
        tabBarInactiveTintColor: t.text.tertiary,
        tabBarStyle: {
          backgroundColor: t.surface.primary,
          borderTopColor: t.border.subtle,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 84,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: FontFamily.bodyMedium,
          fontSize: 11,
          letterSpacing: 0.3,
        },
        tabBarBadgeStyle: {
          backgroundColor: t.accent.clay,
          color: t.accent.clayOnAccent,
          fontFamily: FontFamily.bodySemibold,
        },
        headerShown: true,
        headerStyle: { backgroundColor: t.surface.canvas },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: FontFamily.display,
          fontSize: 20,
          color: t.text.primary,
        },
        headerTintColor: t.accent.clay,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Anasayfa',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trainings"
        options={{
          title: 'Eğitimlerim',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size} name="book.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="certificates"
        options={{
          title: 'Sertifikalar',
          tabBarIcon: ({ color, size }) => <IconSymbol size={size} name="rosette" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Bildirimler',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size} name="bell.fill" color={color} />
          ),
          // 99+ üstü daraltma — iOS native pattern (Mail/Messages)
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
