import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { render } from '@testing-library/react-native';
import type { ComponentType } from 'react';

// jest-expo default platform'u iOS; bare `import ... from '@/components/ui/icon-symbol'`
// platform resolution ile icon-symbol.ios.tsx'e (SF Symbols) düşerdi. Android/web
// fallback'ini (MaterialIcons) test etmek için fallback dosyasını uzantısıyla
// DOĞRUDAN yüklüyoruz; `require` kullanmak gerekiyor çünkü `.tsx` uzantılı static
// import'u TS (allowImportingTsExtensions kapalı) reddediyor.
type IconSymbolName = string;
type IconSymbolProps = { name: IconSymbolName; size?: number; color: string };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { IconSymbol } = require('@/components/ui/icon-symbol.tsx') as {
  IconSymbol: ComponentType<IconSymbolProps>;
};

// MAPPING icon-symbol.tsx'ten export edilmiyor; bu liste fallback'in beklenen
// SF Symbol → Material Icons karşılığının test-tarafı kopyası. icon-symbol.tsx'teki
// MAPPING değişirse buranın da güncellenmesi gerekir (testler aksi halde kırılır).
const EXPECTED_MAPPING: Record<string, string> = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'book.fill': 'book',
  rosette: 'workspace-premium',
  'person.fill': 'person',
  checkmark: 'check',
  'checkmark.circle.fill': 'check-circle',
  xmark: 'close',
  'xmark.circle.fill': 'cancel',
  'circle.fill': 'circle',
  circle: 'radio-button-unchecked',
  'arrow.right': 'arrow-forward',
  'arrow.left': 'arrow-back',
  'doc.text': 'description',
  'doc.fill': 'picture-as-pdf',
  'play.fill': 'play-arrow',
  'pause.fill': 'pause',
  'speaker.slash.fill': 'volume-off',
  'speaker.wave.2.fill': 'volume-up',
  'lock.fill': 'lock',
  faceid: 'face',
  touchid: 'fingerprint',
  'bell.fill': 'notifications',
  bell: 'notifications-none',
  'square.and.arrow.up': 'share',
  eye: 'visibility',
  'exclamationmark.triangle.fill': 'warning',
  tray: 'inbox',
  clock: 'schedule',
  'clock.fill': 'schedule',
  'checkmark.seal.fill': 'verified',
  sparkles: 'auto-awesome',
  calendar: 'calendar-today',
  'graduationcap.fill': 'school',
  'star.fill': 'star',
  gear: 'settings',
};

// Uygulamada (app/ + components/) IconSymbol'a string literal olarak verilen
// SF Symbol isimleri. `grep -rhoE` ile çıkarılıp sabitlendi; yeni bir icon ismi
// kullanmaya başlarsan (ve MAPPING'e eklersen) bu listeye de ekle, böylece
// "kullanılan ama map'lenmemiş" durumu testle yakalanır.
const ICON_NAMES_USED_IN_APP: IconSymbolName[] = [
  'arrow.left',
  'arrow.right',
  'bell',
  'bell.fill',
  'book.fill',
  'calendar',
  'checkmark.circle.fill',
  'checkmark.seal.fill',
  'chevron.left',
  'chevron.left.forwardslash.chevron.right',
  'chevron.right',
  'circle',
  'circle.fill',
  'clock',
  'clock.fill',
  'doc.fill',
  'doc.text',
  'exclamationmark.triangle.fill',
  'graduationcap.fill',
  'house.fill',
  'lock.fill',
  'paperplane.fill',
  'pause.fill',
  'person.fill',
  'play.fill',
  'rosette',
  'sparkles',
  'speaker.slash.fill',
  'speaker.wave.2.fill',
  'square.and.arrow.up',
  'star.fill',
  'tray',
];

// MaterialIcons.glyphMap @expo/vector-icons'tan gelir; key = Material icon adı,
// value = unicode codepoint. Geçerli glyph kontrolü için tek doğru kaynak.
const glyphMap = MaterialIcons.glyphMap as Record<string, number>;

describe('IconSymbol (Android/web MaterialIcons fallback)', () => {
  it('bilinen bir SF Symbol ismiyle MaterialIcons render eder', () => {
    const tree = render(<IconSymbol name="checkmark.circle.fill" color="#000" />);
    const icon = tree.UNSAFE_getByType(MaterialIcons);
    // SF Symbol ismi Material karşılığına çevrilmeli (check-circle).
    expect(icon.props.name).toBe('check-circle');
  });

  it("size ve color prop'larını MaterialIcons'a geçirir", () => {
    const tree = render(<IconSymbol name="lock.fill" color="#C2410C" size={28} />);
    const icon = tree.UNSAFE_getByType(MaterialIcons);
    expect(icon.props.name).toBe('lock');
    expect(icon.props.size).toBe(28);
    expect(icon.props.color).toBe('#C2410C');
  });

  it('size verilmezse default 24 kullanır', () => {
    const tree = render(<IconSymbol name="bell" color="#000" />);
    expect(tree.UNSAFE_getByType(MaterialIcons).props.size).toBe(24);
  });

  describe('MAPPING tablosu', () => {
    it("her SF Symbol key geçerli bir MaterialIcons glyph'ine map edilir", () => {
      const invalid = Object.entries(EXPECTED_MAPPING).filter(
        ([, materialName]) => !(materialName in glyphMap),
      );
      expect(invalid).toEqual([]);
    });

    it("her MAPPING key'i için render gerçek glyph üretir (render-roundtrip)", () => {
      for (const sfName of Object.keys(EXPECTED_MAPPING) as IconSymbolName[]) {
        const tree = render(<IconSymbol name={sfName} color="#000" />);
        const materialName = tree.UNSAFE_getByType(MaterialIcons).props.name as string;
        expect(materialName).toBe(EXPECTED_MAPPING[sfName]);
        expect(glyphMap[materialName]).toBeDefined();
        tree.unmount();
      }
    });
  });

  describe('uygulamada kullanılan iconlar', () => {
    it("app/ + components/ içinde kullanılan tüm icon isimleri MAPPING'de tanımlı", () => {
      const missing = ICON_NAMES_USED_IN_APP.filter((name) => !(name in EXPECTED_MAPPING));
      expect(missing).toEqual([]);
    });

    it("kullanılan her icon geçerli bir MaterialIcons glyph'ine çözülür", () => {
      const unresolved = ICON_NAMES_USED_IN_APP.filter((name) => {
        const materialName = EXPECTED_MAPPING[name];
        return !materialName || !(materialName in glyphMap);
      });
      expect(unresolved).toEqual([]);
    });
  });
});
