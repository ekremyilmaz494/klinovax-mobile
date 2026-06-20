import { resolveLoginStep } from '../login-next-step';

type LoginResponse = Parameters<typeof resolveLoginStep>[0];

function baseResponse(overrides: Partial<LoginResponse> = {}): LoginResponse {
  return {
    user: { id: 'u1', email: 'a@b.com', role: 'staff' },
    organizationId: 'org-1',
    organizationSlug: 'org-slug',
    session: {
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: null,
      tokenType: 'Bearer',
    },
    mustChangePassword: false,
    setupCompleted: true,
    ...overrides,
  };
}

describe('resolveLoginStep', () => {
  it('orgPickRequired + orgs → orgPick', () => {
    const orgs = [
      { slug: 'a', name: 'A Hastanesi' },
      { slug: 'b', name: 'B Hastanesi' },
    ];
    const step = resolveLoginStep(baseResponse({ orgPickRequired: true, orgs, session: null }));
    expect(step).toEqual({ kind: 'orgPick', orgs });
  });

  it('orgPickRequired ama orgs boş → blocked (boş seçim ekranı gösterme)', () => {
    const step = resolveLoginStep(baseResponse({ orgPickRequired: true, orgs: [], session: null }));
    expect(step.kind).toBe('blocked');
  });

  it('mfaRequired → mfa', () => {
    const step = resolveLoginStep(baseResponse({ mfaRequired: true, session: null }));
    expect(step.kind).toBe('mfa');
  });

  it('smsMfaRequired → smsMfa (phoneMasked taşınır)', () => {
    const step = resolveLoginStep(
      baseResponse({ smsMfaRequired: true, phoneMasked: '****1234', session: null }),
    );
    expect(step).toEqual({ kind: 'smsMfa', phoneMasked: '****1234' });
  });

  it('smsMfaRequired phoneMasked yoksa null', () => {
    const step = resolveLoginStep(baseResponse({ smsMfaRequired: true, session: null }));
    expect(step).toEqual({ kind: 'smsMfa', phoneMasked: null });
  });

  it('session yok + bilinen gate değil → blocked', () => {
    const step = resolveLoginStep(baseResponse({ session: null }));
    expect(step.kind).toBe('blocked');
  });

  it('session var → session', () => {
    expect(resolveLoginStep(baseResponse()).kind).toBe('session');
  });

  it('session var + mustChangePassword → yine session (bayrak ayrı ele alınır)', () => {
    expect(resolveLoginStep(baseResponse({ mustChangePassword: true })).kind).toBe('session');
  });

  it('öncelik: orgPick + mfa + sms hepsi varsa orgPick kazanır', () => {
    const step = resolveLoginStep(
      baseResponse({
        orgPickRequired: true,
        orgs: [{ slug: 'a', name: 'A' }],
        mfaRequired: true,
        smsMfaRequired: true,
        session: null,
      }),
    );
    expect(step.kind).toBe('orgPick');
  });

  it('öncelik: mfa + sms birlikte → mfa kazanır', () => {
    const step = resolveLoginStep(
      baseResponse({ mfaRequired: true, smsMfaRequired: true, session: null }),
    );
    expect(step.kind).toBe('mfa');
  });
});
