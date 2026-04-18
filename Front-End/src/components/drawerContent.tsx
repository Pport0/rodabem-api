import colors from '@/constants/colors';
import { useAuth } from '@/contexts/authContext';
import { useFontSize } from '@/contexts/fontSizeContext';
import { useUser } from '@/hooks/useUser';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';

export default function DrawerContent(props: DrawerContentComponentProps) {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? 'light'].primary;

  const { user } = useUser();
  const { logout } = useAuth();
  const {
    fontLevel,
    canDecrease,
    canIncrease,
    decreaseFontLevel,
    increaseFontLevel,
    scaleFont,
  } = useFontSize();

  const navigate = (path: string) => {
    props.navigation.closeDrawer();
    setTimeout(() => router.push(path as any), 50);
  };

  const initials = user?.nome
    ? user.nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: primaryColor }]}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
        <Text
          style={[styles.userName, { fontSize: scaleFont(18) }]}
          numberOfLines={1}
        >
          {user?.nome ?? 'Usuario'}
        </Text>
      </View>

      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled
      >
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigate('/abastecimentos')}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Ionicons name="water-outline" size={20} color={primaryColor} />
          </View>
          <Text style={[styles.navLabel, { fontSize: scaleFont(15) }]}>
            Abastecimentos
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigate('/frete')}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Ionicons name="trail-sign-outline" size={20} color={primaryColor} />
          </View>
          <Text style={[styles.navLabel, { fontSize: scaleFont(15) }]}>
            Calculadora de Frete
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigate('/perfil')}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Ionicons name="person-outline" size={20} color={primaryColor} />
          </View>
          <Text style={[styles.navLabel, { fontSize: scaleFont(15) }]}>
            Meu Perfil
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>

        <View style={styles.fontSection}>
          <Text
            style={[styles.fontSectionTitle, { fontSize: scaleFont(14) }]}
          >
            TAMANHO DA FONTE
          </Text>
          <View style={styles.fontControlsRow}>
            <TouchableOpacity
              style={[
                styles.fontButton,
                !canDecrease && styles.fontButtonDisabled,
              ]}
              onPress={decreaseFontLevel}
              disabled={!canDecrease}
              activeOpacity={0.85}
            >
              <Text style={styles.fontButtonSymbol}>-</Text>
            </TouchableOpacity>

            <View style={styles.fontValueBox}>
              <Text style={styles.fontValueText}>{fontLevel}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.fontButton,
                !canIncrease && styles.fontButtonDisabled,
              ]}
              onPress={increaseFontLevel}
              disabled={!canIncrease}
              activeOpacity={0.85}
            >
              <Text style={styles.fontButtonSymbol}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </DrawerContentScrollView>

      <View style={styles.footer}>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.navItem} onPress={logout} activeOpacity={0.7}>
          <View style={[styles.navIcon, styles.navIconDanger]}>
            <Ionicons name="log-out-outline" size={20} color="#E53E3E" />
          </View>
          <Text
            style={[
              styles.navLabel,
              styles.navLabelDanger,
              { fontSize: scaleFont(15) },
            ]}
          >
            Sair
          </Text>
        </TouchableOpacity>
        <Text style={styles.version}>RodaBem App v.0.1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 28,
    gap: 12,
    alignItems: 'flex-start',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  userName: {
    color: '#fff',
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 20,
    gap: 8,
  },
  fontSection: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 10,
  },
  fontSectionTitle: {
    color: '#3f4a57',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  fontControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  fontButton: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: '#2f2f2f',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  fontButtonDisabled: {
    opacity: 0.45,
  },
  fontButtonSymbol: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '600',
    marginTop: -4,
  },
  fontValueBox: {
    flex: 1,
    minWidth: 72,
    maxWidth: 82,
    height: 58,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d9e1ea',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontValueText: {
    color: '#3f4a57',
    fontSize: 24,
    fontWeight: '700',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  navIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fff5ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIconDanger: {
    backgroundColor: '#fef2f2',
  },
  navLabel: {
    flex: 1,
    fontWeight: '500',
    color: '#222',
  },
  navLabelDanger: {
    color: '#E53E3E',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
    marginHorizontal: 12,
  },
  footer: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  version: {
    fontSize: 11,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 12,
  },
});
