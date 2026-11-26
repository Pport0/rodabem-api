import ScaledText from '@/components/scaledText';
import colors from '@/constants/colors';
import { useAuth } from '@/contexts/authContext';
import { useFontSize } from '@/contexts/fontSizeContext';
import { useUser } from '@/hooks/useUser';
import { getInitials } from '@/shared/ui/base/avatar/initials';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

export default function DrawerContent(props: DrawerContentComponentProps) {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? 'light'].primary;

  const { user } = useUser();
  const { logout } = useAuth();
  const { fontLevel, canDecrease, canIncrease, decreaseFontLevel, increaseFontLevel } = useFontSize();

  const navigate = (path: string) => {
    props.navigation.closeDrawer();
    setTimeout(() => router.push(path as any), 50);
  };

  const initials = getInitials(user?.nome);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: primaryColor }]}>
        <View style={styles.avatarCircle}>
          <ScaledText style={styles.avatarInitials}>{initials}</ScaledText>
        </View>
        <ScaledText style={styles.userName} numberOfLines={1}>
          {user?.nome ?? 'Usuário'}
        </ScaledText>
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
          <ScaledText style={styles.navLabel}>Abastecimentos</ScaledText>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>

        <View style={styles.fontControls}>
          <ScaledText style={styles.fontControlsTitle}>TAMANHO DO TEXTO</ScaledText>
          <View style={styles.fontControlsRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Diminuir tamanho do texto"
              accessibilityState={{ disabled: !canDecrease }}
              disabled={!canDecrease}
              onPress={decreaseFontLevel}
              style={[styles.fontButton, !canDecrease && styles.fontButtonDisabled]}
              activeOpacity={0.8}
            >
              <ScaledText style={styles.fontButtonText}>A-</ScaledText>
            </TouchableOpacity>
            <ScaledText accessibilityLabel="Nível do tamanho do texto" style={styles.fontLevel}>
              {fontLevel === 1 ? "92%" : fontLevel === 2 ? "100%" : "112%"}
            </ScaledText>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Aumentar tamanho do texto"
              accessibilityState={{ disabled: !canIncrease }}
              disabled={!canIncrease}
              onPress={increaseFontLevel}
              style={[styles.fontButton, !canIncrease && styles.fontButtonDisabled]}
              activeOpacity={0.8}
            >
              <ScaledText style={styles.fontButtonText}>A+</ScaledText>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigate('/frete')}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Ionicons name="trail-sign-outline" size={20} color={primaryColor} />
          </View>
          <ScaledText style={styles.navLabel}>Calculadora de Frete</ScaledText>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigate('/financeiro')}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Ionicons name="wallet-outline" size={20} color={primaryColor} />
          </View>
          <ScaledText style={styles.navLabel}>Financeiro</ScaledText>
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
          <ScaledText style={styles.navLabel}>Meu Perfil</ScaledText>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>
      </DrawerContentScrollView>

      <View style={styles.footer}>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.navItem} onPress={logout} activeOpacity={0.7}>
          <View style={[styles.navIcon, styles.navIconDanger]}>
            <Ionicons name="log-out-outline" size={20} color="#E53E3E" />
          </View>
          <ScaledText style={[styles.navLabel, styles.navLabelDanger]}>Sair</ScaledText>
        </TouchableOpacity>
        <ScaledText style={styles.version}>RodaBem App v.0.1.0</ScaledText>
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 20,
    gap: 8,
  },
  fontControls: { marginHorizontal: 12, marginTop: 8, marginBottom: 8, padding: 12, gap: 8, borderRadius: 12, backgroundColor: '#f7f7f7' },
  fontControlsTitle: { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
  fontControlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  fontButton: { minWidth: 68, height: 44, borderRadius: 10, backgroundColor: '#2f2f2f', alignItems: 'center', justifyContent: 'center' },
  fontButtonDisabled: { opacity: 0.38 },
  fontButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  fontLevel: { color: '#3f4a57', fontSize: 15, fontWeight: '700' },
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
    fontSize: 15,
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
