import { Stack } from 'expo-router';

import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import { FontFamily, lightTheme, darkTheme } from '@/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Exam grubu için ayrı error boundary: bir sınav ekranı (timer/video/submit)
// throw ederse kullanıcı tüm app'i değil sadece bu route'u kaybeder. Sentry'de
// 'exam' tag'iyle ayrılır ki sınav-akışı crash'leri ayrı izlenebilsin.
export { ExamErrorBoundary as ErrorBoundary } from '@/components/ui/ExamErrorBoundary';

/**
 * Exam grup layout'u. Sınav ekranlarının Stack kayıtlarını root'tan buraya
 * taşır; route path'leri (`/exam/[assignmentId]/start` vb.) değişmez. Ekranların
 * kendi içindeki `<Stack.Screen options>` kullanımları bu navigator'ı hedefler.
 */
export default function ExamLayout() {
  const colorScheme = useColorScheme();
  const t = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: t.surface.canvas },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: FontFamily.display,
          fontSize: 18,
          color: t.text.primary,
        },
        headerTintColor: t.accent.clay,
        headerBackTitle: 'Geri',
        // iOS 26 + RNS 4.16 native back button bug'ı (#3294) — root layout ile
        // aynı workaround. Ayrıca nested Stack'in ilk ekranı (start) native back
        // alamadığı için bu buton oraya da çıkış yolu sağlar (router.back()
        // navigator sınırlarını aşar).
        headerBackVisible: false,
        headerLeft: () => <HeaderBackButton />,
        contentStyle: { backgroundColor: t.surface.canvas },
      }}
    >
      <Stack.Screen name="start" />
      {/* Sınav esnasında geri swipe ile yanlışlıkla çıkışı engelle (anti-cheat). */}
      <Stack.Screen name="questions" options={{ gestureEnabled: false }} />
      <Stack.Screen name="videos" />
      <Stack.Screen name="result" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
