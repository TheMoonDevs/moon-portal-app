import { Image } from 'expo-image';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { portalUrl } from '@/lib/api';

const FALLBACK = ['#60a5fa', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#22d3ee', '#fb923c'];

/** A colour for something without one, the same each time for its id. */
export function colorFor(id: string, color?: string | null) {
  if (color) return color;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return FALLBACK[Math.abs(h) % FALLBACK.length];
}

/** A company's logo, or its first letter on its colour (a lock for Personal). */
export function CompanyMark({
  id,
  name,
  color,
  logo,
  personal,
  size = 40,
}: {
  id: string;
  name: string;
  color?: string | null;
  logo?: string | null;
  personal?: boolean;
  size?: number;
}) {
  const box = { width: size, height: size, borderRadius: size * 0.26 };
  if (logo && !personal)
    return <Image source={{ uri: portalUrl(logo) }} style={box} contentFit="cover" transition={120} />;
  return (
    <View
      style={[
        box,
        {
          backgroundColor: personal ? color || '#0d9488' : colorFor(id, color),
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}>
      {personal ? (
        <Icon name="lock" size={size * 0.45} color="#fff" />
      ) : (
        <ThemedText style={{ color: '#fff', fontWeight: 800, fontSize: size * 0.42, lineHeight: size * 0.5 }}>
          {(name.trim()[0] ?? '?').toUpperCase()}
        </ThemedText>
      )}
    </View>
  );
}
