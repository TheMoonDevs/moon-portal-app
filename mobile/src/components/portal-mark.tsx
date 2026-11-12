import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * The portal logo (`portal/public/brand/portal-logo.svg`): a thin ring around
 * a rounded square, drawn with views in the brand's proportions.
 */
export function PortalMark({ size = 48 }: { size?: number }) {
  const theme = useTheme();
  const square = size * 0.338;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: Math.max(1, size * 0.0465),
        borderColor: theme.text,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View
        style={{
          width: square,
          height: square,
          borderRadius: square * 0.088,
          backgroundColor: theme.text,
        }}
      />
    </View>
  );
}
