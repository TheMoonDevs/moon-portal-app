import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** The portal logo (a ring around a square), drawn with views. */
export function PortalMark({ size = 48 }: { size?: number }) {
  const theme = useTheme();
  const unit = size / 14;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: unit * 2,
        borderColor: theme.text,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View
        style={{
          width: unit * 4,
          height: unit * 4,
          borderRadius: unit * 0.5,
          backgroundColor: theme.text,
        }}
      />
    </View>
  );
}
