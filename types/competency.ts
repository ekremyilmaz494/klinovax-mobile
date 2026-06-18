/**
 * 360° Yetkinlik modülü — `/api/staff/evaluations/*` + `/api/staff/competency/me`.
 * İki yüzey: (A) bana atanan değerlendirmeleri doldurma + "Hakkımdaki", (B) kendi
 * tamamlanmış yetkinlik sonuçlarım (read-only). Org-gate: modül kapalıysa backend
 * boş liste (veya 403) döner → ekran zarif boş durum gösterir.
 */

export type EvaluationSubject = {
  firstName: string;
  lastName: string;
  title?: string | null;
  departmentRel: { name: string } | null;
};

/** Liste — bekleyen (BEN başkasını değerlendireceğim). */
export type PendingEvaluation = {
  id: string;
  status: string;
  evaluatorType: string;
  form: { id: string; title: string; periodEnd: string | null };
  subject: { firstName: string; lastName: string; departmentRel: { name: string } | null };
};

/** Liste — hakkımdaki (BEN konuyum, tamamlanmış). */
export type MySubjectEvaluation = {
  id: string;
  status: string;
  evaluatorType: string;
  overallScore: number | null;
  completedAt: string | null;
  form: { id: string; title: string; periodEnd: string | null };
};

export type EvaluationsListResponse = {
  pending: PendingEvaluation[];
  mySubjectEvals: MySubjectEvaluation[];
};

export type EvaluationItem = {
  id: string;
  text: string;
  description: string | null;
  order: number;
};

export type EvaluationCategory = {
  id: string;
  name: string;
  weight: number;
  order: number;
  items: EvaluationItem[];
};

export type EvaluationAnswer = { itemId: string; score: number; comment: string | null };

export type EvaluationDetail = {
  id: string;
  status: string;
  evaluatorType: string;
  form: { id: string; title: string; categories: EvaluationCategory[] };
  subject: EvaluationSubject;
  answers: EvaluationAnswer[];
};

export type EvaluationDetailResponse = {
  evaluation: EvaluationDetail;
  totalItems: number;
  answeredItems: number;
  progress: number;
};

export type SubmitEvaluationBody = {
  answers: { itemId: string; score: number; comment?: string }[];
};

export type SubmitEvaluationResponse = { success: true; overallScore: number };

/** Yetkinlik sonucu (read-only) — kategori bazlı ortalama + genel skor. */
export type CompetencyResultCategory = {
  id: string;
  name: string;
  weight: number;
  avgScore: number | null;
};

export type CompetencyResult = {
  id: string;
  formId: string;
  formTitle: string;
  periodEnd: string | null;
  evaluatorType: string;
  overallScore: number | null;
  completedAt: string | null;
  categories: CompetencyResultCategory[];
};

export type CompetencyMeResponse = { evaluations: CompetencyResult[] };
