import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { KadaiColors, KadaiRadius } from '../constants/kadai-theme';

type Props = { label?: string; status?: string; busy?: boolean };

export default function AIStatusStrip({
  label = 'KadaiAI Assistant',
  status = 'Ready',
  busy = false,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <View style={styles.iconBox}>
          <Ionicons name="sparkles" size={16} color={KadaiColors.primary} />
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.statusWrap}>
        <View style={[styles.dot, busy && styles.dotBusy]} />
        <Text style={styles.status}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 42,
    borderRadius: KadaiRadius.medium,
    borderWidth: 1,
    borderColor: '#CFE7D5',
    backgroundColor: KadaiColors.mintSoft,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  iconBox: {
    width: 28, height: 28, borderRadius: 9, backgroundColor: '#D7F4DF',
    alignItems: 'center', justifyContent: 'center',
  },
  label: { color: KadaiColors.primary, fontSize: 13, fontWeight: '800', flexShrink: 1 },
  statusWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: KadaiColors.green },
  dotBusy: { backgroundColor: KadaiColors.amber },
  status: { color: KadaiColors.text2, fontSize: 12, fontWeight: '700' },
});
