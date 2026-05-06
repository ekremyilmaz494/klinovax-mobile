import { View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../theme';

export interface HeroProps {
  overline?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
}

export function Hero({ overline, title, subtitle, align = 'left' }: HeroProps) {
  const t = useTheme();
  const textAlign = align === 'center' ? 'center' : 'left';
  return (
    <View
      style={{
        alignItems: align === 'center' ? 'center' : 'flex-start',
        gap: 8,
        marginBottom: t.space[5],
      }}
    >
      {overline ? (
        <Text variant="overline" tone="tertiary" style={{ textAlign }}>
          {overline}
        </Text>
      ) : null}
      <Text variant="title-1" tone="primary" style={{ textAlign }}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="subhead" tone="tertiary" style={{ textAlign }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
