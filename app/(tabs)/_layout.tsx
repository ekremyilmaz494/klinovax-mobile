import { router, Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { TabBarIcon } from '@/components/ui/tab-bar-icon';
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
        // Sola hizalı başlık: ortalı başlık dashboard'daki headerRight (takvim)
        // yüzünden sıkışıp "Ana Sayfa" → "Ana Sa..." diye kesiliyordu. Sol hizada
        // tam genişlik alır + sol-hizalı editorial içerikle tutarlıdır.
        headerTitleAlign: 'left',
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
          tabBarIcon: ({ color, size }) => <TabBarIcon size={size} name="home" color={color} />,
          // Başlık kısaltma fix'i: headerRight (takvim) varken React-Navigation ortalı
          // başlığın genişliğini kısıp "Ana Sayfa" → "Ana Sa..." diye elliptik kesiyordu.
          // Özel headerTitle + genişlik kısıtı kaldırılmış container ile tam metin garanti.
          headerTitle: () => (
            <Text
              numberOfLines={1}
              style={{ fontFamily: FontFamily.display, fontSize: 20, color: t.text.primary }}
            >
              Ana Sayfa
            </Text>
          ),
          headerTitleContainerStyle: { maxWidth: undefined },
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
            <TabBarIcon size={size} name="trainings" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="certificates"
        options={{
          title: 'Sertifikalar',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon size={size} name="certificates" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Bildirimler',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon size={size} name="notifications" color={color} />
          ),
          // 99+ üstü daraltma — iOS native pattern (Mail/Messages)
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <TabBarIcon size={size} name="profile" color={color} />,
        }}
      />
    </Tabs>
  );
}
