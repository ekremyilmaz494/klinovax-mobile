import { buildExamPassedEvents, buildFeedbackEvent } from '../award-events';

// Gerçekçi v4 uuid'ler (backend z.string().uuid() ile geçer).
const ASSIGNMENT_ID = '11111111-1111-4111-8111-111111111111';
const ATTEMPT_ID = '22222222-2222-4222-9222-222222222222';
const RESPONSE_ID = '33333333-3333-4333-a333-333333333333';

describe('buildExamPassedEvents', () => {
  it('yalnız assignmentId varken sadece training_complete üretir', () => {
    const events = buildExamPassedEvents({ assignmentId: ASSIGNMENT_ID });
    expect(events).toEqual([
      { type: 'training_complete', refId: ASSIGNMENT_ID, eventId: ASSIGNMENT_ID },
    ]);
  });

  it('attemptId da varken training_complete + exam_pass üretir', () => {
    const events = buildExamPassedEvents({
      assignmentId: ASSIGNMENT_ID,
      attemptId: ATTEMPT_ID,
    });
    expect(events).toEqual([
      { type: 'training_complete', refId: ASSIGNMENT_ID, eventId: ASSIGNMENT_ID },
      { type: 'exam_pass', refId: ATTEMPT_ID, eventId: ATTEMPT_ID },
    ]);
  });

  it('attemptId null/undefined ise exam_pass atlanır (backend alanı yokken)', () => {
    expect(buildExamPassedEvents({ assignmentId: ASSIGNMENT_ID, attemptId: null })).toHaveLength(1);
    expect(
      buildExamPassedEvents({ assignmentId: ASSIGNMENT_ID, attemptId: undefined }),
    ).toHaveLength(1);
  });

  it('assignmentId eksik/uuid değilse hiç olay üretmez (sessiz 422 önleme)', () => {
    expect(buildExamPassedEvents({ assignmentId: null })).toEqual([]);
    expect(buildExamPassedEvents({ assignmentId: undefined })).toEqual([]);
    expect(buildExamPassedEvents({ assignmentId: '' })).toEqual([]);
    expect(buildExamPassedEvents({ assignmentId: 'not-a-uuid' })).toEqual([]);
  });

  it('attemptId uuid değilse exam_pass üretmez ama training_complete kalır', () => {
    const events = buildExamPassedEvents({ assignmentId: ASSIGNMENT_ID, attemptId: 'dq_123' });
    expect(events).toEqual([
      { type: 'training_complete', refId: ASSIGNMENT_ID, eventId: ASSIGNMENT_ID },
    ]);
  });

  it('idempotency değişmezi: her olayda eventId === refId', () => {
    const events = buildExamPassedEvents({
      assignmentId: ASSIGNMENT_ID,
      attemptId: ATTEMPT_ID,
    });
    for (const ev of events) {
      expect(ev.eventId).toBe(ev.refId);
    }
  });
});

describe('buildFeedbackEvent', () => {
  it('geçerli responseId ile feedback_submit üretir (eventId === refId)', () => {
    expect(buildFeedbackEvent(RESPONSE_ID)).toEqual({
      type: 'feedback_submit',
      refId: RESPONSE_ID,
      eventId: RESPONSE_ID,
    });
  });

  it('responseId yok/uuid değilse null döner (409 dalı dahil)', () => {
    expect(buildFeedbackEvent(null)).toBeNull();
    expect(buildFeedbackEvent(undefined)).toBeNull();
    expect(buildFeedbackEvent('')).toBeNull();
    expect(buildFeedbackEvent('abc')).toBeNull();
  });
});
