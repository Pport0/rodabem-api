import colors from '@/constants/colors';
import { useAuth } from '@/contexts/authContext';
import { useUser } from '@/hooks/useUser';
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
        <Text style={styles.userName} numberOfLines={1}>
          {user?.nome ?? 'Usuário'}
        </Text>
      </View>

      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={false}
      >
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigate('/perfil')}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Ionicons name="person-outline" size={20} color={primaryColor} />
          </View>
          <Text style={styles.navLabel}>Meu Perfil</Text>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>
      </DrawerContentScrollView>

      <View style={styles.footer}>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.navItem} onPress={logout} activeOpacity={0.7}>
          <View style={[styles.navIcon, styles.navIconDanger]}>
            <Ionicons name="log-out-outline" size={20} color="#E53E3E" />
          </View>
          <Text style={[styles.navLabel, styles.navLabelDanger]}>Sair</Text>
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingTop: 12,
    paddingHorizontal: 12,
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
