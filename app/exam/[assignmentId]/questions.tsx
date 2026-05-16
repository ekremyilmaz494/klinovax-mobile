import { useMutation, useQuery } from '@tanstack/react-query';
import { router, Stack as ExpoStack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhaseTransitionModal } from '@/components/exam/PhaseTransitionModal';
import { ScreenError } from '@/components/ui/ScreenError';
import { Button, Stack, Text, useTheme } from '@/design-system';
import { useAndroidBackGuard } from '@/hooks/use-android-back-guard';
import { ApiError } from '@/lib/api/client';
import { fetchExamQuestions, fetchExamTimer } from '@/lib/api/exam';
import { useOnline } from '@/lib/network/use-online';
import type { SaveAnswerVars, SubmitExamVars } from '@/lib/query/mutation-defaults';
import { MUTATION_KEYS } from '@/lib/query/mutation-keys';
import type {
  ExamPhase,
  ExamQuestion,
  ExamQuestionsResponse,
  ExamSubmitResponse,
} from '@/types/exam';

/**
 * Sınav soru ekranı.
 *
 * Mantık:
 *   - Sorular bir kere çekilir, kullanıcı index ile gezer.
 *   - Cevap seçildiğinde local state güncellenir + arka planda save-answer çağrılır.
 *   - Toplam süre countdown — sıfıra düşerse otomatik submit.
 *   - "Bitir" → tüm cevaplar submit edilir → result ekranına geçilir.
 */
