import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Text, useTheme } from '@/design-system';
import { ApiError } from '@/lib/api/client';
import { cacheCertificatePdf, shareCertificatePdf } from '@/lib/api/cert-download';

export default function CertificatePreviewScreen() {
  const t = useTheme();
  const { id, code, title } = useLocalSearchParams<{ id: string; code: string; title?: string }>();
  const router = useRouter();
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const fileUri = await cacheCertificatePdf({ id, certificateCode: code });
        if (!cancelled) setUri(fileUri);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof ApiError ? err.message : 'PDF yüklenemedi.';
        setError(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, code]);

  const onShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await shareCertificatePdf({ id, certificateCode: code });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Paylaşılamadı.';
      Alert.alert('Hata', msg);
    } finally {
      setSharing(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: title || 'Sertifika',
          headerTitleAlign: 'center',
          headerLeft: () => (
            <HeaderCircleButton
              onPress={() => router.back()}
              icon="close"
              accessibilityLabel="Kapat"
            />
          ),
          headerRight: () => (
            <HeaderCircleButton
              onPress={() => void onShare()}
              icon="share-outline"
              busy={sharing}
              disabled={!uri}
              accessibilityLabel="Paylaş"
            />
          ),
        }}
      />
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}
      >
        {error ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              gap: 16,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: t.colors.status.dangerBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconSymbol
                name="exclamationmark.triangle.fill"
                size={32}
                color={t.colors.status.danger}
              />
            </View>
            <Text variant="title-3" align="center">
              {error}
            </Text>
          </View>
        ) : !uri ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              gap: 16,
            }}
          >
            <ActivityIndicator size="large" color={t.colors.accent.clay} />
            <Text variant="subhead" tone="tertiary">
              PDF hazırlanıyor…
            </Text>
          </View>
        ) : (
          <WebView
            source={{ uri }}
            style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}
            originWhitelist={['*']}
            allowFileAccess={Platform.OS === 'android'}
            allowFileAccessFromFileURLs={Platform.OS === 'android'}
            allowUniversalAccessFromFileURLs={Platform.OS === 'android'}
            startInLoadingState
            renderLoading={() => (
              <View
                style={[
                  StyleSheet.absoluteFillObject,
                  { alignItems: 'center', justifyContent: 'center' },
                ]}
              >
                <ActivityIndicator size="large" color={t.colors.accent.clay} />
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </>
  );
}

function HeaderCircleButton({
  onPress,
  icon,
  busy,
  disabled,
  accessibilityLabel,
}: {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  busy?: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: t.colors.surface.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed || busy ? 0.6 : disabled ? 0.4 : 1,
      })}
    >
      {busy ? (
        <ActivityIndicator size="small" color={t.colors.text.primary} />
      ) : (
        <Ionicons
          name={icon}
          size={18}
          color={disabled ? t.colors.text.tertiary : t.colors.text.primary}
        />
      )}
    </Pressable>
  );
}
