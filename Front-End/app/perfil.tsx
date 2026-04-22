import { Caminhao } from '@/@types/caminhao';
import { InfoRow } from '@/components/infoRow';
import { PlacaBadge } from '@/components/placaBadge';
import colors from '@/constants/colors';
import { useUser } from '@/hooks/useUser';
import { getMeuCaminhao } from '@/services/caminhaoService';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Perfil() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? 'light'].primary;

  const { user } = useUser();
  const { data: caminhao, isLoading } = useQuery<Caminhao | null>({
    queryKey: ['caminhao'],
    queryFn: getMeuCaminhao,
  });

  const initials = user?.nome
    ? user.nome
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <View style={styles.wrapper}>
      <SafeAreaView
        style={[styles.headerSafe, { backgroundColor: primaryColor }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PERFIL</Text>
          <View style={{ width: 30 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View
            style={[styles.avatarCircle, { backgroundColor: primaryColor }]}
          >
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.nome ?? 'Usuario'}</Text>
          <Text style={[styles.userRole, { color: primaryColor }]}>
            MOTORISTA
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>MEUS DADOS</Text>
          <InfoRow label="Nome" value={user?.nome} />
          <View style={styles.separator} />
          <InfoRow label="CPF" value={user?.cpf} />
          <View style={styles.separator} />
          <InfoRow label="Telefone" value={user?.telefone} />
          <View style={styles.separator} />
          <InfoRow label="E-mail" value={user?.email} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>MEU CAMINHAO</Text>
          {isLoading ? (
            <ActivityIndicator
              color={primaryColor}
              style={{ paddingVertical: 20 }}
            />
          ) : caminhao ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Placa</Text>
                <PlacaBadge placa={caminhao.placa} />
              </View>
              <View style={styles.separator} />
              <InfoRow label="Modelo" value={caminhao.modelo} />
              {caminhao.marca && (
                <>
                  <View style={styles.separator} />
                  <InfoRow label="Marca" value={caminhao.marca} />
                </>
              )}
              {caminhao.anoFabricacao && (
                <>
                  <View style={styles.separator} />
                  <InfoRow
                    label="Ano"
                    value={String(caminhao.anoFabricacao)}
                  />
                </>
              )}
              {caminhao.cor && (
                <>
                  <View style={styles.separator} />
                  <InfoRow label="Cor" value={caminhao.cor} />
                </>
              )}
              {caminhao.numeroEixos && (
                <>
                  <View style={styles.separator} />
                  <InfoRow
                    label="Numero de eixos"
                    value={String(caminhao.numeroEixos)}
                  />
                </>
              )}
              <View style={styles.separator} />
              <TouchableOpacity
                style={styles.editTruckLink}
                onPress={() => router.push('/caminhoes/editar' as any)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="create-outline"
                  size={16}
                  color={primaryColor}
                />
                <Text
                  style={[styles.editTruckLinkText, { color: primaryColor }]}
                >
                  Editar caminhão
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.emptyTruck}>
              <Ionicons name="bus-outline" size={40} color="#e0e0e0" />
              <Text style={styles.emptyTruckText}>
                Nenhum caminhao cadastrado
              </Text>
              <TouchableOpacity
                style={[styles.addTruckBtn, { backgroundColor: primaryColor }]}
                onPress={() => router.push('/caminhoes/novo' as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.addTruckBtnText}>Cadastrar Caminhao</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.outlineButton, { borderColor: primaryColor }]}
          activeOpacity={0.85}
        >
          <Text style={[styles.outlineButtonText, { color: primaryColor }]}>
            ALTERAR SENHA
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerSafe: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 4,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    gap: 20,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
  },
  userRole: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardSectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#aaa',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: '#888',
  },
  separator: {
    height: 1,
    backgroundColor: '#f5f5f5',
  },
  editTruckLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    justifyContent: 'flex-end',
  },
  editTruckLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyTruck: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyTruckText: {
    fontSize: 14,
    color: '#aaa',
  },
  addTruckBtn: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  addTruckBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  outlineButton: {
    borderWidth: 1.5,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
