import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack as ExpoStack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenError } from '@/components/ui/ScreenError';
import { Button, Card, Stack, Text, useTheme } from '@/design-system';
import { useAndroidBackGuard } from '@/hooks/use-android-back-guard';
import { fetchExamResults } from '@/lib/api/exam';
import type { ExamResultDetail, ExamResultsResponse } from '@/types/exam';

export default function ExamResultScreen() {
  const t = useTheme();
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const qc = useQueryClient();

  const { data, error, isLoading, refetch } = useQuery<ExamResultsResponse, Error>({
    queryKey: ['exam-results', assignmentId],
    queryFn: () => fetchExamResults(assignmentId),
  });

  const invalidatedRef = useRef(false);
  useEffect(() => {
    if (invalidatedRef.current) return;
    invalidatedRef.current = true;
    qc.invalidateQueries({ queryKey: ['my-trainings'] });
    qc.invalidateQueries({ queryKey: ['staff-dashboard'] });
    qc.invalidateQueries({ queryKey: ['certificates'] });
    qc.invalidateQueries({ queryKey: ['training-detail', assignmentId] });
  }, [qc, assignmentId]);

  // Android donanım back: questions ekranına dönmek absürt (sınav bitti),
  // iOS'taki "Eğitim listesine dön" butonuyla aynı hedefe yönlendir.
  useAndroidBackGuard(
    useCallback(() => {
      router.replace('/(tabs)/trainings');
      return true;
    }, []),
  );

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen
        options={{ title: 'Sonuç', headerBackVisible: false, headerLeft: () => null }}
      />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
        </View>
      ) : error || !data ? (
        <ScreenError
          message={error?.message ?? 'Sonuç yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      ) : (
        <ResultBody data={data} />
      )}
    </SafeAreaView>
  );
}

function ResultBody({ data }: { data: ExamResultsResponse }) {
  const t = useTheme();
  const passed = data.isPassed;
  const heroBg = passed ? t.colors.status.successBg : t.colors.status.dangerBg;
  const heroBorder = passed ? t.colors.status.success : t.colors.status.danger;
  const heroAccent = passed ? t.colors.status.success : t.colors.status.danger;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
      <View
        style={{
          backgroundColor: heroBg,
          borderRadius: t.radius.xl,
          borderWidth: 1,
          borderColor: heroBorder,
          padding: 36,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: 'InterTight_700Bold',
            fontSize: 12,
            letterSpacing: 1.6,
            color: heroAccent,
            textTransform: 'uppercase',
          }}
        >
          {passed ? 'Başarılı' : 'Başarısız'}
        </Text>
        <Text
          italic
          style={{
            fontFamily: 'Fraunces_700Bold',
            fontSize: 80,
            lineHeight: 88,
            letterSpacing: -2,
            color: t.colors.text.primary,
            marginTop: 8,
            fontVariant: ['tabular-nums'],
          }}
        >
          %{Math.round(data.score)}
        </Text>
        <Text variant="footnote" tone="tertiary" style={{ marginTop: 8 }}>
          Geçme barajı:{' '}
          <Text
            variant="footnote"
            style={{ fontFamily: 'InterTight_600SemiBold', color: t.colors.text.primary }}
          >
            %{data.passingScore}
          </Text>
        </Text>
      </View>

      {!passed ? (
        <Card variant="warning" rail style={{ marginTop: 24 }}>
          <Text variant="overline" style={{ color: t.colors.status.warning, marginBottom: 4 }}>
            TEKRAR DENE
          </Text>
          <Text variant="body" tone="primary">
            Geçmek için %{data.passingScore} ve üzeri puan almanız gerekiyor. Doğru cevaplar
            başarılı denemeden sonra görünür olacak.
          </Text>
        </Card>
      ) : null}

      {passed && data.results && data.results.length > 0 ? (
        <>
          <Text variant="title-3" style={{ marginTop: 28, marginBottom: 12 }}>
            Soru bazlı detay
          </Text>
          <View style={{ gap: 10 }}>
            {data.results.map((r, i) => (
              <ResultRow key={r.questionText.substring(0, 40)} index={i + 1} item={r} />
            ))}
          </View>
        </>
      ) : null}

      <View style={{ marginTop: 32 }}>
        <Button
          label="Eğitim listesine dön"
          variant="primary"
          size="lg"
          onPress={() => router.replace('/(tabs)/trainings')}
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

function ResultRow({ index, item }: { index: number; item: ExamResultDetail }) {
  const t = useTheme();
  const correct = item.isCorrect;
  const railColor = correct ? t.colors.status.success : t.colors.status.danger;
  return (
    <View
      style={{
        backgroundColor: t.colors.surface.primary,
        borderRadius: t.radius.lg,
        borderWidth: t.hairline,
        borderColor: t.colors.border.subtle,
        borderLeftWidth: 4,
        borderLeftColor: railColor,
        padding: 16,
      }}
    >
      <Text variant="overline" tone="tertiary">
        Soru {index}
      </Text>
      <Text variant="title-3" style={{ marginTop: 6 }}>
        {item.questionText}
      </Text>

      <Stack direction="row" align="flex-start" gap={2} style={{ marginTop: 12 }} wrap>
        <Text variant="footnote" tone="tertiary" style={{ fontFamily: 'InterTight_600SemiBold' }}>
          Cevabın:
        </Text>
        <Text
          variant="footnote"
          style={{ flex: 1, color: correct ? t.colors.text.primary : t.colors.status.danger }}
        >
          {item.selectedOptionText ?? 'Boş bırakıldı'}
        </Text>
      </Stack>

      {!correct && item.correctOptionText ? (
        <Stack direction="row" align="flex-start" gap={2} style={{ marginTop: 8 }} wrap>
          <Text variant="footnote" tone="tertiary" style={{ fontFamily: 'InterTight_600SemiBold' }}>
            Doğrusu:
          </Text>
          <Text variant="footnote" style={{ flex: 1, color: t.colors.status.success }}>
            {item.correctOptionText}
          </Text>
        </Stack>
      ) : null}
    </View>
  );
}
