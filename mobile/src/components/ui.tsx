import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  type PressableProps,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  TextInput,
  type TextInputProps,
  useWindowDimensions,
  View,
  type ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing, WideContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { portalUrl } from '@/lib/api';

/** Room for two columns side by side (an iPad). */
export function useWide() {
  return useWindowDimensions().width >= 760;
}

/**
 * Two columns on a wide screen (an iPad), one after the other on a phone.
 * Used with `<Screen wide>`, which lets the content be wide enough for them.
 */
export function Columns({ left, right }: { left: ReactNode; right: ReactNode }) {
  if (!useWide())
    return (
      <>
        {left}
        {right}
      </>
    );
  return (
    <View style={styles.columns}>
      <View style={styles.column}>{left}</View>
      <View style={styles.column}>{right}</View>
    </View>
  );
}

/**
 * A scrolling screen body with the app's padding and width. Screens without
 * a header (the tabs) keep clear of the status bar with `edgeTop`; `wide`
 * screens use the room of an iPad for `Columns`.
 */
export function Screen({
  children,
  contentContainerStyle,
  edgeTop = true,
  wide = false,
  ...rest
}: ScrollViewProps & { edgeTop?: boolean; wide?: boolean }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // iOS insets the scroll view for the status bar, header and tab bar itself
  // (native tabs turn this on for a tab's first scroll view whatever it
  // asks), so padding for them as well would leave a gap. Elsewhere the
  // screen pads for them.
  const ios = Platform.OS === 'ios';
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior={ios || !edgeTop ? 'automatic' : 'never'}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.screen,
        {
          paddingTop: (edgeTop && !ios ? insets.top : 0) + Spacing.three,
          paddingBottom: (ios ? 0 : insets.bottom) + Spacing.five,
        },
        wide && styles.wide,
        contentContainerStyle,
      ]}
      {...rest}>
      {children}
    </ScrollView>
  );
}

/** A rounded panel. */
export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        style,
      ]}
      {...rest}
    />
  );
}

/** A card that opens something. */
export function PressableCard({ style, children, ...rest }: PressableProps & { children: ReactNode }) {
  const theme = useTheme();
  return (
    <Pressable
      style={(state) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          opacity: state.pressed ? 0.75 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {children}
    </Pressable>
  );
}

type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  kind?: 'primary' | 'secondary' | 'danger';
  busy?: boolean;
  icon?: ReactNode;
  small?: boolean;
};

