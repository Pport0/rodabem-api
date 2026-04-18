import { useFontSize } from '@/contexts/fontSizeContext';
import { StyleSheet, Text, View } from 'react-native';

export function InfoRow({ label, value }: { label: string; value?: string }) {
  const { scaleFont } = useFontSize();

  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { fontSize: scaleFont(13) }]}>{label}</Text>
      <Text style={[styles.infoValue, { fontSize: scaleFont(14) }]} numberOfLines={1}>
        {value || '-'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    color: '#888',
  },
  infoValue: {
    fontWeight: '500',
    color: '#222',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
});