export default function ExamQuestionsScreen() {
  const t = useTheme();
  const { assignmentId, phase: phaseParam } = useLocalSearchParams<{
    assignmentId: string;
    phase: ExamPhase;
  }>();
  const phase: ExamPhase = phaseParam === 'post' ? 'post' : 'pre';

  const { data, error, isLoading, refetch } = useQuery<ExamQuestionsResponse, Error>({
    queryKey: ['exam-questions', assignmentId, phase],
    queryFn: () => fetchExamQuestions(assignmentId, phase),
    gcTime: 0,
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}
      >
        <ExpoStack.Screen options={{ title: 'Yükleniyor…', headerBackVisible: false }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}
      >
        <ExpoStack.Screen options={{ title: 'Hata' }} />
        <ScreenError
          message={error?.message ?? 'Sorular yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  if (data.questions.length === 0) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}
      >
        <ExpoStack.Screen options={{ title: 'Hata' }} />
        <ScreenError
          message="Bu sınava soru tanımlanmamış. Lütfen kurum yöneticisi ile iletişime geç."
          onRetry={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  return <QuestionsView assignmentId={assignmentId} phase={phase} data={data} />;
}

function QuestionsView({
  assignmentId,
  phase,
  data,
}: {
  assignmentId: string;
  phase: ExamPhase;
  data: ExamQuestionsResponse;
}) {
  const t = useTheme();
  const { isOnline } = useOnline();
  const [currentIdx, setCurrentIdx] = useState(0);

  const initial = useMemo(() => {
    const m = new Map<string, string>();
    for (const q of data.questions) {
      if (q.savedAnswer) {
        const found = q.options.find((o) => o.optionId === q.savedAnswer || o.id === q.savedAnswer);
        if (found) m.set(q.questionId, found.optionId);
      }
    }
    return m;
  }, [data.questions]);

  const [answers, setAnswers] = useState<Map<string, string>>(initial);
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const saveMutation = useMutation<{ saved: true }, Error, SaveAnswerVars>({
    mutationKey: MUTATION_KEYS.saveAnswer,
  });

  const submitMutation = useMutation<ExamSubmitResponse, Error, SubmitExamVars>({
    mutationKey: MUTATION_KEYS.submitExam,
  });

  // Server-side timer authority. Redis canlı sayaç yoksa backend DB'den recover
  // eder; süresi dolmuşsa attempt auto-complete edip `expired: true` döner.
  // staleTime: Infinity — ilk gelende fix, refetch ile sayaç sıçramasın.
  const timerQuery = useQuery({
    queryKey: ['exam-timer', assignmentId, phase],
    queryFn: () => fetchExamTimer(assignmentId),
    staleTime: Infinity,
    gcTime: 0,
  });

  const [preDoneModal, setPreDoneModal] = useState<{ score: number } | null>(null);

  const handleSubmitNavigate = (res: ExamSubmitResponse) => {
    if (res.phase === 'pre') {
      setPreDoneModal({ score: res.score });
    } else {
      router.replace(`/exam/${assignmentId}/result`);
    }
  };

  const buildSubmitVars = (): SubmitExamVars => ({
    assignmentId,
    answers: Array.from(answersRef.current.entries()).map(([questionId, selectedOptionId]) => ({
      questionId,
      selectedOptionId,
    })),
    phase,
  });

  // useCallback gerekli: aşağıdaki expired effect dep array'inde kullanılıyor.
  // buildSubmitVars + handleSubmitNavigate closure ile capture; deps'e koymak
  // gereksiz (her render yeniden tanımlanıyor ama mutation idempotent).

  const triggerSubmit = useCallback(
    (opts?: { silent?: boolean }) => {
      submitMutation.mutate(buildSubmitVars(), {
        onSuccess: (res) => handleSubmitNavigate(res),
        onError: (err) => {
          if (opts?.silent) return;
          Alert.alert('Sınav gönderilemedi', err.message);
        },
      });
    },
    [submitMutation],
  );

  // Server timer expired sinyali geldiğinde otomatik submit — kullanıcı
  // arka planda kaldıysa veya kill/reopen sonrası backend süreyi geçtiyse.
  // Ref guard: çoklu render'da tekrar tetiklenmesin.
  const expiredFromServerRef = useRef(false);
  useEffect(() => {
    if (timerQuery.data?.expired && !expiredFromServerRef.current) {
      expiredFromServerRef.current = true;
      triggerSubmit({ silent: true });
    }
  }, [timerQuery.data?.expired, triggerSubmit]);

  // currentIdx normalde [0, length-1] arasında — Önceki/Sonraki butonları clamp'liyor.
  // Yine de defansif: setState batching, refetch ile soru sayısı azalması gibi rare
  // durumlarda taşma olabilir; sessiz null yerine ilk soruya düşür.
  const safeIdx = Math.min(currentIdx, data.questions.length - 1);
  const question = data.questions[safeIdx];
  const totalAnswered = answers.size;
  const totalQuestions = data.questions.length;

  const handleSelect = (q: ExamQuestion, optionUuid: string) => {
    // Önceki seçimi sakla — 423 (kilit) durumunda local state'i geri almak için.
    const previousAnswer = answers.get(q.questionId);
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(q.questionId, optionUuid);
      return next;
    });
    saveMutation.mutate(
      {
        assignmentId,
        questionId: q.questionId,
        selectedOptionId: optionUuid,
        examPhase: phase,
      },
      {
        onError: (error) => {
          if (error instanceof ApiError && error.status === 423) {
            // Backend cevabı kilitledi (post-exam 30sn grace doldu).
            // UI'ı backend ile tutarlı kıl: önceki seçime geri al.
            setAnswers((prev) => {
              const next = new Map(prev);
              if (previousAnswer !== undefined) {
                next.set(q.questionId, previousAnswer);
              } else {
                next.delete(q.questionId);
              }
              return next;
            });
            Alert.alert(
              'Cevap kilitli',
              'Bu sorunun cevabı 30 saniye geçtiği için kilitlendi. Önceki seçimin korunuyor.',
            );
          } else if (error instanceof ApiError && error.status === 429) {
            Alert.alert(
              'Çok hızlı',
              'Cevap kaydetme limitine ulaşıldı. Lütfen kısa bir süre bekle.',
            );
          }
          // 4xx olmayan/network hataları offline-first ile paused kuyruğa gider.
        },
      },
    );
  };

  const handleSubmit = () => {
    const unanswered = totalQuestions - totalAnswered;
    const offlineNote = !isOnline
      ? '\n\nİnternet yok — sınavın internet bağlantısı gelince otomatik gönderilecek.'
      : '';
    Alert.alert(
      'Sınavı bitir',
      (unanswered > 0
        ? `${unanswered} soru cevaplanmadı. Yine de göndermek istiyor musun?`
        : 'Tüm cevapların gönderilecek. Onaylıyor musun?') + offlineNote,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Bitir', style: 'destructive', onPress: () => triggerSubmit() },
      ],
    );
  };

  // iOS'ta gesture + header back tamamen kapalı. Android donanım back de aynı
  // şekilde engellenmeli — kullanıcı sınavı yarıda yarıda atlamasın, "Bitir"
  // butonu tek çıkış yolu.
  useAndroidBackGuard(
    useCallback(() => {
      Alert.alert(
        'Sınav devam ediyor',
        'Sınavı tamamlamadan çıkamazsın. Bitirmek için sağ alttaki "Bitir" butonunu kullan.',
        [{ text: 'Tamam', style: 'default' }],
      );
      return true;
    }, []),
  );

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen
        options={{
          title: data.examType,
          headerBackVisible: false,
          headerLeft: () => null,
        }}
      />

      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: t.colors.surface.primary,
          borderBottomColor: t.colors.border.subtle,
          borderBottomWidth: t.hairline,
        }}
      >
        <Text variant="subhead" tone="tertiary" numberOfLines={1}>
          {data.trainingTitle}
        </Text>
        <Stack direction="row" justify="space-between" align="center" style={{ marginTop: 6 }}>
          <ExamTimer
            expiresAt={timerQuery.data?.expiresAt ?? null}
            fallbackTotalTime={data.totalTime}
            onAutoSubmit={() => triggerSubmit({ silent: true })}
            dangerColor={t.colors.status.danger}
            defaultColor={t.colors.accent.clay}
          />
          <Text variant="subhead" tone="tertiary" style={{ fontVariant: ['tabular-nums'] }}>
            Soru {currentIdx + 1} / {totalQuestions}
          </Text>
        </Stack>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <Text variant="title-2">{question.text}</Text>

        <View style={{ marginTop: 20, gap: 10 }}>
          {question.options.map((opt) => {
            const selected = answers.get(question.questionId) === opt.optionId;
            return (
              <Pressable
                key={opt.optionId}
                onPress={() => handleSelect(question, opt.optionId)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  backgroundColor: selected ? t.colors.accent.clayMuted : t.colors.surface.primary,
                  padding: 14,
                  borderRadius: t.radius.md,
                  borderWidth: selected ? 2 : t.hairline,
                  borderColor: selected ? t.colors.accent.clay : t.colors.border.default,
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 60,
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
                  <Text
                    style={{
                      fontFamily: 'Fraunces_700Bold',
                      fontSize: 15,
                      color: selected ? t.colors.accent.clayOnAccent : t.colors.text.tertiary,
                    }}
                  >
                    {opt.id.toUpperCase()}
                  </Text>
                </View>
                <Text
                  variant="body"
                  style={{
                    flex: 1,
                    color: selected ? t.colors.text.primary : t.colors.text.secondary,
                    fontFamily: selected ? 'InterTight_500Medium' : 'InterTight_400Regular',
                  }}
                >
                  {opt.text}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          padding: 16,
          gap: 12,
          backgroundColor: t.colors.surface.primary,
          borderTopWidth: t.hairline,
          borderTopColor: t.colors.border.subtle,
        }}
      >
        <View style={{ flex: 1 }}>
          <Button
            label="← Önceki"
            variant="outline"
            disabled={currentIdx === 0}
            onPress={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            fullWidth
          />
        </View>
        <View style={{ flex: 1 }}>
          {currentIdx === totalQuestions - 1 ? (
            <Button
              label={submitMutation.isPending ? 'Gönderiliyor…' : 'Bitir'}
              variant="danger"
              loading={submitMutation.isPending}
              disabled={submitMutation.isPending}
              onPress={handleSubmit}
              fullWidth
            />
          ) : (
            <Button
              label="Sonraki →"
              variant="primary"
              onPress={() => setCurrentIdx((i) => Math.min(totalQuestions - 1, i + 1))}
              fullWidth
            />
          )}
        </View>
      </View>

      <PhaseTransitionModal
        visible={preDoneModal !== null}
        overline="ÖN SINAV TAMAMLANDI"
        title="Şimdi videolara geçiliyor"
        body="Ön sınavın kaydedildi. Eğitim videolarını izledikten sonra son sınav açılacak."
        ctaLabel="Videolara geç"
        score={preDoneModal?.score}
        icon="checkmark.seal.fill"
        tone="success"
        durationSeconds={60}
        onContinue={() => {
          setPreDoneModal(null);
          router.replace(`/exam/${assignmentId}/videos`);
        }}
      />
    </SafeAreaView>
  );
}

/**
 * Timer'ı QuestionsView'den izole eder — saniyelik setRemaining parent state'ini
 * değiştirmesin diye. Aksi halde 30dk'lık sınav süresince options listesi (Pressable
 * factory'leri dahil) 1Hz re-render olur. onAutoSubmit ref pattern ile capture
 * edildiği için parent her render'da yeni callback geçse bile setInterval drift'lemez.
 *
 * `expiresAt` server-side authority (POST /api/exam/[id]/timer). Yoksa
 * `fallbackTotalTime` ile client-side optimistic timer kurulur; backend submit
 * +5dk grace'le enforce ettiği için kullanıcı extra süre kazanamaz.
 */
function ExamTimer({
  expiresAt,
  fallbackTotalTime,
  onAutoSubmit,
  dangerColor,
  defaultColor,
}: {
  expiresAt: number | null;
  fallbackTotalTime: number;
  onAutoSubmit: () => void;
  dangerColor: string;
  defaultColor: string;
}) {
  // İlk render'da bitiş zamanı sabitlenir; sonradan expiresAt prop değişse bile
  // endRef güncellenmez (UX karışıklığı — sayaç ortasında sıçramasın).
  const endRef = useRef<number>(expiresAt ?? Date.now() + fallbackTotalTime * 1000);
  const initialRemaining = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000));
  const [remaining, setRemaining] = useState<number>(initialRemaining);
  const submittedRef = useRef(false);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  onAutoSubmitRef.current = onAutoSubmit;

  useEffect(() => {
    const id = setInterval(() => {
      const rem = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000));
      setRemaining(rem);
      if (rem === 0 && !submittedRef.current) {
        submittedRef.current = true;
        onAutoSubmitRef.current();
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const color = remaining < 60 ? dangerColor : defaultColor;
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      style={{
        fontFamily: 'Fraunces_700Bold',
        fontSize: 22,
        lineHeight: 26,
        color,
        fontVariant: ['tabular-nums'],
      }}
    >
      {formatTime(remaining)}
    </Text>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
