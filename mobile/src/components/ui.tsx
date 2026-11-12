import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  View,
  type ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A scrolling screen body with the app's padding and width. Screens without
 * a header (the tabs) keep clear of the status bar with `edgeTop`.
 */
export function Screen({
  children,
  contentContainerStyle,
  edgeTop = true,
  ...rest
}: ScrollViewProps & { edgeTop?: boolean }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.screen,
        { paddingTop: (edgeTop ? insets.top : 0) + Spacing.three },
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

type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  kind?: 'primary' | 'secondary' | 'danger';
  busy?: boolean;
  icon?: ReactNode;
};

export function Button({ title, kind = 'primary', busy, disabled, icon, style, ...rest }: ButtonProps) {
  const theme = useTheme();
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      style={(state) => [
        styles.button,
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

/** A row in a settings-style list. */
export function Row({
  title,
  detail,
  onPress,
  right,
}: {
  title: string;
  detail?: string | null;
  onPress?: () => void;
  right?: ReactNode;
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
      <View style={styles.rowText}>
        <ThemedText>{title}</ThemedText>
        {detail ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {detail}
          </ThemedText>
        ) : null}
      </View>
      {right}
    </Pressable>
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

const styles = StyleSheet.create({
  screen: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: Spacing.half },
  notice: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  center: { textAlign: 'center' },
});
