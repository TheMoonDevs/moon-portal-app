import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { portalUrl } from '@/lib/api';
import { accentOf, bannerOf, colorsOf, inkOn, logoOf } from '@/lib/brand';
import type { BrandKit } from '@/lib/types';

const copy = (hex: string) => {
  void Clipboard.setStringAsync(hex);
  void Haptics.selectionAsync();
};

/**
 * The top of a project page, like a channel page: the brand's banner (or a
 * band in its colours), the logo over its edge, the name, a line about the
 * team and work, the description, the main actions and the brand colours.
 * Its leads can pick the top image from the brand kit's images.
 */
export function ProjectHeader({
  name,
  handle,
  stats,
  description,
  kit,
  banner: chosen,
  onEditBanner,
  logo,
  color,
  actions,
}: {
  name: string;
  /** Under the name: "@portal · TheMoonDevs". */
  handle?: string | null;
  /** "6 people · 12 open tasks · 63% done". */
  stats?: string | null;
  description?: string | null;
  kit: BrandKit | null;
  /** The image picked for the top (the project's headerImage), else the kit's banner. */
  banner?: string | null;
  /** Shown to the project's leads: pick the image at the top. */
  onEditBanner?: () => void;
  logo?: string | null;
  /** The project's own colour, when the kit has none. */
  color?: string | null;
  actions?: ReactNode;
}) {
  const theme = useTheme();
  const [more, setMore] = useState(false);
  const colors = colorsOf(kit);
  const main = colors[0]?.hex ?? color ?? '#6366f1';
  const second = accentOf(kit) ?? colors[1]?.hex ?? main;
  const banner = chosen ?? bannerOf(kit);
  const mark = logo ?? logoOf(kit);
  const fonts = Array.from(new Set((kit?.fonts ?? []).map((f) => f.family))).slice(0, 3);

  return (
    <View style={styles.wrap}>
      <View style={[styles.banner, { backgroundColor: main }]}>
        {banner ? (
          <Image source={{ uri: portalUrl(banner) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 320 100">
            <Defs>
              <LinearGradient id="band" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={main} />
                <Stop offset="1" stopColor={second} stopOpacity={second === main ? 0.55 : 1} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="320" height="100" fill="url(#band)" />
            <Circle cx="270" cy="12" r="58" fill="#fff" opacity={0.08} />
            <Circle cx="300" cy="96" r="34" fill="#fff" opacity={0.06} />
            <Circle cx="40" cy="104" r="44" fill="#000" opacity={0.06} />
          </Svg>
        )}
        {onEditBanner ? (
          <Pressable
            onPress={onEditBanner}
            accessibilityRole="button"
            accessibilityLabel="Change the header image"
            hitSlop={8}
            style={({ pressed }) => [styles.bannerEdit, { opacity: pressed ? 0.7 : 1 }]}>
            <Icon name="photo" size={17} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.idRow}>
        <View style={[styles.logoRing, { backgroundColor: theme.background }]}>
          {mark ? (
            <Image
              source={{ uri: portalUrl(mark) }}
              style={[styles.logo, { backgroundColor: theme.backgroundElement }]}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View style={[styles.logo, styles.initial, { backgroundColor: main }]}>
              <ThemedText style={[styles.initialText, { color: inkOn(main) }]}>
                {name.trim().charAt(0).toUpperCase() || '·'}
              </ThemedText>
            </View>
          )}
        </View>
        <View style={styles.actions}>{actions}</View>
      </View>

      <View style={styles.text}>
        <ThemedText type="subtitle" numberOfLines={2}>
          {name}
        </ThemedText>
        {handle ? (
          <ThemedText type="smallBold" themeColor="textSecondary" numberOfLines={1}>
            {handle}
          </ThemedText>
        ) : null}
        {stats ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {stats}
          </ThemedText>
        ) : null}
        {description ? (
          <Pressable onPress={() => setMore((v) => !v)}>
            <ThemedText themeColor="textSecondary" numberOfLines={more ? undefined : 2}>
              {description}
            </ThemedText>
            {!more && description.length > 90 ? (
              <ThemedText type="smallBold" style={styles.more}>
                more
              </ThemedText>
            ) : null}
          </Pressable>
        ) : null}
      </View>

      {colors.length || fonts.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatches}>
          {colors.slice(0, 8).map((c) => (
            <Pressable
              key={`${c.name}${c.hex}`}
              onPress={() => copy(c.hex)}
              accessibilityLabel={`Copy ${c.name} ${c.hex}`}
              style={[styles.swatch, { backgroundColor: c.hex, borderColor: theme.border }]}
            />
          ))}
          {fonts.length ? (
            <View style={[styles.fontPill, { borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                Aa {fonts.join(' · ')}
              </ThemedText>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

const LOGO = 84;

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  banner: { width: '100%', aspectRatio: 3.2, borderRadius: Radius.large, overflow: 'hidden' },
  idRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: -LOGO / 2, paddingLeft: Spacing.three, gap: Spacing.two },
  logoRing: { padding: 4, borderRadius: (LOGO + 8) / 2 },
  logo: { width: LOGO, height: LOGO, borderRadius: LOGO / 2 },
  initial: { alignItems: 'center', justifyContent: 'center' },
  initialText: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
  actions: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: Spacing.two, paddingBottom: Spacing.one },
  text: { gap: 2 },
  more: { marginTop: 2 },
  swatches: { gap: Spacing.two, alignItems: 'center', paddingVertical: 2 },
  swatch: { width: 24, height: 24, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  fontPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
    maxWidth: 220,
  },
  bannerEdit: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
});
