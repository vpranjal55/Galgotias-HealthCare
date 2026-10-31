import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, shadow } from '../lib/theme';

const logo = require('../assets/images/galgotias-logo.jpg');

interface Props {
  size?: number;
  showWordmark?: boolean;
  compact?: boolean;
}

export default function LogoMark({ size = 92, showWordmark = true, compact = false }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.ring, shadow.logo, { width: size + 12, height: size + 12, borderRadius: (size + 12) / 2 }]}>
        <Image source={logo} style={{ width: size, height: size, borderRadius: size / 2 }} />
      </View>
      {showWordmark ? (
        <View style={styles.textCol}>
          <Text style={[styles.kicker, compact && styles.kickerSm]}>GALGOTIAS</Text>
          <Text style={[styles.title, compact && styles.titleSm]}>HealthCare</Text>
          {!compact ? <Text style={styles.sub}>Wellness · Mess · Curfew · Care</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  ring: {
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.goldSoft,
  },
  textCol: { alignItems: 'center', marginTop: 12 },
  kicker: {
    letterSpacing: 4,
    fontSize: 11,
    fontWeight: '800',
    color: colors.maroon,
  },
  kickerSm: { fontSize: 9, letterSpacing: 3 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.navy,
    marginTop: 2,
  },
  titleSm: { fontSize: 18 },
  sub: { marginTop: 4, color: colors.muted, fontSize: 13, fontWeight: '500' },
});
