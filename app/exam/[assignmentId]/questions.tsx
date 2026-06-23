import { useMutation, useQuery } from '@tanstack/react-query';
import { router, Stack as ExpoStack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhaseTransitionModal } from '@/components/exam/PhaseTransitionModal';
import { ScreenError } from '@/components/ui/ScreenError';
import { Button, ContentMaxWidth, Stack, Text, useTheme } from '@/design-system';
import { useAndroidBackGuard } from '@/hooks/use-android-back-guard';
import { ApiError } from '@/lib/api/client';
import { fetchExamQuestions, fetchExamTimer } from '@/lib/api/exam';
import {
  extractPhaseRedirect,
  phaseRedirectCopy,
  phaseRedirectRoute,
} from '@/lib/exam/phase-redirect';
import { resolveDuplicateSubmitRoute, resolvePreSubmitTarget } from '@/lib/exam/start-routing';
import {
  computeRemainingSeconds,
  resolveTimerEndMs,
  shouldAutoSubmitTimer,
} from '@/lib/exam/timer';
import { useOnline } from '@/lib/network/use-online';
import { isAlreadyProcessedError } from '@/lib/query/mutation-defaults';
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
  const phaseValid = phaseParam === 'pre' || phaseParam === 'post';
  const phase: ExamPhase = phaseParam === 'post' ? 'post' : 'pre';

  // Faz parametresi yoksa/bozuksa sessizce 'pre' varsaymak yerine doğru fazı
  // backend'den çözdür: start ekranı resolveStartRoute ile attempt status'üne göre
  // yönlendirir. Normal navigasyonda phase her zaman verilir — bu yalnızca bozuk
  // deep-link / eksik param için savunma (yanlış faz cevabı önlenir).
  useEffect(() => {
    if (!phaseValid) router.replace(`/exam/${assignmentId}/start`);
  }, [phaseValid, assignmentId]);

  const { data, error, isLoading, refetch } = useQuery<ExamQuestionsResponse, Error>({
    queryKey: ['exam-questions', assignmentId, phase],
    queryFn: () => fetchExamQuestions(assignmentId, phase),
    enabled: phaseValid,
    gcTime: 0,
    staleTime: 0,
  });

  if (!phaseValid || isLoading) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}
      >
        {/* headerLeft: null — layout'taki custom back butonunu da gizle (anti-cheat) */}
        <ExpoStack.Screen
          options={{ title: 'Yükleniyor…', headerBackVisible: false, headerLeft: () => null }}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Backend "yanlış faz" 403'ü (örn. attempt watching_videos'tayken post sorularını
  // istemek): çıkmaz hata + ham JSON yerine kullanıcıyı doğru ekrana yönlendiren
  // temiz bir mesaj göster. Aksi halde kullanıcı "girilemiyor/atıldım" hisseder.
  const phaseRedirect = extractPhaseRedirect(error);
  if (phaseRedirect) {
    const copy = phaseRedirectCopy(phaseRedirect.redirect);
    const target = phaseRedirectRoute(phaseRedirect.redirect);
    const go = () => {
      if (target.kind === 'videos') router.replace(`/exam/${assignmentId}/videos`);
      else if (target.kind === 'questions')
        router.replace(`/exam/${assignmentId}/questions?phase=${target.phase}`);
      else router.replace(`/trainings/${assignmentId}`);
    };
    return (
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}
      >
        <ExpoStack.Screen
          options={{ title: 'Sınav', headerBackVisible: false, headerLeft: () => null }}
        />
        <View style={{ flex: 1, padding: t.space[6], justifyContent: 'center' }}>
          <Text variant="title-2" align="center">
            {copy.title}
          </Text>
          <Text variant="body" tone="secondary" align="center" style={{ marginTop: t.space[3] }}>
            {copy.body}
          </Text>
          <View style={{ marginTop: t.space[8] }}>
            <Button label={copy.cta} variant="primary" size="lg" onPress={go} fullWidth />
          </View>
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

  // key={phase}: videosuz eğitimde pre→post geçişi aynı route'ta param değişimiyle
  // olur — key olmadan pre sınavın cevap/index state'i post sınava sızar.
  return <QuestionsView key={phase} assignmentId={assignmentId} phase={phase} data={data} />;
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

  // Anti-cheat telemetri: sınav sırasında uygulamadan ayrılma (arka plan/odak kaybı)
  // sayısı. submit'te backend'e gönderilir. Mobilde çıkış zaten engelli (android back
  // guard + header back kapalı) ama home tuşu/gelen çağrı gibi arka plana geçişler
  // buradan sayılır. Web post-exam'deki sekme-değişim sayacının mobil karşılığı.
  const tabSwitchRef = useRef(0);
  // Foreground'a dönünce timer'ı sunucu otoritesiyle tazele: uzun arka plan sonrası
  // backend attempt'i auto-complete edip `expired:true` döndürebilir → aşağıdaki expired
  // effect oto-submit'i tetikler. Görsel sayaç ExamTimer endRef ile sabit (sıçramaz);
  // yalnız `expired` bayrağı önemli. Ref pattern: listener timerQuery'den önce kuruluyor.
  const refetchTimerRef = useRef<() => void>(() => {});
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetchTimerRef.current();
      else if (state === 'background' || state === 'inactive') tabSwitchRef.current += 1;
    });
    return () => sub.remove();
  }, []);

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
  // AppState listener'ın çağıracağı refetch'i güncel tut (manuel refetch staleTime'ı ezer).
  refetchTimerRef.current = () => void timerQuery.refetch();

  const [preDoneModal, setPreDoneModal] = useState<{
    score: number;
    nextStep: 'videos' | 'post-exam';
  } | null>(null);

  const handleSubmitNavigate = (res: ExamSubmitResponse) => {
    if (res.phase === 'pre') {
      // Videosuz eğitimde backend video fazını atlar (nextStep: 'post-exam') —
      // videolara yönlendirmek boş ekran çıkmazı yaratır.
      setPreDoneModal({ score: res.score, nextStep: resolvePreSubmitTarget(res.nextStep) });
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
    tabSwitchCount: tabSwitchRef.current,
  });

  // useCallback gerekli: aşağıdaki expired effect dep array'inde kullanılıyor.
  // buildSubmitVars + handleSubmitNavigate closure ile capture; deps'e koymak
  // gereksiz (her render yeniden tanımlanıyor ama mutation idempotent).

  // Senkron çift-submit kilidi: isPending React state'i render gecikmeli günceller;
  // timer auto-submit ile manuel "Bitir" aynı tick'te tetiklenirse ikisi de
  // isPending=false görür. Ref senkron set edildiği için ikinci çağrı anında düşer.
  const submittingRef = useRef(false);

  const triggerSubmit = useCallback(
    (opts?: { silent?: boolean }) => {
      if (submittingRef.current || submitMutation.isPending) return;
      submittingRef.current = true;
      submitMutation.mutate(buildSubmitVars(), {
        onSettled: () => {
          submittingRef.current = false;
        },
        onSuccess: (res) => handleSubmitNavigate(res),
        onError: (err) => {
          // Backend "zaten işlendi" (409/422): istek ulaşmış ama yanıtı kaybolmuş
          // (flaky network → retry) veya paused mutation tekrar oynatılmış. Bu bir
          // HATA değil; sınav teslim edilmiştir. Kullanıcıyı soru ekranında kilitleyip
          // "gönderilemedi" demek yerine doğru sonraki ekrana taşı (silent dalından önce).
          if (isAlreadyProcessedError(err)) {
            const target = resolveDuplicateSubmitRoute(phase);
            router.replace(
              target.kind === 'result'
                ? `/exam/${assignmentId}/result`
                : `/trainings/${assignmentId}`,
            );
            return;
          }
          if (opts?.silent) {
            // Otomatik gönderim reddedildi (örn. backend 403 'süre çoktan dolmuş' —
            // attempt henüz auto-complete edilmemişken +5dk aşıldı). Sessizce yutmak
            // kullanıcıyı 00:00'da soru ekranında kilitli bırakıyordu.
            Alert.alert(
              'Sınav süresi doldu',
              'Süre aşıldığı için cevapların gönderilemedi. Eğitim sayfasına dönülüyor; durumunu oradan kontrol edebilirsin.',
              [
                {
                  text: 'Tamam',
                  onPress: () => router.replace(`/trainings/${assignmentId}`),
                },
              ],
            );
            return;
          }
          Alert.alert('Sınav gönderilemedi', err.message);
        },
      });
    },
    [submitMutation, assignmentId, phase],
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
    // Cevap seçimi: local state güncelle + arka planda save-answer. Cevaplar
    // sınav gönderilene kadar serbestçe değişir — soru başına süre kilidi yoktur.
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
          if (error instanceof ApiError && error.status === 429) {
            const wait =
              error.retryAfter && error.retryAfter > 0
                ? ` ${error.retryAfter} saniye sonra tekrar dene.`
                : ' Lütfen kısa bir süre bekle.';
            Alert.alert('Çok hızlı', `Cevap kaydetme limitine ulaşıldı.${wait}`);
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
          paddingHorizontal: t.space[5],
          paddingVertical: t.space[4],
          backgroundColor: t.colors.surface.primary,
          borderBottomColor: t.colors.border.subtle,
          borderBottomWidth: t.hairline,
        }}
      >
        <Text variant="subhead" tone="tertiary" numberOfLines={1} maxFontSizeMultiplier={1.4}>
          {data.trainingTitle}
        </Text>
        <Stack
          direction="row"
          justify="space-between"
          align="center"
          style={{ marginTop: t.space[2] }}
        >
          {/* Timer query settle olmadan ExamTimer mount edilmez: ExamTimer bitiş
              zamanını ilk render'da sabitler; sunucu expiresAt'i gelmeden mount
              edersek fallback (tam süre) kalıcı olur ve kill/reopen sonrası
              kullanıcı yanlış (uzun) süre görür. */}
          {timerQuery.isFetched ? (
            <ExamTimer
              expiresAt={timerQuery.data?.expiresAt ?? null}
              remainingSeconds={timerQuery.data?.remainingSeconds ?? null}
              fallbackTotalTime={data.totalTime}
              onAutoSubmit={() => triggerSubmit({ silent: true })}
              dangerColor={t.colors.status.danger}
              defaultColor={t.colors.accent.clay}
            />
          ) : (
            <Text
              maxFontSizeMultiplier={1.6}
              style={{
                fontFamily: 'Fraunces_700Bold',
                fontSize: 22,
                lineHeight: 26,
                color: t.colors.text.tertiary,
                fontVariant: ['tabular-nums'],
              }}
            >
              --:--
            </Text>
          )}
          <Text
            variant="subhead"
            tone="tertiary"
            numberOfLines={1}
            maxFontSizeMultiplier={1.4}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            Soru {currentIdx + 1} / {totalQuestions}
          </Text>
        </Stack>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: t.space[5],
          paddingBottom: t.space[8],
          width: '100%',
          maxWidth: ContentMaxWidth.content,
          alignSelf: 'center',
        }}
      >
        <Text variant="title-2" maxFontSizeMultiplier={1.6}>
          {question.text}
        </Text>

        <View style={{ marginTop: t.space[5], gap: t.space[3] }}>
          {question.options.map((opt) => {
            const selected = answers.get(question.questionId) === opt.optionId;
            return (
              <Pressable
                key={opt.optionId}
                onPress={() => handleSelect(question, opt.optionId)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  backgroundColor: selected ? t.colors.accent.clayMuted : t.colors.surface.primary,
                  padding: t.space[4],
                  borderRadius: t.radius.md,
                  borderWidth: selected ? 2 : t.hairline,
                  borderColor: selected ? t.colors.accent.clay : t.colors.border.default,
                  alignItems: 'center',
                  gap: t.space[3],
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

        {/* Soru haritası — cevaplanan/boş durumu + soruya atlama. Mobil serbest
            gezinmeye izin verir (web'deki tek-yön kilit YOK), tüm hücreler tıklanır. */}
        <View
          style={{
            marginTop: t.space[8],
            borderTopWidth: t.hairline,
            borderTopColor: t.colors.border.subtle,
            paddingTop: t.space[4],
          }}
        >
          <Text variant="overline" tone="tertiary" style={{ marginBottom: t.space[3] }}>
            SORU HARİTASI
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] }}>
            {data.questions.map((q, i) => {
              const isAnswered = answers.has(q.questionId);
              const isCurrent = i === safeIdx;
              return (
                <Pressable
                  key={q.questionId}
                  onPress={() => setCurrentIdx(i)}
                  accessibilityLabel={`Soru ${i + 1}${isAnswered ? ', cevaplandı' : ', boş'}`}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: t.radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: isCurrent ? 2 : t.hairline,
                    borderColor: isCurrent ? t.colors.accent.clay : t.colors.border.default,
                    backgroundColor: isAnswered
                      ? t.colors.accent.clayMuted
                      : t.colors.surface.primary,
                  }}
                >
                  <Text
                    variant="caption"
                    weight="semibold"
                    style={{ color: isAnswered ? t.colors.accent.clay : t.colors.text.tertiary }}
                  >
                    {i + 1}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Stack direction="row" gap={4} style={{ marginTop: t.space[4] }}>
            <Stack direction="row" align="center" gap={2}>
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: t.radius.xs,
                  backgroundColor: t.colors.accent.clayMuted,
                  borderWidth: t.hairline,
                  borderColor: t.colors.accent.clay,
                }}
              />
              <Text variant="caption" tone="tertiary">
                Cevaplandı
              </Text>
            </Stack>
            <Stack direction="row" align="center" gap={2}>
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: t.radius.xs,
                  backgroundColor: t.colors.surface.primary,
                  borderWidth: t.hairline,
                  borderColor: t.colors.border.default,
                }}
              />
              <Text variant="caption" tone="tertiary">
                Boş
              </Text>
            </Stack>
          </Stack>
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          padding: t.space[4],
          gap: t.space[3],
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
        title={
          preDoneModal?.nextStep === 'post-exam'
            ? 'Şimdi son sınava geçiliyor'
            : 'Şimdi videolara geçiliyor'
        }
        body={
          preDoneModal?.nextStep === 'post-exam'
            ? 'Ön sınavın kaydedildi. Bu eğitimde video yok — doğrudan son sınava geçilecek. Başladığında süre işlemeye başlar.'
            : 'Ön sınavın kaydedildi. Eğitim videolarını izledikten sonra son sınav açılacak.'
        }
        ctaLabel={preDoneModal?.nextStep === 'post-exam' ? 'Son sınava geç' : 'Videolara geç'}
        score={preDoneModal?.score}
        icon="checkmark.seal.fill"
        tone="success"
        durationSeconds={60}
        onContinue={() => {
          const target =
            preDoneModal?.nextStep === 'post-exam'
              ? (`/exam/${assignmentId}/questions?phase=post` as const)
              : (`/exam/${assignmentId}/videos` as const);
          setPreDoneModal(null);
          router.replace(target);
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
 *
 * ÖNEMLİ: Parent bu component'i timer query settle OLDUKTAN sonra mount eder
 * (questions.tsx'teki isFetched gate). Bitiş zamanı ilk render'da sabitlenir;
 * sonradan prop değişse bile güncellenmez (sayaç ortasında sıçramasın) — bu
 * yüzden ilk render'daki expiresAt'in sunucu değeri olması kritik.
 */
function ExamTimer({
  expiresAt,
  remainingSeconds,
  fallbackTotalTime,
  onAutoSubmit,
  dangerColor,
  defaultColor,
}: {
  expiresAt: number | null;
  /** Redis canlı sayaç path'i expiresAt dönmez — kalan süre buradan gelir. */
  remainingSeconds: number | null;
  fallbackTotalTime: number;
  onAutoSubmit: () => void;
  dangerColor: string;
  defaultColor: string;
}) {
  const endRef = useRef<number>(
    resolveTimerEndMs({
      expiresAt,
      remainingSeconds,
      fallbackTotalTimeSeconds: fallbackTotalTime,
      nowMs: Date.now(),
    }),
  );
  const initialRemaining = computeRemainingSeconds(endRef.current, Date.now());
  const [remaining, setRemaining] = useState<number>(initialRemaining);
  const submittedRef = useRef(false);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  onAutoSubmitRef.current = onAutoSubmit;

  useEffect(() => {
    const id = setInterval(() => {
      const rem = computeRemainingSeconds(endRef.current, Date.now());
      setRemaining(rem);
      if (shouldAutoSubmitTimer({ remaining: rem, alreadySubmitted: submittedRef.current })) {
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
