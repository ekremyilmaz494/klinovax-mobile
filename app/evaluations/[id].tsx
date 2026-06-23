import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack as ExpoStack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenError } from '@/components/ui/ScreenError';
import { Button, ContentMaxWidth, InputField, Stack, Text, useTheme } from '@/design-system';
import { ApiError } from '@/lib/api/client';
import { fetchEvaluation, submitEvaluation } from '@/lib/api/competency';
import { evaluatorTypeLabel } from '@/lib/competency/labels';
import type { EvaluationDetailResponse, EvaluationItem } from '@/types/competency';

type Answer = { score?: number; comment: string };

export default function EvaluationFillScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<EvaluationDetailResponse, Error>({
    queryKey: ['evaluation', id],
    queryFn: () => fetchEvaluation(id),
    // Form yapısı + cevaplar her açılışta taze (kısmi ilerleme doğru gelsin).
    staleTime: 0,
  });

  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const initRef = useRef(false);
  useEffect(() => {
    if (data && !initRef.current) {
      initRef.current = true;
      const init: Record<string, Answer> = {};
      for (const a of data.evaluation.answers) {
        init[a.itemId] = { score: a.score, comment: a.comment ?? '' };
      }
      setAnswers(init);
    }
  }, [data]);

  const categories = data?.evaluation.form.categories ?? [];
  const allItems = useMemo<EvaluationItem[]>(
    () => data?.evaluation.form.categories.flatMap((c) => c.items) ?? [],
    [data],
  );
  const total = allItems.length;
  const answered = allItems.filter((it) => answers[it.id]?.score != null).length;
  const allAnswered = total > 0 && answered === total;
  const alreadyDone = data?.evaluation.status === 'COMPLETED';

  const setScore = (itemId: string, score: number) =>
    setAnswers((prev) => ({ ...prev, [itemId]: { ...prev[itemId], score } }));
  const setComment = (itemId: string, comment: string) =>
    setAnswers((prev) => ({ ...prev, [itemId]: { score: prev[itemId]?.score, comment } }));

  const mutation = useMutation<{ success: true; overallScore: number }, Error, void>({
    mutationFn: () =>
      submitEvaluation(id, {
        answers: allItems.map((it) => ({
          itemId: it.id,
          score: answers[it.id]!.score!,
          comment: answers[it.id]?.comment?.trim() || undefined,
        })),
      }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['evaluations'] });
      void qc.invalidateQueries({ queryKey: ['competency-me'] });
      // validate() graceful pass-through — drift'te overallScore undefined gelebilir;
      // Math.round(undefined)=NaN → "%NaN" alert. Sonlu değilse skor cümlesini at.
      const pct = Number.isFinite(res.overallScore) ? Math.round(res.overallScore) : null;
      Alert.alert(
        'Gönderildi',
        pct === null
          ? 'Değerlendirme tamamlandı.'
          : `Değerlendirme tamamlandı. Genel skor: %${pct}`,
        [{ text: 'Tamam', onPress: () => router.back() }],
      );
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        Alert.alert('Zaten tamamlandı', 'Bu değerlendirme daha önce gönderilmiş.', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
        return;
      }
      if (err instanceof ApiError && err.status === 429) {
        Alert.alert('Çok sık denedin', 'Kısa bir süre sonra tekrar dene.');
        return;
      }
      Alert.alert('Gönderilemedi', err.message || 'Değerlendirme kaydedilemedi.');
    },
  });

  if (isLoading && !data) {
    return (
      <Shell t={t}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
        </View>
      </Shell>
    );
  }

  if ((error && !data) || !data) {
    return (
      <Shell t={t}>
        <ScreenError
          message={error?.message || 'Değerlendirme yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      </Shell>
    );
  }

  const subject = data.evaluation.subject;
  const subjectName = `${subject.firstName} ${subject.lastName}`.trim() || 'İsimsiz';

  return (
    <Shell t={t}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            padding: t.space[5],
            paddingBottom: t.space[12],
            width: '100%',
            maxWidth: ContentMaxWidth.content,
            alignSelf: 'center',
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Konu kişi + ilerleme */}
          <Text variant="overline" tone="tertiary">
            {evaluatorTypeLabel(data.evaluation.evaluatorType)}
          </Text>
          <Text variant="title-3" style={{ marginTop: 2 }}>
            {subjectName}
          </Text>
          {subject.title ? (
            <Text variant="footnote" tone="tertiary" style={{ marginTop: 2 }}>
              {subject.title}
              {subject.departmentRel ? ` · ${subject.departmentRel.name}` : ''}
            </Text>
          ) : null}

          <View style={{ marginTop: t.space[4] }}>
            <ProgressBar value={total > 0 ? (answered / total) * 100 : 0} height={6} />
            <Text variant="caption" tone="tertiary" style={{ marginTop: t.space[2] }}>
              {answered}/{total} madde puanlandı
            </Text>
          </View>

          {alreadyDone ? (
            <Text
              variant="footnote"
              style={{ marginTop: t.space[4], color: t.colors.status.success }}
            >
              Bu değerlendirme zaten tamamlandı.
            </Text>
          ) : null}

          {/* Kategoriler → maddeler */}
          {categories.map((cat) => (
            <View key={cat.id} style={{ marginTop: t.space[8] }}>
              <Text variant="overline" tone="tertiary" style={{ marginBottom: t.space[3] }}>
                {cat.name}
              </Text>
              <View style={{ gap: t.space[4] }}>
                {cat.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    answer={answers[item.id]}
                    onScore={(s) => setScore(item.id, s)}
                    onComment={(c) => setComment(item.id, c)}
                    disabled={alreadyDone}
                    t={t}
                  />
                ))}
              </View>
            </View>
          ))}

          <View style={{ marginTop: t.space[8] }}>
            <Button
              label={mutation.isPending ? 'Gönderiliyor…' : 'Değerlendirmeyi Gönder'}
              variant="primary"
              size="lg"
              onPress={() => mutation.mutate()}
              disabled={!allAnswered || alreadyDone || mutation.isPending}
              loading={mutation.isPending}
              fullWidth
            />
            {!allAnswered && !alreadyDone ? (
              <Text
                variant="caption"
                tone="tertiary"
                style={{ marginTop: t.space[2], textAlign: 'center' }}
              >
                Göndermek için tüm maddeleri puanla.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Shell>
  );
}

