import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack as ExpoStack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CelebrationOverlay } from '@/components/ui/CelebrationOverlay';
import { ScreenError } from '@/components/ui/ScreenError';
import { Button, Card, Stack, Text, useTheme } from '@/design-system';
import { useAndroidBackGuard } from '@/hooks/use-android-back-guard';
import { fetchExamResults } from '@/lib/api/exam';
import { fetchTrainingDetail } from '@/lib/api/staff';
import { resolveFeedbackCta } from '@/lib/exam/result-gating';
import type { ExamResultDetail, ExamResultsResponse } from '@/types/exam';
import type { TrainingDetail } from '@/types/staff';

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
        <ResultBody data={data} assignmentId={assignmentId} />
      )}
    </SafeAreaView>
  );
}

function ResultBody({ data, assignmentId }: { data: ExamResultsResponse; assignmentId: string }) {
  const t = useTheme();
  const passed = data.isPassed;
  const heroBg = passed ? t.colors.status.successBg : t.colors.status.dangerBg;
  const heroBorder = passed ? t.colors.status.success : t.colors.status.danger;
  const heroAccent = passed ? t.colors.status.success : t.colors.status.danger;

  // validate() graceful pass-through olduğundan backend kontratı kırılırsa (score/
  // attemptsRemaining eksik) bu alanlar undefined gelebilir; Math.round(undefined)=NaN
  // → "%NaN" hero + yanlış "deneme bitti" dalı. Tüketimde savunmacı oku.
  const scoreText = Number.isFinite(data.score) ? `%${Math.round(data.score)}` : '%—';
  const attemptsRemaining = Number.isFinite(data.attemptsRemaining) ? data.attemptsRemaining : 0;

  // Feedback durumu eğitim detayından okunur — results endpoint'i feedback bilgisi
  // dönmez. Query key trainings/[id].tsx ile aynı (cache paylaşımı); mount'taki
  // invalidation sayesinde deneme sonrası taze canSubmit değeri gelir.
  const { data: detail } = useQuery<TrainingDetail, Error>({
    queryKey: ['training-detail', assignmentId],
    queryFn: () => fetchTrainingDetail(assignmentId),
  });
  const feedbackCta = resolveFeedbackCta(detail);

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: t.space[5], paddingBottom: t.space[12] }}>
        <View
          style={{
            backgroundColor: heroBg,
            borderRadius: t.radius.xl,
            borderWidth: 1,
            borderColor: heroBorder,
            padding: t.space[10],
            alignItems: 'center',
          }}
        >
          <Text variant="overline" weight="bold" style={{ color: heroAccent }}>
            {passed ? 'Başarılı' : 'Başarısız'}
          </Text>
          <Text
            italic
            maxFontSizeMultiplier={1.6}
            style={{
              fontFamily: 'Fraunces_700Bold',
              fontSize: 80,
              lineHeight: 88,
              letterSpacing: -2,
              color: t.colors.text.primary,
              marginTop: t.space[2],
              fontVariant: ['tabular-nums'],
            }}
          >
            {scoreText}
          </Text>
          <Text variant="footnote" tone="tertiary" style={{ marginTop: t.space[2] }}>
            Geçme barajı:{' '}
            <Text variant="footnote" weight="semibold" style={{ color: t.colors.text.primary }}>
              %{data.passingScore}
            </Text>
          </Text>
        </View>

        {!passed ? (
          <Card variant="warning" rail style={{ marginTop: t.space[6] }}>
            <Text
              variant="overline"
              style={{ color: t.colors.status.warning, marginBottom: t.space[1] }}
            >
              {attemptsRemaining > 0 ? 'TEKRAR DENE' : 'DENEME HAKKI BİTTİ'}
            </Text>
            <Text variant="body" tone="primary">
              Geçmek için %{data.passingScore} ve üzeri puan almanız gerekiyor.{' '}
              {attemptsRemaining > 0
                ? `Kalan deneme: ${attemptsRemaining}. Doğru cevaplar başarılı denemeden sonra görünür olacak.`
                : 'Yeni deneme hakkın kalmadı — eğitim sayfasından yöneticinden ek hak talep edebilirsin.'}
            </Text>
          </Card>
        ) : null}

        {passed && data.results && data.results.length > 0 ? (
          <>
            <Text variant="title-3" style={{ marginTop: t.space[8], marginBottom: t.space[3] }}>
              Soru bazlı detay
            </Text>
            <View style={{ gap: t.space[3] }}>
              {data.results.map((r, i) => (
                <ResultRow key={`q-${i}`} index={i + 1} item={r} />
              ))}
            </View>
          </>
        ) : null}

        <View style={{ marginTop: t.space[8], gap: t.space[3] }}>
          {feedbackCta ? (
            // Zorunlu feedback'i burada doldurtmak, personeli bir sonraki sınav
            // başlangıcındaki 423 kilidine hiç sokmaz (çıkmaz sokak önleme).
            <Button
              label={feedbackCta.mandatory ? 'Geri bildirim ver (zorunlu)' : 'Geri bildirim ver'}
              variant="primary"
              size="lg"
              onPress={() =>
                router.push({
                  pathname: '/feedback/[attemptId]',
                  params: { attemptId: feedbackCta.attemptId, title: detail?.title ?? '' },
                })
              }
              fullWidth
            />
          ) : null}
          {passed ? (
            <Button
              label="Sertifikamı gör"
              variant={feedbackCta ? 'outline' : 'primary'}
              size="lg"
              onPress={() => router.replace('/(tabs)/certificates')}
              fullWidth
            />
          ) : attemptsRemaining > 0 ? (
            <Button
              label={`Yeniden dene · ${attemptsRemaining} hak kaldı`}
              variant="primary"
              size="lg"
              onPress={() => router.replace(`/trainings/${assignmentId}`)}
              fullWidth
            />
          ) : (
            // Hak bitti: çıkmaz sokak bırakma — eğitim detayındaki ek hak talebi
            // formuna yönlendir (AttemptRequestSection).
            <Button
              label="Ek deneme hakkı talep et"
              variant="primary"
              size="lg"
              onPress={() => router.replace(`/trainings/${assignmentId}`)}
              fullWidth
            />
          )}
          <Button
            label="Eğitim listesine dön"
            variant={passed || attemptsRemaining > 0 ? 'outline' : 'primary'}
            size="lg"
            onPress={() => router.replace('/(tabs)/trainings')}
            fullWidth
          />
        </View>
      </ScrollView>
      {/* Kutlama yalnız NÖTR başarıda (sınav geçme); başarısız dalda yok. */}
      {passed ? <CelebrationOverlay /> : null}
    </>
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
        padding: t.space[4],
      }}
    >
      <Text variant="overline" tone="tertiary">
        Soru {index}
      </Text>
      <Text variant="title-3" maxFontSizeMultiplier={1.6} style={{ marginTop: t.space[2] }}>
        {item.questionText}
      </Text>

      <Stack direction="row" align="flex-start" gap={2} style={{ marginTop: t.space[3] }} wrap>
        <Text variant="footnote" tone="tertiary" weight="semibold">
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
        <Stack direction="row" align="flex-start" gap={2} style={{ marginTop: t.space[2] }} wrap>
          <Text variant="footnote" tone="tertiary" weight="semibold">
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
