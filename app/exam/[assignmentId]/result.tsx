import { useQuery } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenError } from '@/components/ui/ScreenError'
import { fetchExamResults } from '@/lib/api/exam'
import type { ExamResultDetail, ExamResultsResponse } from '@/types/exam'

const PRIMARY = '#0d9668'
const BG = '#f1f5f9'
const FG = '#0f172a'
const MUTED = '#64748b'
const SUCCESS = '#16a34a'
const DANGER = '#dc2626'

export default function ExamResultScreen() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>()

  const { data, error, isLoading, refetch } = useQuery<ExamResultsResponse, Error>({
    queryKey: ['exam-results', assignmentId],
    queryFn: () => fetchExamResults(assignmentId),
  })

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <Stack.Screen
        options={{ title: 'Sonuç', headerBackVisible: false, headerLeft: () => null }}
      />

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={PRIMARY} size="large" />
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
  )
}

function ResultBody({ data }: { data: ExamResultsResponse }) {
  const passed = data.isPassed
  const heroBg = passed ? '#ecfdf5' : '#fef2f2'
  const heroFg = passed ? SUCCESS : DANGER
  const heroBorder = passed ? '#a7f3d0' : '#fecaca'

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={[styles.hero, { backgroundColor: heroBg, borderColor: heroBorder }]}>
        <Text style={[styles.heroBadge, { color: heroFg }]}>
          {passed ? 'BAŞARILI' : 'BAŞARISIZ'}
        </Text>
        <Text style={styles.heroScore}>%{Math.round(data.score)}</Text>
        <Text style={styles.heroPassing}>Geçme barajı: %{data.passingScore}</Text>
      </View>

      {!passed && (
        <View style={styles.failNote}>
          <Text style={styles.failTitle}>Tekrar dene</Text>
          <Text style={styles.failText}>
            Geçmek için %{data.passingScore} ve üzeri puan almanız gerekiyor.
            Doğru cevaplar başarılı denemeden sonra görünür olacak.
          </Text>
        </View>
      )}

      {passed && data.results && data.results.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Soru bazlı detay</Text>
          {data.results.map((r, i) => (
            <ResultRow key={i} index={i + 1} item={r} />
          ))}
        </>
      )}

      <Pressable
        style={styles.cta}
        onPress={() => router.replace('/(tabs)/trainings')}
      >
        <Text style={styles.ctaText}>Eğitim listesine dön</Text>
      </Pressable>
    </ScrollView>
  )
}

function ResultRow({ index, item }: { index: number; item: ExamResultDetail }) {
  const correct = item.isCorrect
  return (
    <View style={[styles.resultCard, !correct && styles.resultCardWrong]}>
      <Text style={styles.resultIndex}>Soru {index}</Text>
      <Text style={styles.resultQuestion}>{item.questionText}</Text>

      <View style={styles.resultLine}>
        <Text style={styles.resultLabel}>Cevabın:</Text>
        <Text style={[styles.resultValue, !correct && { color: DANGER }]}>
          {item.selectedOptionText ?? 'Boş bırakıldı'}
        </Text>
      </View>

      {!correct && item.correctOptionText && (
        <View style={styles.resultLine}>
          <Text style={styles.resultLabel}>Doğrusu:</Text>
          <Text style={[styles.resultValue, { color: SUCCESS }]}>{item.correctOptionText}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, paddingBottom: 48 },

  hero: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  heroBadge: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  heroScore: { fontSize: 48, fontWeight: '800', color: FG, marginTop: 8 },
  heroPassing: { fontSize: 13, color: MUTED, marginTop: 6 },

  failNote: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
  },
  failTitle: { fontSize: 13, fontWeight: '700', color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5 },
  failText: { fontSize: 14, color: '#78350f', marginTop: 6, lineHeight: 20 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: FG, marginTop: 24, marginBottom: 12 },

  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: SUCCESS,
  },
  resultCardWrong: { borderLeftColor: DANGER },
  resultIndex: { fontSize: 11, color: MUTED, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  resultQuestion: { fontSize: 14, color: FG, marginTop: 4, fontWeight: '500', lineHeight: 20 },
  resultLine: { flexDirection: 'row', marginTop: 8, gap: 8, flexWrap: 'wrap' },
  resultLabel: { fontSize: 13, color: MUTED, fontWeight: '600' },
  resultValue: { fontSize: 13, color: FG, flex: 1 },

  cta: {
    marginTop: 32,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