function Shell({ t, children }: { t: ReturnType<typeof useTheme>; children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen options={{ title: 'Değerlendirme' }} />
      {children}
    </SafeAreaView>
  );
}

function ItemRow({
  item,
  answer,
  onScore,
  onComment,
  disabled,
  t,
}: {
  item: EvaluationItem;
  answer: Answer | undefined;
  onScore: (score: number) => void;
  onComment: (comment: string) => void;
  disabled?: boolean;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={{
        backgroundColor: t.colors.surface.primary,
        borderRadius: t.radius.lg,
        borderWidth: t.hairline,
        borderColor: t.colors.border.subtle,
        padding: t.space[4],
      }}
    >
      <Text variant="bodyEmph">{item.text}</Text>
      {item.description ? (
        <Text variant="footnote" tone="tertiary" style={{ marginTop: 2 }}>
          {item.description}
        </Text>
      ) : null}

      <Stack direction="row" gap={2} style={{ marginTop: t.space[3] }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = answer?.score === n;
          return (
            <Pressable
              key={n}
              disabled={disabled}
              onPress={() => onScore(n)}
              accessibilityRole="button"
              accessibilityLabel={`Puan ${n}`}
              style={{
                flex: 1,
                height: 44,
                borderRadius: t.radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected ? t.colors.accent.clay : t.colors.surface.secondary,
                borderWidth: t.hairline,
                borderColor: selected ? t.colors.accent.clay : t.colors.border.default,
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <Text
                variant="bodyEmph"
                style={{
                  color: selected ? t.colors.accent.clayOnAccent : t.colors.text.secondary,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {n}
              </Text>
            </Pressable>
          );
        })}
      </Stack>

      <InputField
        value={answer?.comment ?? ''}
        onChangeText={onComment}
        editable={!disabled}
        placeholder="Yorum (opsiyonel)"
        multiline
        maxLength={2000}
        surface="canvas"
        inputStyle={{ minHeight: 64, marginTop: t.space[3], fontSize: 15 }}
      />
    </View>
  );
}
