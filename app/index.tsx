import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/design-system';
import { useAuthStore } from '@/store/auth';

/**
 * Root index — auth durumuna göre login'e ya da dashboard'a yönlendir.
 * `_layout.tsx`'teki AuthGate hydrate sonrası segments-based redirect yapar;
 * burada ilk frame için splash görevi gören yönlendirici.
 */
export default function Index() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.colors.surface.canvas,
        }}
      >
        <ActivityIndicator color={t.colors.accent.clay} size="large" />
      </View>
    );
  }
  return <Redirect href={user ? '/(tabs)/dashboard' : '/(auth)/login'} />;
}
