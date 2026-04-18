import { useFontSize } from '@/contexts/fontSizeContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ActionCardProps {
  title: string;
  subtitle: string;
  iconName: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  onPress: () => void;
}

export function ActionCard({
  title,
  subtitle,
  iconName,
  backgroundColor,
  onPress,
}: ActionCardProps) {
  const { scaleFont } = useFontSize();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { fontSize: scaleFont(18) }]}>
          {title}
        </Text>
        <Text
          style={[
            styles.cardSubtitle,
            { fontSize: scaleFont(13), lineHeight: scaleFont(18) },
          ]}
        >
          {subtitle}
        </Text>
      </View>
      <View style={styles.cardIconBox}>
        <Ionicons
          name={iconName}
          size={scaleFont(32)}
          color="rgba(255,255,255,0.85)"
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 24,
    minHeight: 104,
  },
  cardContent: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.75)',
  },
  cardIconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});
