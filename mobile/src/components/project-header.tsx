import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui';
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
 */
export function ProjectHeader({
  name,
  handle,
  stats,
  description,
  kit,
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
  const banner = bannerOf(kit);
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

const KIND_ICON: Record<string, IconName> = {
  image: 'photo',
  video: 'video',
  audio: 'muted',
  font: 'doc',
  document: 'doc',
  other: 'paperclip',
};

/** The whole brand kit: logos, colours (tap to copy), fonts, the guide and files. */
export function BrandKitSection({ kit, title = 'Brand kit' }: { kit: BrandKit; title?: string }) {
  const theme = useTheme();
  const [guideOpen, setGuideOpen] = useState(false);
  const colors = colorsOf(kit);
  const logos = kit.logos ?? [];
  const fonts = kit.fonts ?? [];
  const files = kit.assets ?? [];
  const open = (url: string) => void WebBrowser.openBrowserAsync(portalUrl(url)).catch(() => null);

  return (
    <View style={styles.section}>
      <ThemedText type="label" themeColor="textSecondary">
        {title}
      </ThemedText>
      {logos.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.logos}>
          {logos.map((l) => (
            <Pressable key={l.url} onPress={() => open(l.url)} style={styles.logoTile}>
              <View
                style={[
                  styles.logoBox,
                  {
                    borderColor: theme.border,
                    backgroundColor: /dark|black/i.test(l.background ?? '')
                      ? '#111'
                      : /light|white/i.test(l.background ?? '')
                        ? '#f5f5f5'
                        : theme.backgroundElement,
                  },
                ]}>
                <Image source={{ uri: portalUrl(l.url) }} style={styles.logoImage} contentFit="contain" />
              </View>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.logoLabel}>
                {l.label}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {colors.length ? (
        <View style={styles.colorGrid}>
          {colors.map((c) => (
            <Pressable
              key={`${c.name}${c.hex}`}
              onPress={() => copy(c.hex)}
              style={({ pressed }) => [
                styles.colorChip,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
              ]}>
              <View style={[styles.colorDot, { backgroundColor: c.hex, borderColor: theme.border }]} />
              <View style={styles.flexShrink}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {c.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {c.hex}
                  {c.role ? ` · ${c.role}` : ''}
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {fonts.length ? (
        <Card style={styles.list}>
          {fonts.map((f, i) => (
            <View key={`${f.family}${f.weight ?? ''}${i}`} style={[styles.fontRow, i > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <ThemedText type="smallBold" style={styles.flexShrink}>
                Aa {f.family}
                {f.weight ? ` ${f.weight}` : ''}
              </ThemedText>
              {f.role ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.flexShrink}>
                  {f.role}
                </ThemedText>
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}

      {kit.guide ? (
        <Card>
          <ThemedText type="smallBold">Brand guide</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={guideOpen ? undefined : 5}>
            {kit.guide}
          </ThemedText>
          <Pressable onPress={() => setGuideOpen((v) => !v)} hitSlop={8}>
            <ThemedText type="smallBold">{guideOpen ? 'Less' : 'Read all'}</ThemedText>
          </Pressable>
        </Card>
      ) : null}

      {files.length ? (
        <Card style={styles.list}>
          {files.slice(0, 30).map((f, i) => (
            <Pressable
              key={`${f.url}${i}`}
              onPress={() => open(f.url)}
              style={({ pressed }) => [
                styles.fileRow,
                i > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth },
                { opacity: pressed ? 0.6 : 1 },
              ]}>
              <Icon name={KIND_ICON[f.kind] ?? 'paperclip'} size={18} color={theme.textSecondary} />
              <View style={styles.flex}>
                <ThemedText numberOfLines={1}>{f.label}</ThemedText>
                {f.group ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {f.group.charAt(0).toUpperCase() + f.group.slice(1)}
                  </ThemedText>
                ) : null}
              </View>
              <Icon name="share" size={15} color={theme.textSecondary} />
            </Pressable>
          ))}
        </Card>
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
  section: { gap: Spacing.two },
  logos: { gap: Spacing.three },
  logoTile: { width: 92, gap: 4 },
  logoBox: {
    width: 92,
    height: 92,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.two,
  },
  logoImage: { width: '100%', height: '100%' },
  logoLabel: { textAlign: 'center' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    width: '48.5%',
    padding: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
  colorDot: { width: 28, height: 28, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  list: { gap: 0, paddingVertical: Spacing.one },
  fontRow: { paddingVertical: Spacing.two + 2, gap: 2 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two + 2 },
});