export function Button({ title, kind = 'primary', busy, disabled, icon, small, style, ...rest }: ButtonProps) {
  const theme = useTheme();
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      style={(state) => [
        styles.button,
        small && styles.buttonSmall,
        {
          backgroundColor: primary ? theme.accent : theme.backgroundElement,
          borderColor: primary ? theme.accent : theme.border,
          opacity: disabled ? 0.5 : state.pressed ? 0.8 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {busy ? (
        <ActivityIndicator color={primary ? theme.onAccent : theme.text} />
      ) : (
        <>
          {icon}
          <ThemedText
            type="smallBold"
            style={{
              color: primary ? theme.onAccent : kind === 'danger' ? theme.danger : theme.text,
            }}>
            {title}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

/** A round icon button for headers and toolbars, with an optional count. */
export function IconButton({
  name,
  onPress,
  label,
  count,
  color,
  size = 22,
}: {
  name: IconName;
  onPress: () => void;
  label: string;
  count?: number;
  color?: string;
  size?: number;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.6 : 1 }]}>
      <Icon name={name} size={size} color={color} />
      {count ? (
        <View style={[styles.count, { backgroundColor: theme.danger }]}>
          <ThemedText style={styles.countText}>{count > 99 ? '99+' : count}</ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

/** A row in a settings-style list. */
export function Row({
  title,
  detail,
  onPress,
  right,
  icon,
  danger,
  chevron,
}: {
  title: string;
  detail?: string | null;
  onPress?: () => void;
  right?: ReactNode;
  icon?: IconName;
  danger?: boolean;
  chevron?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
      ]}>
      {icon ? <Icon name={icon} color={danger ? theme.danger : theme.textSecondary} /> : null}
      <View style={styles.rowText}>
        <ThemedText themeColor={danger ? 'danger' : 'text'}>{title}</ThemedText>
        {detail ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {detail}
          </ThemedText>
        ) : null}
      </View>
      {right}
      {chevron ? <Icon name="chevron" size={14} color={theme.textSecondary} /> : null}
    </Pressable>
  );
}

/** A small heading above a group of rows or cards. */
export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <ThemedText type="label" themeColor="textSecondary" style={styles.flex}>
        {title}
      </ThemedText>
      {right}
    </View>
  );
}

/** A centred message for empty, loading and error states. */
export function Notice({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <View style={styles.notice}>
      <ThemedText type="subtitle" style={styles.center}>
        {title}
      </ThemedText>
      {body ? (
        <ThemedText themeColor="textSecondary" style={styles.center}>
          {body}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

/** Loading, an error with "Try again", or nothing. */
export function QueryState({
  loading,
  error,
  onRetry,
  what = 'this',
}: {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  what?: string;
}) {
  const theme = useTheme();
  if (error)
    return (
      <Notice title={`Couldn’t load ${what}`} body={error.message}>
        <Button title="Try again" kind="secondary" onPress={onRetry} />
      </Notice>
    );
  if (loading) return <ActivityIndicator style={styles.loading} color={theme.textSecondary} />;
  return null;
}

/** A selectable pill. */
export function Chip({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string | null;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.accent : theme.backgroundElement,
          borderColor: selected ? theme.accent : theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <ThemedText type="smallBold" style={{ color: selected ? theme.onAccent : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** Two to five choices in a row. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.backgroundSelected }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" themeColor={on ? 'text' : 'textSecondary'}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A themed text box. */
export function Field({ style, ...rest }: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      style={[
        styles.field,
        {
          color: theme.text,
          borderColor: theme.border,
          backgroundColor: theme.backgroundElement,
        },
        style,
      ]}
      {...rest}
    />
  );
}

/** A thin bar from 0 to 100. */
export function ProgressBar({ percent, color }: { percent: number; color?: string | null }) {
  const theme = useTheme();
  const width = `${Math.max(0, Math.min(100, Math.round(percent)))}%` as const;
  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <View style={[styles.fillBar, { width, backgroundColor: color || theme.success }]} />
    </View>
  );
}

const initials = (name?: string | null) =>
  (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

/** A person's photo, or their initials. */
export function Avatar({
  uri,
  name,
  size = 40,
  online,
}: {
  uri?: string | null;
  name?: string | null;
  size?: number;
  online?: boolean;
}) {
  const theme = useTheme();
  const round = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={round}>
      {uri ? (
        <Image source={{ uri: portalUrl(uri) }} style={round} contentFit="cover" transition={150} />
      ) : (
        <View style={[round, styles.initials, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold" style={{ fontSize: size * 0.36 }}>
            {initials(name)}
          </ThemedText>
        </View>
      )}
      {online ? (
        <View
          style={[
            styles.online,
            { backgroundColor: theme.success, borderColor: theme.background },
          ]}
        />
      ) : null}
    </View>
  );
}

/** A small coloured dot (a project's colour). */
export function Dot({ color, size = 8 }: { color?: string | null; size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color || theme.textSecondary,
      }}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  wide: { maxWidth: WideContentWidth },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  column: { flex: 1, minWidth: 0, gap: Spacing.three },
  card: {
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  button: {
    minHeight: 48,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: Spacing.two + Spacing.one },
  iconButton: { padding: Spacing.one },
  count: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { color: '#fff', fontSize: 11, lineHeight: 14, fontWeight: 700 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
    paddingVertical: Spacing.two + Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: Spacing.half },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.two },
  notice: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  center: { textAlign: 'center' },
  loading: { paddingVertical: Spacing.five },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  segmented: { flexDirection: 'row', borderRadius: Radius.medium, padding: 3 },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.small,
  },
  field: {
    minHeight: 48,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    fontSize: 16,
  },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fillBar: { height: 6, borderRadius: 3 },
  initials: { alignItems: 'center', justifyContent: 'center' },
  online: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
});
