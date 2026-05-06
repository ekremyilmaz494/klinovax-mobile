import { Tag, type TagTone } from '@/design-system';

type LegacyTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

type Props = {
  label: string;
  tone?: LegacyTone;
};

/**
 * Legacy Badge alias kept for backward compatibility with existing call sites.
 * Forwards to the new Tag primitive.
 */
export function Badge({ label, tone = 'neutral' }: Props) {
  const tagTone: TagTone = tone;
  return <Tag label={label} tone={tagTone} />;
}
