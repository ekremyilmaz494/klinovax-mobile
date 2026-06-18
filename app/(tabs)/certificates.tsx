import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenError } from '@/components/ui/ScreenError';
import { Button, Stack, Text, useTheme } from '@/design-system';
import { shareCertificatePdf } from '@/lib/api/cert-download';
import { shareTranscriptPdf } from '@/lib/api/transcript-download';
import { ApiError } from '@/lib/api/client';
import { fetchCertificates } from '@/lib/api/staff';
import { useAuthStore } from '@/store/auth';
import type { Certificate, CertificatesResponse } from '@/types/staff';

export default function CertificatesScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [refreshing, setRefreshing] = useState(false);

  const { data, error, isLoading, refetch } = useQuery<CertificatesResponse, Error>({
    queryKey: ['certificates'],
    enabled: !!user,
    queryFn: () => fetchCertificates(),
  });

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) void logout();
  }, [error, logout]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  if (isLoading && !data) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}
      >
        <ScreenError
          message={error.message || 'Sertifikalar yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  const items = data?.certificates ?? [];

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <CertificateCard cert={item} />}
        contentContainerStyle={{ padding: t.space[4], paddingBottom: t.space[12] }}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={{ marginBottom: t.space[4], paddingHorizontal: t.space[1] }}>
              <Text variant="overline" tone="tertiary" style={{ marginBottom: t.space[1] }}>
                {data?.total ?? items.length} SERTİFİKA
              </Text>
              <Text variant="title-2">Başarımların</Text>
              <View style={{ marginTop: t.space[4] }}>
                <TranscriptButton />
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="rosette"
            title="Henüz sertifikan yok"
            description="Bir eğitimi başarıyla tamamladığında sertifikan burada görünecek."
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.accent.clay}
          />
        }
        windowSize={10}
        initialNumToRender={8}
        maxToRenderPerBatch={5}
        removeClippedSubviews={true}
      />
    </SafeAreaView>
  );
}

/**
 * Transkript = tüm tamamlanmış eğitimlerin tek PDF dökümü. Backend yalnızca PDF
 * döner; sertifika paylaşımıyla aynı share-sheet yolundan iner.
 */
function TranscriptButton() {
  const t = useTheme();
  const [sharing, setSharing] = useState(false);
  const onPress = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await shareTranscriptPdf();
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Transkript indirilemedi.');
    } finally {
      setSharing(false);
    }
  };
  return (
    <Button
      label={sharing ? 'Hazırlanıyor…' : 'Transkriptimi paylaş'}
      variant="outline"
      onPress={onPress}
      disabled={sharing}
      loading={sharing}
      iconLeft={
        !sharing ? (
          <Ionicons name="document-text-outline" size={18} color={t.colors.accent.clay} />
        ) : undefined
      }
      fullWidth
    />
  );
}

const CertificateCard = memo(function CertificateCard({ cert }: { cert: Certificate }) {
  const t = useTheme();
  const router = useRouter();
  const [sharing, setSharing] = useState(false);

  const issued = new Date(cert.issuedAt).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const expires = cert.expiresAt
    ? new Date(cert.expiresAt).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  const goPreview = () => {
    router.push({
      pathname: '/certificates/[id]/preview',
      params: { id: cert.id, code: cert.certificateCode, title: cert.training.title },
    });
  };

  const onShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await shareCertificatePdf({ id: cert.id, certificateCode: cert.certificateCode });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Paylaşılamadı.';
      Alert.alert('Hata', msg);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Pressable
      onPress={goPreview}
      style={({ pressed }) => [
        {
          backgroundColor: t.colors.surface.primary,
          borderRadius: t.radius.lg,
          borderWidth: t.hairline,
          borderColor: t.colors.border.subtle,
          padding: t.space[6],
          opacity: pressed ? 0.92 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${cert.training.title} sertifikasını önizle`}
    >
      {cert.training.category ? (
        <Text variant="overline" tone="tertiary" style={{ marginBottom: t.space[2] }}>
          {cert.training.category}
        </Text>
      ) : null}

      <Stack direction="row" justify="space-between" gap={3} align="flex-start">
        <Text variant="title-3" numberOfLines={2} style={{ flex: 1 }}>
          {cert.training.title}
        </Text>
        {cert.isExpired ? (
          <Badge label="Süresi doldu" tone="danger" />
        ) : (
          <Badge label={`%${cert.score}`} tone="success" />
        )}
      </Stack>

      <View
        style={{
          flexDirection: 'row',
          marginTop: t.space[5],
          paddingVertical: t.space[4],
          borderTopWidth: t.hairline,
          borderBottomWidth: t.hairline,
          borderColor: t.colors.border.subtle,
        }}
      >
        <MetaCol label="Verildi" value={issued} />
        <View style={{ width: t.hairline, backgroundColor: t.colors.border.subtle }} />
        <MetaCol label="Geçerlilik" value={expires ?? '—'} expired={cert.isExpired} />
        <View style={{ width: t.hairline, backgroundColor: t.colors.border.subtle }} />
        <MetaCol label="Deneme" value={`#${cert.attemptNumber}`} />
      </View>

      <Text
        variant="mono"
        tone="tertiary"
        selectable
        style={{ marginTop: t.space[3], fontVariant: ['tabular-nums'] }}
      >
        {cert.certificateCode}
      </Text>

      {cert.training.isArchived ? (
        <Text variant="caption" tone="tertiary" italic style={{ marginTop: t.space[2] }}>
          Bu eğitim arşivlenmiş.
        </Text>
      ) : null}

      <Stack direction="row" gap={3} style={{ marginTop: t.space[5] }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Önizle"
            variant="primary"
            onPress={goPreview}
            iconLeft={
              <Ionicons name="eye-outline" size={18} color={t.colors.accent.clayOnAccent} />
            }
            fullWidth
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={sharing ? '…' : 'Paylaş'}
            variant="outline"
            onPress={onShare}
            disabled={sharing}
            loading={sharing}
            iconLeft={
              !sharing ? (
                <Ionicons name="share-outline" size={18} color={t.colors.accent.clay} />
              ) : undefined
            }
            fullWidth
          />
        </View>
      </Stack>
    </Pressable>
  );
});

function MetaCol({ label, value, expired }: { label: string; value: string; expired?: boolean }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 8 }}>
      <Text variant="overline" tone="tertiary" style={{ marginBottom: 4 }}>
        {label}
      </Text>
      <Text variant="bodyEmph" tone={expired ? 'danger' : 'primary'} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
