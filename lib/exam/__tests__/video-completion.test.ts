import {
  ANTI_CHEAT_WATCH_FLOOR,
  buildCompletionWatchedTime,
  shouldCompleteVideo,
  shouldFlushHeartbeat,
} from '../video-completion';

describe('shouldCompleteVideo — %90 eşiği', () => {
  it('eşiğin altında izlemede false döner', () => {
    expect(
      shouldCompleteVideo({
        accumulated: 89,
        durationSeconds: 100,
        alreadyCompleted: false,
        isPending: false,
      }),
    ).toBe(false);
  });

  it('tam eşikte (duration * 0.9) true döner', () => {
    expect(
      shouldCompleteVideo({
        accumulated: 90,
        durationSeconds: 100,
        alreadyCompleted: false,
        isPending: false,
      }),
    ).toBe(true);
  });

  it('eşiğin üstünde true döner', () => {
    expect(
      shouldCompleteVideo({
        accumulated: 100,
        durationSeconds: 100,
        alreadyCompleted: false,
        isPending: false,
      }),
    ).toBe(true);
  });

  it('zaten tamamlanmışsa eşik geçilse bile false (idempotence)', () => {
    expect(
      shouldCompleteVideo({
        accumulated: 100,
        durationSeconds: 100,
        alreadyCompleted: true,
        isPending: false,
      }),
    ).toBe(false);
  });

  it('mutation pending iken false (çift POST engeli)', () => {
    expect(
      shouldCompleteVideo({
        accumulated: 100,
        durationSeconds: 100,
        alreadyCompleted: false,
        isPending: true,
      }),
    ).toBe(false);
  });

  it('duration 0 ise false (sıfıra bölme / anlamsız eşik koruması)', () => {
    expect(
      shouldCompleteVideo({
        accumulated: 0,
        durationSeconds: 0,
        alreadyCompleted: false,
        isPending: false,
      }),
    ).toBe(false);
  });

  it('eşik sabiti 0.9 olarak kalmalı (backend ile senkron)', () => {
    expect(ANTI_CHEAT_WATCH_FLOOR).toBe(0.9);
  });
});

describe('buildCompletionWatchedTime — floor regresyon kilidi', () => {
  it('accumulated floor %90 eşiğinin altına yuvarlansa bile ceil(duration*0.9) taban alınır', () => {
    // duration=100 → eşik 90. accumulated=90.4 floor edilince 90 olur, bu eşitlik
    // sınırında; ama duration=101 gibi durumlarda ceil daha yüksek olabilir.
    const duration = 101; // ceil(101*0.9) = ceil(90.9) = 91
    const accumulated = 90.9; // Math.floor → 90, eşiğin (90.9) altında
    const watched = buildCompletionWatchedTime(accumulated, duration);
    expect(watched).toBeGreaterThanOrEqual(Math.ceil(duration * 0.9));
    expect(watched).toBe(91);
  });

  it('accumulated eşiğin çok üstündeyse floor değeri kullanılır', () => {
    const duration = 100;
    const accumulated = 99.8;
    expect(buildCompletionWatchedTime(accumulated, duration)).toBe(99);
  });

  it('gönderilen değer her zaman backend eşiğini karşılar', () => {
    for (const duration of [10, 33, 100, 247, 600]) {
      const accumulated = duration * 0.9; // tam eşik
      const watched = buildCompletionWatchedTime(accumulated, duration);
      expect(watched).toBeGreaterThanOrEqual(Math.ceil(duration * ANTI_CHEAT_WATCH_FLOOR));
    }
  });
});

describe('shouldFlushHeartbeat — çıkış/arka plan flush kararı', () => {
  it('son kayıttan beri yeni izleme varsa true (eşik beklenmez)', () => {
    expect(shouldFlushHeartbeat({ accumulated: 13.7, lastSaved: 10, alreadyCompleted: false })).toBe(
      true,
    );
  });

  it('1 saniyelik bile ilerleme flush edilir (normal heartbeat 10sn eşiğinin aksine)', () => {
    expect(shouldFlushHeartbeat({ accumulated: 11, lastSaved: 10, alreadyCompleted: false })).toBe(
      true,
    );
  });

  it('yeni izleme yoksa false (gereksiz POST atılmaz)', () => {
    expect(shouldFlushHeartbeat({ accumulated: 10.4, lastSaved: 10, alreadyCompleted: false })).toBe(
      false,
    );
  });

  it('hiç izleme yoksa (ekran açılıp kapandı) false', () => {
    expect(shouldFlushHeartbeat({ accumulated: 0, lastSaved: 0, alreadyCompleted: false })).toBe(
      false,
    );
  });

  it('video tamamlandıysa false (completion POST zaten son durumu yazdı)', () => {
    expect(shouldFlushHeartbeat({ accumulated: 95, lastSaved: 80, alreadyCompleted: true })).toBe(
      false,
    );
  });
});
