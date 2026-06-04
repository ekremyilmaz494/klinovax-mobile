import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearVideoProgress,
  mergeWatchedSeconds,
  readVideoProgress,
  writeVideoProgress,
} from '../video-progress-cache';

describe('mergeWatchedSeconds — force-kill kurtarma çekirdeği', () => {
  it('yerel önbellek backend değerinden büyükse onu döner (çevrimdışı birikim korunur)', () => {
    expect(mergeWatchedSeconds(30, 75)).toBe(75);
  });

  it('backend değeri büyükse onu döner (önbellek asla düşürmez)', () => {
    expect(mergeWatchedSeconds(120, 40)).toBe(120);
  });

  it('önbellek yoksa (null/undefined) backend değeri kullanılır', () => {
    expect(mergeWatchedSeconds(50, null)).toBe(50);
    expect(mergeWatchedSeconds(50, undefined)).toBe(50);
  });

  it('bozuk önbellek (NaN/negatif) backend değerini düşürmez', () => {
    expect(mergeWatchedSeconds(50, NaN)).toBe(50);
    expect(mergeWatchedSeconds(50, -10)).toBe(50);
  });

  it('backend geçersizse (NaN/negatif) 0 sayılır, önbellek kazanır', () => {
    expect(mergeWatchedSeconds(NaN, 33)).toBe(33);
    expect(mergeWatchedSeconds(-5, 33)).toBe(33);
  });

  it('ikisi de yok → 0', () => {
    expect(mergeWatchedSeconds(0, null)).toBe(0);
  });
});

describe('readVideoProgress / writeVideoProgress / clearVideoProgress', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('yazılan ilerleme aynı anahtarla geri okunur', async () => {
    await writeVideoProgress('assign-1', 'video-1', { watchedSeconds: 42, position: 40 });
    expect(await readVideoProgress('assign-1', 'video-1')).toEqual({
      watchedSeconds: 42,
      position: 40,
    });
  });

  it('farklı assignment/video anahtarları çakışmaz', async () => {
    await writeVideoProgress('assign-1', 'video-1', { watchedSeconds: 10, position: 8 });
    await writeVideoProgress('assign-2', 'video-1', { watchedSeconds: 99, position: 90 });
    expect((await readVideoProgress('assign-1', 'video-1'))?.watchedSeconds).toBe(10);
    expect((await readVideoProgress('assign-2', 'video-1'))?.watchedSeconds).toBe(99);
  });

  it('kayıt yoksa null döner', async () => {
    expect(await readVideoProgress('yok', 'yok')).toBeNull();
  });

  it('clear sonrası kayıt silinir (tamamlanan video önbellekten çıkar)', async () => {
    await writeVideoProgress('assign-1', 'video-1', { watchedSeconds: 42, position: 40 });
    await clearVideoProgress('assign-1', 'video-1');
    expect(await readVideoProgress('assign-1', 'video-1')).toBeNull();
  });

  it('bozuk JSON güvenle null döner (uygulamayı kırmaz)', async () => {
    await AsyncStorage.setItem('klinovax:video-progress:assign-1:video-1', '{bozuk');
    expect(await readVideoProgress('assign-1', 'video-1')).toBeNull();
  });
});
