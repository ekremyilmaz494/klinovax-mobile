import { Tabs } from 'expo-router'
import { IconSymbol } from '@/components/ui/icon-symbol'

const PRIMARY = '#0d9668'

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        tabBarActiveTintColor: PRIMARY,
        headerShown: true,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Anasayfa',
          tabBarIcon: ({ color, size }) => <IconSymbol size={size} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="trainings"
        options={{
          title: 'Eğitimlerim',
          tabBarIcon: ({ color, size }) => <IconSymbol size={size} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="certificates"
        options={{
          title: 'Sertifikalar',
          tabBarIcon: ({ color, size }) => <IconSymbol size={size} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <IconSymbol size={size} name="house.fill" color={color} />,
        }}
      />
    </Tabs>
  )
}
