import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Text, useTheme } from '@/design-system';

/**
 * iOS 26 + react-native-screens 4.16 workaround: native back button,
 * headerShown:false bir ekrandan (tab'lar) push edilince dokunuşa yanıt vermiyor
 * (software-mansion/react-native-screens#3294). Custom headerLeft butonu RN'in
 * kendi touch sistemini kullandığı için bu bug'dan etkilenmez.
 * RNS fix'i Expo SDK'ya girince native back button'a geri dönülebilir.
 */
export function HeaderBackButton({ label = 'Geri' }: { label?: string }) {
  const t = useTheme();

  // Stack'in ilk ekranında back gösterme — native davranışla aynı.
  if (!router.canGoBack()) return null;

  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Geri dön"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        opacity: pressed ? 0.5 : 1,
        // Native back button'un başladığı sol hizaya otur
        marginLeft: -4,
        paddingRight: 12,
      })}
    >
      <IconSymbol name="chevron.left" size={22} color={t.colors.accent.clay} />
      <Text variant="body" style={{ color: t.colors.accent.clay }}>
        {label}
      </Text>
    </Pressable>
  );
}
