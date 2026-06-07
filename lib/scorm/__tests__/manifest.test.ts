import { normalizeScormHref, parseScormFilePaths } from '../manifest';

describe('normalizeScormHref', () => {
  it('düz relative path olduğu gibi', () => {
    expect(normalizeScormHref('js/scormdriver.js')).toBe('js/scormdriver.js');
  });

  it('baştaki ./ ve / temizlenir', () => {
    expect(normalizeScormHref('./index.html')).toBe('index.html');
    expect(normalizeScormHref('/assets/a.png')).toBe('assets/a.png');
  });

  it('query/fragment atılır', () => {
    expect(normalizeScormHref('index.html?ver=2#start')).toBe('index.html');
  });

  it('URL-encode çözülür (boşluk)', () => {
    expect(normalizeScormHref('assets/my%20file.png')).toBe('assets/my file.png');
  });

  it('harici URL → null', () => {
    expect(normalizeScormHref('https://cdn.example.com/x.js')).toBeNull();
    expect(normalizeScormHref('//cdn.example.com/x.js')).toBeNull();
  });

  it('path traversal (..) → null', () => {
    expect(normalizeScormHref('../secret.html')).toBeNull();
    expect(normalizeScormHref('a/../../b')).toBeNull();
  });

  it('boş → null', () => {
    expect(normalizeScormHref('   ')).toBeNull();
  });
});

describe('parseScormFilePaths', () => {
  it('tüm <file href> girdilerini çıkarır, sırayı korur', () => {
    const xml = `<manifest><resources><resource href="index.html">
      <file href="index.html"/>
      <file href="js/scormdriver.js"/>
      <file href="assets/logo.png"/>
    </resource></resources></manifest>`;
    expect(parseScormFilePaths(xml)).toEqual([
      'index.html',
      'js/scormdriver.js',
      'assets/logo.png',
    ]);
  });

  it('tekrarlananları eler', () => {
    const xml = `<file href="a.js"/><file href="a.js"/><file href="b.js"/>`;
    expect(parseScormFilePaths(xml)).toEqual(['a.js', 'b.js']);
  });

  it('tek tırnak ve fazladan attribute ile çalışır', () => {
    const xml = `<file foo="1" href='css/main.css' bar="2" />`;
    expect(parseScormFilePaths(xml)).toEqual(['css/main.css']);
  });

  it('harici href atlanır', () => {
    const xml = `<file href="local.js"/><file href="https://cdn/x.js"/>`;
    expect(parseScormFilePaths(xml)).toEqual(['local.js']);
  });

  it('hiç <file> yoksa boş dizi', () => {
    expect(parseScormFilePaths('<manifest></manifest>')).toEqual([]);
  });
});
