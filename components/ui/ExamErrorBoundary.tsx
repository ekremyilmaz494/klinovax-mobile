import type { ErrorBoundaryProps } from 'expo-router';

import { RouterErrorBoundary } from '@/components/ui/RouterErrorBoundary';

/**
 * Exam grup layout'unun ErrorBoundary'si. RouterErrorBoundary'yi 'exam' context
 * ile sarar — Sentry'de sınav-akışı crash'leri root'tan ayrı tag'lenir.
 */
export function ExamErrorBoundary(props: ErrorBoundaryProps) {
  return <RouterErrorBoundary {...props} context="exam" />;
}
