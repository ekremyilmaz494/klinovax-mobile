import { router, Stack as ExpoStack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenError } from '@/components/ui/ScreenError';
import { Button, Card, IconDot, Stack, Text, useTheme } from '@/design-system';
import { useDailyQuestions, useSubmitDailyQuestions } from '@/hooks/use-daily-questions';
import { useOnline } from '@/lib/network/use-online';
import type { DailyAnswer, DailyQuestion, DailySubmitResponse } from '@/types/daily';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/**
 * Idempotency/dedup anahtarı — backend aynı submissionId'de krediyi bir kez verir.
 * Backend `z.string().uuid()` zorunlu kıldığı için RFC-4122 v4 formatında üretilir
 * (geçersiz format → 400). expo-crypto yeni native bağımlılık olurdu; dedup anahtarı
 * için kriptografik güç değil, format + benzersizlik yeterli (backend zaten dedup'lar).
 */
function newSubmissionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Günün Soruları — eğitim sonrası kısa, opsiyonel pekiştirme (spaced-repetition).
 * Zorunlu sınavdan tamamen AYRI: timer / no-seek / 423 faz makinesi YOK; tüm
 * sorular tek listede, anında geri bildirimli. Korunan sınav akışına dokunmaz.
 */
export default function DailyQuizScreen() {
  const t = useTheme();
  const { data, isLoading, error, refetch } = useDailyQuestions();
  const submit = useSubmitDailyQuestions();
  const [answers, setAnswers] = useState<Map<string, string>>(() => new Map());
  const [result, setResult] = useState<DailySubmitResponse | null>(null);
  const [queued, setQueued] = useState(false);
  const { isOnline } = useOnline();

  const questions = data?.questions ?? [];
  const allAnswered = questions.length > 0 && questions.every((q) => answers.has(q.questionId));

  const handleSelect = (questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(questionId, optionId);
      return next;
    });
  };

  const handleSubmit = () => {
    const payload: DailyAnswer[] = questions
      .map((q) => ({ questionId: q.questionId, optionId: answers.get(q.questionId) }))
      .filter((a): a is DailyAnswer => a.optionId !== undefined);
    const vars = { submissionId: newSubmissionId(), answers: payload };
    if (!isOnline) {
      // Offline: mutation offline-resume kuyruğuna alınır (idempotent), online dönünce
      // replay olur. Sonuç (doğru/puan) sunucu-hesaplı olduğu için şimdi gösterilemez →
      // "kuyruğa alındı" ekranı.
      submit.mutate(vars);
      setQueued(true);
      return;
    }
    submit.mutate(vars, { onSuccess: (res) => setResult(res) });
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen options={{ title: 'Günün Soruları' }} />

      {isLoading && !data ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
        </View>
      ) : error && !data ? (
        <ScreenError
          message={error.message || 'Sorular yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      ) : result ? (
        <ResultView result={result} onDone={() => router.back()} />
      ) : queued ? (
        <QueuedView onDone={() => router.back()} />
      ) : !data?.available || questions.length === 0 ? (
        <EmptyState
          icon="checkmark.seal.fill"
          title="Bugün tekrar sorusu yok"
          description="Bugünlük pekiştirme tamam. Yeni sorular vadesi geldikçe burada görünecek."
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: t.space[5], paddingBottom: t.space[10] }}>
          <Text variant="subhead" tone="tertiary" style={{ marginBottom: t.space[5] }}>
            Kısa bir tekrar — öğrendiklerini pekiştir. {questions.length} soru.
          </Text>

          <View style={{ gap: t.space[6] }}>
            {questions.map((q, qi) => (
              <QuestionCard
                key={q.questionId}
                question={q}
                index={qi}
                selectedOptionId={answers.get(q.questionId)}
                onSelect={(optionId) => handleSelect(q.questionId, optionId)}
              />
            ))}
          </View>

          {submit.isError ? (
            <Text variant="footnote" style={{ color: t.colors.text.danger, marginTop: t.space[4] }}>
              Gönderilemedi. Bağlantını kontrol edip tekrar dene.
            </Text>
          ) : null}

          <Button
            label="Cevapları gönder"
            onPress={handleSubmit}
            loading={submit.isPending}
            disabled={!allAnswered}
            fullWidth
            style={{ marginTop: t.space[6] }}
          />
          {!allAnswered ? (
            <Text
              variant="caption"
              tone="tertiary"
              align="center"
              style={{ marginTop: t.space[2] }}
            >
              Tüm soruları cevaplayınca gönderebilirsin.
            </Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function QuestionCard({
  question,
  index,
  selectedOptionId,
  onSelect,
}: {
  question: DailyQuestion;
  index: number;
  selectedOptionId: string | undefined;
  onSelect: (optionId: string) => void;
}) {
  const t = useTheme();
  return (
    <Card>
      <Text variant="overline" tone="tertiary" style={{ marginBottom: t.space[2] }}>
        SORU {index + 1}
      </Text>
      <Text variant="title-3" maxFontSizeMultiplier={1.6}>
        {question.prompt}
      </Text>

      <View style={{ marginTop: t.space[4], gap: t.space[3] }}>
        {question.options.map((opt, oi) => {
          const selected = selectedOptionId === opt.optionId;
          return (
            <Pressable
              key={opt.optionId}
              onPress={() => onSelect(opt.optionId)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                backgroundColor: selected ? t.colors.accent.clayMuted : t.colors.surface.primary,
                padding: t.space[4],
                borderRadius: t.radius.md,
                borderWidth: selected ? 2 : t.hairline,
                borderColor: selected ? t.colors.accent.clay : t.colors.border.default,
                alignItems: 'center',
                gap: t.space[3],
                minHeight: 56,
                opacity: pressed ? 0.92 : 1,
              })}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: selected ? t.colors.accent.clay : t.colors.surface.secondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Harf rozeti — questions.tsx ile aynı kabul edilen Fraunces istisnası. */}
                <Text
                  style={{
                    fontFamily: 'Fraunces_700Bold',
                    fontSize: 15,
                    color: selected ? t.colors.accent.clayOnAccent : t.colors.text.tertiary,
                  }}
                >
                  {LETTERS[oi] ?? String(oi + 1)}
                </Text>
              </View>
              <Text
                variant="body"
                weight={selected ? 'medium' : 'regular'}
                maxFontSizeMultiplier={1.6}
                style={{
                  flex: 1,
                  color: selected ? t.colors.text.primary : t.colors.text.secondary,
                }}
              >
                {opt.text}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function QueuedView({ onDone }: { onDone: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: t.space[5] }}>
      <Card rail>
        <Text variant="overline" tone="tertiary" style={{ marginBottom: t.space[2] }}>
          KAYDEDİLDİ
        </Text>
        <Text variant="title-3">Cevapların kaydedildi</Text>
        <Text variant="body" tone="tertiary" style={{ marginTop: t.space[2] }}>
          Çevrimiçi olduğunda otomatik gönderilip puanın eklenecek. Bağlantıyı beklemen gerekmez.
        </Text>
        <Button label="Bitti" onPress={onDone} fullWidth style={{ marginTop: t.space[6] }} />
      </Card>
    </View>
  );
}

function ResultView({ result, onDone }: { result: DailySubmitResponse; onDone: () => void }) {
  const t = useTheme();
  const total = result.results.length;
  return (
    <ScrollView contentContainerStyle={{ padding: t.space[5], paddingBottom: t.space[10] }}>
      <Card variant="success" rail>
        <Text variant="overline" tone="tertiary" style={{ marginBottom: t.space[2] }}>
          PEKİŞTİRME TAMAMLANDI
        </Text>
        <Text
          variant="metric"
          maxFontSizeMultiplier={1.6}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {result.correctCount}
          {total > 0 ? `/${total}` : ''}
        </Text>
        <Text variant="subhead" tone="tertiary" style={{ marginTop: t.space[1] }}>
          doğru cevap
        </Text>
        {result.pointsAwarded > 0 ? (
          <Text variant="bodyEmph" style={{ color: t.colors.accent.clay, marginTop: t.space[3] }}>
            +{result.pointsAwarded} puan
          </Text>
        ) : null}
      </Card>

      {total > 0 ? (
        <View style={{ marginTop: t.space[6], gap: t.space[3] }}>
          {result.results.map((r) => (
            <Stack key={r.questionId} direction="row" align="center" gap={3}>
              <IconDot variant={r.correct ? 'success' : 'danger'} size={24} />
              <Text variant="footnote" tone="tertiary" style={{ flex: 1 }}>
                {r.correct ? 'Doğru' : 'Tekrar denenecek'} · Kutu {r.newBox}
              </Text>
            </Stack>
          ))}
        </View>
      ) : null}

      <Button label="Bitti" onPress={onDone} fullWidth style={{ marginTop: t.space[8] }} />
    </ScrollView>
  );
}
