import DrawerContent from '@/components/drawerContent';
import HomeHeader from '@/components/homeHeader';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <DrawerContent {...props} />}
        screenOptions={{
          header: () => <HomeHeader />,
          drawerType: 'front',
          drawerStyle: { width: '78%' },
          swipeEnabled: true,
          swipeEdgeWidth: 50,
          overlayColor: 'rgba(0,0,0,0.5)',
        }}
      >
        <Drawer.Screen
          name="home"
          options={{ title: 'Início', drawerLabel: 'Início' }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
