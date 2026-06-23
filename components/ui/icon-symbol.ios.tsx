import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { StyleProp, View, ViewStyle } from 'react-native';

export type IconSymbolName = SymbolViewProps['name'];

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: SymbolViewProps['name'];
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  return (
    // iOS 26 + New Arch: SymbolView native UIView'i (userInteractionEnabled=true)
    // tab hücresinin ortasında dokunuşu yutuyordu → tab butonları tıklanamıyordu
    // (react-navigation#12935). pointerEvents="none" ile hit-test PlatformPressable'a
    // düşsün. View ile sarmalamak garanti yöntem (prop SymbolView'de ignore edilse bile).
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <SymbolView
        weight={weight}
        tintColor={color}
        resizeMode="scaleAspectFit"
        name={name}
        style={{ width: size, height: size }}
      />
    </View>
  );
}
