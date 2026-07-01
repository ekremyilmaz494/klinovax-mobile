import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ComponentProps } from 'react';
import type { OpaqueColorValue } from 'react-native';

/**
 * Tab bar ikonu — App Store 2.1(a) reddi (iPad'de tab bar tepkisiz).
 *
 * Kök neden: iOS'ta `IconSymbol` → expo-symbols `SymbolView` NATIVE bir UIView'dir
 * ve tab hücresinin ortasındaki dokunuşu yutar (react-navigation#12935). New Arch
 * altında RN `pointerEvents="none"` sarmalayıcısı gerçek cihazda (iPadOS 26.6) bu
 * native alt-görünümü güvenilir biçimde etkisizleştiremedi → tab'lar tıklanamadı.
 *
 * Çözüm: tab bar ikonlarını native görünüm İÇERMEYEN bir font-glyph ile çiz
 * (MaterialIcons — Android'de zaten kullanılan, kanıtlanmış yol). Font glyph'in
 * dokunuşu yakalayacak native alt-görünümü yoktur → hit-test daima tab'ın
 * Pressable'ına düşer. Uygulamanın geri kalanı native SF Symbol (`IconSymbol`)
 * kullanmaya devam eder; bu bileşen SADECE alt sekme çubuğu içindir.
 */
export type TabIconName = 'home' | 'trainings' | 'certificates' | 'notifications' | 'profile';

const MATERIAL_NAME: Record<TabIconName, ComponentProps<typeof MaterialIcons>['name']> = {
  home: 'home',
  trainings: 'book',
  certificates: 'workspace-premium',
  notifications: 'notifications',
  profile: 'person',
};

export function TabBarIcon({
  name,
  color,
  size = 26,
}: {
  name: TabIconName;
  color: string | OpaqueColorValue;
  size?: number;
}) {
  return <MaterialIcons name={MATERIAL_NAME[name]} color={color} size={size} />;
}
