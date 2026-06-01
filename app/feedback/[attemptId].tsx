import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack as ExpoStack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenError } from '@/components/ui/ScreenError';
import { Button, Chip, Stack, Tag, Text, useTheme } from '@/design-system';
import { ApiError } from '@/lib/api/client';
import { fetchFeedbackForm, submitFeedback } from '@/lib/api/feedback';
import { buildFeedbackPayload, isFeedbackComplete } from '@/lib/exam/feedback-payload';
import { useAuthStore } from '@/store/auth';
import type { FeedbackForm, FeedbackItem } from '@/types/feedback';

const TEXT_MAX = 2000;

/** itemId → seçilen score (likert/yes-no) veya metin (text tipi). */
type AnswerState = Record<string, { score?: number; textAnswer?: string }>;

export default function FeedbackScreen() {
  const t = useTheme();
  const { attemptId, title } = useLocalSearchParams<{ attemptId: string; title?: string }>();
  const logout = useAuthStore((s) => s.logout);
  const qc = useQueryClient();

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['feedback-form'],
    queryFn: fetchFeedbackForm,
  });

  // Defensive: token bayatsa global auth-failure zaten temizliyor, ama ekran-level senkron.
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) void logout();
  }, [error, logout]);

  const [answers, setAnswers] = useState<AnswerState>({});
  const [includeName, setIncludeName] = useState(false);

  const form = data?.form ?? null;

  const setScore = (itemId: string, score: number) =>
    setAnswers((prev) => ({ ...prev, [itemId]: { score } }));
  const setText = (itemId: string, textAnswer: string) =>
    setAnswers((prev) => ({ ...prev, [itemId]: { textAnswer } }));

  // Zorunlu maddelerin hepsi cevaplanmadan submit kapalı.
  const allRequiredAnswered = useMemo(
    () => (form ? isFeedbackComplete(form, answers) : false),
    [form, answers],
  );

  const submitMutation = useMutation({
    mutationFn: () =>
      submitFeedback({ attemptId, includeName, answers: buildFeedbackPayload(answers) }),
    networkMode: 'online',
    onSuccess: () => onSubmitted(),
    onError: (err) => {
      // 409 (zaten gönderildi) backend tarafında başarı sayılır — kullanıcıyı geçir.
      if (err instanceof ApiError && err.status === 409) {
        onSubmitted();
        return;
      }
      if (err instanceof ApiError) {
        if (err.status === 404) {
          Alert.alert('Form bulunamadı', 'Geri bildirim formu veya deneme kaydı bulunamadı.');
          return;
        }
        if (err.status === 429) {
          Alert.alert('Çok sık denedin', 'Biraz bekleyip tekrar dene.');
          return;
        }
        if (err.status === 0) {
          Alert.alert('Bağlantı yok', 'İnternetini kontrol edip tekrar dene.');
          return;
        }
        if (err.status === 400) {
          Alert.alert(
            'Gönderilemedi',
            err.message || 'Form gönderilemedi, lütfen cevaplarını kontrol et.',
          );
          return;
        }
      }
      Alert.alert('Gönderilemedi', 'Form gönderilemedi, lütfen cevaplarını kontrol et.');
    },
  });

  const onSubmitted = () => {
    qc.invalidateQueries({ queryKey: ['my-trainings'] });
    qc.invalidateQueries({ queryKey: ['training-detail'] });
    qc.invalidateQueries({ queryKey: ['staff-dashboard'] });
    qc.invalidateQueries({ queryKey: ['pending-feedback'] });
    Alert.alert('Teşekkürler', 'Geri bildirimin kaydedildi.', [
      { text: 'Tamam', onPress: () => router.back() },
    ]);
  };

  const headerTitle = title || 'Geri bildirim';

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen options={{ title: headerTitle, headerBackTitle: 'Geri' }} />

      {isLoading && !data ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
        </View>
      ) : error && !data ? (
        <ScreenError
          message={error.message || 'Geri bildirim formu yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      ) : form ? (
        <FormBody
          form={form}
          answers={answers}
          setScore={setScore}
          setText={setText}
          includeName={includeName}
          setIncludeName={setIncludeName}
          canSubmit={allRequiredAnswered}
          submitting={submitMutation.isPending}
          onSubmit={() => submitMutation.mutate()}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="checkmark.circle.fill"
            title="Aktif geri bildirim formu yok"
            description="Şu an doldurman gereken bir form bulunmuyor."
          />
          <View style={{ paddingHorizontal: 24, marginTop: 8 }}>
            <Button label="Geri dön" variant="outline" onPress={() => router.back()} fullWidth />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function FormBody({
  form,
  answers,
  setScore,
  setText,
  includeName,
  setIncludeName,
  canSubmit,
  submitting,
  onSubmit,
}: {
  form: FeedbackForm;
  answers: AnswerState;
  setScore: (itemId: string, score: number) => void;
  setText: (itemId: string, text: string) => void;
  includeName: boolean;
  setIncludeName: (v: boolean) => void;
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const t = useTheme();
  const categories = useMemo(
    () => [...form.categories].sort((a, b) => a.order - b.order),
    [form.categories],
  );

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="overline" tone="tertiary" style={{ marginBottom: 8 }}>
        GERİ BİLDİRİM
      </Text>
      <Text variant="title-1">{form.title}</Text>
      {form.description ? (
        <Text variant="body" tone="tertiary" style={{ marginTop: 8 }}>
          {form.description}
        </Text>
      ) : null}

      {categories.map((cat) => {
        const items = [...cat.items].sort((a, b) => a.order - b.order);
        return (
          <View key={cat.id} style={{ marginTop: 32 }}>
            <Text variant="title-3">{cat.name}</Text>
            <View style={{ marginTop: 16, gap: 24 }}>
              {items.map((item) => (
                <QuestionItem
                  key={item.id}
                  item={item}
                  answer={answers[item.id]}
                  onScore={(s) => setScore(item.id, s)}
                  onText={(txt) => setText(item.id, txt)}
                />
              ))}
            </View>
          </View>
        );
      })}

      {/* Anonimlik kontrolü — varsayılan kapalı (anonim). */}
      <View
        style={{
          marginTop: 32,
          backgroundColor: t.colors.surface.primary,
          borderRadius: t.radius.lg,
          borderWidth: t.hairline,
          borderColor: t.colors.border.subtle,
          padding: 16,
        }}
      >
        <Stack direction="row" align="center" gap={3}>
          <Switch
            value={includeName}
            onValueChange={setIncludeName}
            trackColor={{ false: t.colors.border.default, true: t.colors.accent.clay }}
            thumbColor={t.colors.surface.primary}
          />
          <Text variant="callout" tone="primary" style={{ flex: 1 }}>
            Adımla gönder
          </Text>
        </Stack>
        <Text variant="footnote" tone="tertiary" style={{ marginTop: 8 }}>
          Kapalıysa geri bildirimin anonim iletilir.
        </Text>
      </View>

      <View style={{ marginTop: 28 }}>
        <Button
          label={submitting ? 'Gönderiliyor…' : 'Geri bildirimi gönder'}
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={!canSubmit || submitting}
          onPress={onSubmit}
          fullWidth
        />
        {!canSubmit ? (
          <Text variant="footnote" tone="tertiary" align="center" style={{ marginTop: 10 }}>
            Göndermeden önce tüm zorunlu soruları cevapla.
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

function QuestionItem({
  item,
  answer,
  onScore,
  onText,
}: {
  item: FeedbackItem;
  answer?: { score?: number; textAnswer?: string };
  onScore: (score: number) => void;
  onText: (text: string) => void;
}) {
  return (
    <View>
      <Stack direction="row" justify="space-between" align="flex-start" gap={2}>
        <Text variant="bodyEmph" style={{ flex: 1 }}>
          {item.text}
        </Text>
        {item.isRequired ? <Tag label="Zorunlu" tone="warning" outlined /> : null}
      </Stack>

      <View style={{ marginTop: 12 }}>
        {item.questionType === 'likert_5' ? (
          <LikertControl value={answer?.score} onScore={onScore} />
        ) : item.questionType === 'yes_partial_no' ? (
          <YesPartialNoControl value={answer?.score} onScore={onScore} />
        ) : (
          <TextControl value={answer?.textAnswer ?? ''} onText={onText} />
        )}
      </View>
    </View>
  );
}

function LikertControl({ value, onScore }: { value?: number; onScore: (s: number) => void }) {
  return (
    <View>
      <Stack direction="row" gap={2}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip
            key={n}
            label={String(n)}
            selected={value === n}
            onPress={() => onScore(n)}
            accessibilityLabel={`Puan ${n}`}
            style={{ flex: 1, alignItems: 'center' }}
          />
        ))}
      </Stack>
      <Text variant="caption" tone="tertiary" style={{ marginTop: 8 }}>
        1 = Kesinlikle katılmıyorum · 5 = Kesinlikle katılıyorum
      </Text>
    </View>
  );
}

function YesPartialNoControl({ value, onScore }: { value?: number; onScore: (s: number) => void }) {
  // Backend kodlaması: Evet=3, Kısmen=2, Hayır=1.
  const options: { label: string; score: number }[] = [
    { label: 'Evet', score: 3 },
    { label: 'Kısmen', score: 2 },
    { label: 'Hayır', score: 1 },
  ];
  return (
    <Stack direction="row" gap={2}>
      {options.map((opt) => (
        <Chip
          key={opt.score}
          label={opt.label}
          selected={value === opt.score}
          onPress={() => onScore(opt.score)}
          style={{ flex: 1, alignItems: 'center' }}
        />
      ))}
    </Stack>
  );
}

function TextControl({ value, onText }: { value: string; onText: (txt: string) => void }) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onText}
        multiline
        maxLength={TEXT_MAX}
        placeholder="Görüşünü yaz…"
        placeholderTextColor={t.colors.text.tertiary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          backgroundColor: t.colors.surface.primary,
          borderRadius: t.radius.md,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 17,
          color: t.colors.text.primary,
          fontFamily: 'InterTight_400Regular',
          minHeight: 96,
          textAlignVertical: 'top',
          borderWidth: focused ? 2 : t.hairline,
          borderColor: focused ? t.colors.border.focus : t.colors.border.default,
        }}
      />
      <Text variant="caption" tone="tertiary" align="right" style={{ marginTop: 6 }}>
        {value.length}/{TEXT_MAX}
      </Text>
    </View>
  );
}
