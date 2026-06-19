import { forwardRef, useState } from 'react';
import {
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { FontFamily } from '../fonts';
import { useTheme } from '../theme';

export interface InputFieldProps extends Omit<RNTextInputProps, 'style'> {
  /** Arka plan yüzeyi — kart içindeki input'lar genelde 'canvas' ister. */
  surface?: 'primary' | 'canvas';
  /** Ek/override stil (örn. farklı minHeight veya fontSize). */
  inputStyle?: StyleProp<TextStyle>;
}

/**
 * Warm Editorial tek-tip metin girişi. Focus halkası (hairline → 2px focus),
 * sand/clay paleti ve gövde tipografisi tek noktada. login / feedback / kvkk /
 * ek-hak-talebi formlarındaki tekrarlanan TextInput stilinin yerini alır.
 *
 * Label ve karakter sayacı bilinçli olarak DIŞARIDA bırakıldı: ekranlar bunları
 * caption/subhead ve farklı düzenlerle kuruyor; primitif sadece kutuyu standardize eder.
 * `multiline` verildiğinde textAlignVertical 'top' ve daha yüksek minHeight otomatik gelir.
 */
export const InputField = forwardRef<RNTextInput, InputFieldProps>(function InputField(
  { surface = 'primary', inputStyle, multiline, onFocus, onBlur, ...rest },
  ref,
) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <RNTextInput
      ref={ref}
      multiline={multiline}
      // Sabit minHeight (52/96) + 17pt: AX büyük tipte clamp olmazsa metin dikey kesilir.
      // {...rest} ile çağıran override edebilir.
      maxFontSizeMultiplier={1.6}
      placeholderTextColor={t.colors.text.tertiary}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[
        {
          backgroundColor:
            surface === 'canvas' ? t.colors.surface.canvas : t.colors.surface.primary,
          borderRadius: t.radius.md,
          paddingHorizontal: t.space[4],
          paddingVertical: t.space[4],
          fontSize: 17,
          color: t.colors.text.primary,
          fontFamily: FontFamily.body,
          minHeight: multiline ? 96 : 52,
          borderWidth: focused ? 2 : t.hairline,
          borderColor: focused ? t.colors.border.focus : t.colors.border.default,
        },
        multiline ? { textAlignVertical: 'top' } : null,
        inputStyle,
      ]}
      {...rest}
    />
  );
});
