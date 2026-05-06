import { PropsWithChildren, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Text, useTheme } from '@/design-system';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTheme();

  return (
    <View>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}
      >
        <IconSymbol
          name="chevron.right"
          size={18}
          color={t.colors.text.tertiary}
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />
        <Text variant="title-3">{title}</Text>
      </TouchableOpacity>
      {isOpen && <View style={{ marginTop: 6, marginLeft: 24 }}>{children}</View>}
    </View>
  );
}
