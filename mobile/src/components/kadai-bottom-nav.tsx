import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  KadaiColors,
  KadaiShadow,
} from '../constants/kadai-theme';

type NavItem = {
  label: string;
  route:
    | '/home'
    | '/inventory'
    | '/voice'
    | '/invoice-ai'
    | '/about';
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  center?: boolean;
};

const items: NavItem[] = [
  {
    label: 'Home',
    route: '/home',
    icon: 'home-outline',
    activeIcon: 'home',
  },
  {
    label: 'Inventory',
    route: '/inventory',
    icon: 'cube-outline',
    activeIcon: 'cube',
  },
  {
    label: 'AI',
    route: '/voice',
    icon: 'sparkles-outline',
    activeIcon: 'sparkles',
    center: true,
  },
  {
    label: 'Scan',
    route: '/invoice-ai',
    icon: 'scan-outline',
    activeIcon: 'scan',
  },
  {
    label: 'More',
    route: '/about',
    icon: 'grid-outline',
    activeIcon: 'grid',
  },
];

export default function KadaiBottomNav() {
  const pathname = usePathname();

  return (
    <View style={styles.bar}>
      {items.map((item) => {
        const active =
          pathname === item.route;

        return (
          <Pressable
            key={item.label}
            style={styles.item}
            onPress={() => {
              if (!active) {
                router.replace(item.route);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <View
              style={[
                styles.iconWrap,
                item.center &&
                  styles.centerIconWrap,
                active &&
                  !item.center &&
                  styles.activeIconWrap,
              ]}
            >
              <Ionicons
                name={
                  active
                    ? item.activeIcon
                    : item.icon
                }
                size={
                  item.center ? 24 : 21
                }
                color={
                  item.center
                    ? '#FFFFFF'
                    : active
                      ? KadaiColors.primary
                      : '#7B8D82'
                }
              />
            </View>

            <Text
              style={[
                styles.label,
                active &&
                  styles.activeLabel,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 70,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EEE8',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    ...KadaiShadow,
  },

  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },

  iconWrap: {
    width: 38,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeIconWrap: {
    backgroundColor:
      KadaiColors.mint,
  },

  centerIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 18,
    marginTop: -24,
    backgroundColor:
      KadaiColors.primary,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    ...KadaiShadow,
  },

  label: {
    fontSize: 10.5,
    color: '#718077',
    fontWeight: '700',
  },

  activeLabel: {
    color: KadaiColors.primary,
    fontWeight: '900',
  },
});
