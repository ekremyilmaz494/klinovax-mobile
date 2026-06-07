import { router, Tabs } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  // app.json edgeToEdgeEnabled:true → uygulama sistem nav çubuğunun ardına çiziliyor.
  // tabBarStyle.height'a sabit değer vermek React-Navigation'ın otomatik güvenli-alan
  // eklemesini kapatıyordu; alttaki inset'i hem yüksekliğe (görünür alan korunsun)
  // hem paddingBottom'a (etiketler sistem tuşlarının üstüne çıksın) elle ekliyoruz.
  const insets = useSafeAreaInsets();

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
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
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
          title: 'Ana Sayfa',
          // Sola hizala: başlık, sağdaki takvim ikonuna kadar tüm genişliği kullanır
          // → "Ana Sayfa" native header'da artık kesilmez (önceki "Anasa…" bug'ı).
          headerTitleAlign: 'left',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size} name="house.fill" color={color} />
          ),
          // Takvim'e hızlı erişim — eğitim/sınav son tarihlerini ay görünümünde aç.
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/calendar')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Takvim"
              style={({ pressed }) => ({ marginRight: 16, opacity: pressed ? 0.6 : 1 })}
            >
              <IconSymbol name="calendar" size={24} color={t.accent.clay} />
            </Pressable>
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
