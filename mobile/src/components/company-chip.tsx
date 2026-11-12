import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCompany } from '@/lib/company';

/** The company being shown; tap to switch. */
export function CompanyChip() {
  const theme = useTheme();
  const { company, companies } = useCompany();
  if (!company) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Switch company"
      disabled={companies.length < 2}
      onPress={() => router.push('/company')}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <ThemedText type="smallBold" numberOfLines={1}>
        {company.name}
      </ThemedText>
      {companies.length > 1 ? (
        <ThemedText type="small" themeColor="textSecondary">
          ▾
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '100%',
  },
});
