import { useMutation } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenError } from '@/components/ui/ScreenError'
import { startExam } from '@/lib/api/exam'

const PRIMARY = '#0d9668'
const BG = '#f1f5f9'
const FG = '#0f172a'
const MUTED = '#64748b'

/**
 * Sınav öncesi kurallar ekranı. "Başla" butonu /exam/[id]/start çağırır
 * ve attempt status'üne göre uygun ekrana yönlendirir.
 *
 * Status → ekran:
 *   pre_exam        → questions?phase=pre
 *   watching_videos → videos (Hafta 5'te eklenecek; şimdilik uyarı)
 *   post_exam       → questions?phase=post
 *   completed       → result
 */
export default function ExamStartScreen() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>()

  const startMutation = useMutation({
    mutationFn: () => startExam(assignmentId),
    onSuccess: (data) => {
      switch (data.status) {
        case 'pre_exam':
          router.replace(`/exam/${assignmentId}/questions?phase=pre`)
          break
        case 'post_exam':
          router.replace(`/exam/${assignmentId}/questions?phase=post`)
          break
        case 'watching_videos':
          Alert.alert(
            'Video aşaması',
            'Bu eğitimde sınava devam etmeden önce videoları izlemeniz gerek. Video oynatıcı yakında mobile\'a geliyor; şimdilik web\'den devam edin.',
            [{ text: 'Tamam', onPress: () => router.back() }],
          )
          break
        case 'completed':
          router.replace(`/exam/${assignmentId}/result`)
          break
      }
    },
  })

  const error = startMutation.error as Error | null

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <Stack.Screen options={{ title: 'Sınav başlat', headerBackTitle: 'Geri' }} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Başlamadan önce</Text>
        <Text style={styles.subtitle}>
          Sınava başlamadan önce aşağıdaki kuralları okuyun.
        </Text>

        <View style={styles.rulesCard}>
          <Rule n={1} text="Sınava başladığınızda süreniz işlemeye başlar." />
          <Rule n={2} text="Cevaplarınız her seçimde otomatik kaydedilir." />
          <Rule n={3} text="Soruları istediğiniz sırada cevaplayabilirsiniz." />
          <Rule n={4} text="Uygulamayı kapatırsanız sayım devam eder; süre dolarsa otomatik gönderilir." />
          <Rule n={5} text="Son sınavda bir sorunun cevabı 30 saniye içinde değiştirilebilir, sonra kilitlenir." />
        </View>

        {error && (
          <ScreenError
            message={error.message || 'Sınav başlatılamadı.'}
            onRetry={() => startMutation.reset()}
          />
        )}

        <Pressable
          style={[styles.cta, startMutation.isPending && styles.ctaDisabled]}
          disabled={startMutation.isPending}
          onPress={() => startMutation.mutate()}
        >
          <Text style={styles.ctaText}>
            {startMutation.isPending ? 'Başlatılıyor…' : 'Sınava başla'}
          </Text>
        </Pressable>

        <Pressable style={styles.cancel} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Vazgeç</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

function Rule({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.rule}>
      <View style={styles.ruleDot}>
        <Text style={styles.ruleN}>{n}</Text>
      </View>
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  content: { padding: 20, paddingBottom: 48 },

  title: { fontSize: 24, fontWeight: '700', color: FG },
  subtitle: { fontSize: 14, color: MUTED, marginTop: 6 },

  rulesCard: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  ruleDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  ruleN: { color: '#fff', fontSize: 12, fontWeight: '700' },
  ruleText: { flex: 1, fontSize: 14, color: FG, lineHeight: 20 },

  cta: {
    marginTop: 32,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  cancel: { marginTop: 12, alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: MUTED, fontSize: 15, fontWeight: '500' },
})
