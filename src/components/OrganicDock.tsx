import React, { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { PoleHub } from './PoleHub';
import { poleByKey } from '@/poles/catalog';
import { useNavPrefs } from '@/features/nav/navPrefs';

type Slot =
  | { kind: 'tab'; name: string; icon: keyof typeof Ionicons.glyphMap }
  | { kind: 'hub'; icon: keyof typeof Ionicons.glyphMap };

const HIDE_ON = new Set(['assistant', 'login']);

// Geometry
const H = 60; // bar height
const TOP = 26; // headroom for the active disc
const R = 24; // corner radius
const CR = 22; // active disc radius
const NW = 34; // notch half-width
const ND = 26; // notch depth
const SH = 12; // shoulder smoothing
const GAP = 6; // clearance between notch and corner

export function OrganicDock({ state, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const activeName = state.routes[state.index]?.name;
  const [hubOpen, setHubOpen] = useState(false);
  const navPoles = useNavPrefs((s) => s.poles);

  if (activeName && HIDE_ON.has(activeName)) return null;

  // Accueil · [pôle 1] · hub · [pôle 2] · Objectifs
  const pa = poleByKey(navPoles[0]);
  const pb = poleByKey(navPoles[1]);
  const SLOTS: Slot[] = [
    { kind: 'tab', name: 'home', icon: 'home' },
    { kind: 'tab', name: pa?.name ?? 'work', icon: pa?.icon ?? 'briefcase' },
    { kind: 'hub', icon: 'grid' },
    { kind: 'tab', name: pb?.name ?? 'wellbeing', icon: pb?.icon ?? 'heart' },
    { kind: 'tab', name: 'goals', icon: 'flag' },
  ];

  const W = Math.min(width - 24, 380);
  const TH = TOP + H;

  // Icon centres live in a SAFE inner zone so even edge notches clear the corners.
  const safeMin = R + NW + GAP;
  const safeMax = W - safeMin;
  const spacing = (safeMax - safeMin) / (SLOTS.length - 1);
  const cxOf = (i: number) => safeMin + spacing * i;

  // The notch lands on the matching fixed tab; for any other screen (a pole
  // opened from the hub, etc.) it lands on the central hub button — so the hub
  // reacts exactly like the other tabs.
  const tabIndex = SLOTS.findIndex((s) => s.kind === 'tab' && s.name === activeName);
  const hubIndex = SLOTS.findIndex((s) => s.kind === 'hub');
  // Hub open OR on a non-fixed-tab screen → notch on the central hub button.
  const activeIndex = hubOpen ? hubIndex : tabIndex >= 0 ? tabIndex : hubIndex;
  const notchCx = cxOf(activeIndex);

  const buildPath = (cx: number | null) => {
    const topEdge =
      cx == null
        ? `L ${W - R},${TOP}`
        : `L ${cx - NW},${TOP} ` +
          `C ${cx - NW + SH},${TOP} ${cx - CR - 2},${TOP + ND} ${cx},${TOP + ND} ` +
          `C ${cx + CR + 2},${TOP + ND} ${cx + NW - SH},${TOP} ${cx + NW},${TOP} ` +
          `L ${W - R},${TOP}`;
    return (
      `M ${R},${TOP} ${topEdge} ` +
      `A ${R} ${R} 0 0 1 ${W},${TOP + R} L ${W},${TH - R} ` +
      `A ${R} ${R} 0 0 1 ${W - R},${TH} L ${R},${TH} ` +
      `A ${R} ${R} 0 0 1 0,${TH - R} L 0,${TOP + R} ` +
      `A ${R} ${R} 0 0 1 ${R},${TOP} Z`
    );
  };

  return (
    <>
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 14,
        }}
      >
        <View style={{ width: W, height: TH }}>
          <Svg width={W} height={TH} style={{ position: 'absolute' }}>
            <Path d={buildPath(notchCx)} fill={theme.colors.ink} />
          </Svg>

          {notchCx != null ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: notchCx - CR,
                top: TOP - CR,
                width: CR * 2,
                height: CR * 2,
                borderRadius: CR,
                backgroundColor: theme.colors.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name={(SLOTS[activeIndex] as { icon: keyof typeof Ionicons.glyphMap }).icon}
                size={22}
                color={theme.colors.ink}
              />
            </View>
          ) : null}

          {SLOTS.map((slot, i) =>
            i === activeIndex ? null : (
              <View
                key={`ic-${i}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: cxOf(i) - 16,
                  top: TOP + H / 2 - 16,
                  width: 32,
                  height: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={slot.icon} size={22} color={theme.colors.bg} style={{ opacity: 0.55 }} />
              </View>
            ),
          )}

          {SLOTS.map((slot, i) => {
            const left = i === 0 ? 0 : cxOf(i) - spacing / 2;
            const right = i === SLOTS.length - 1 ? W : cxOf(i) + spacing / 2;
            return (
              <Pressable
                key={slot.kind === 'tab' ? slot.name : `hub-${i}`}
                onPress={() => {
                  if (slot.kind === 'hub') setHubOpen(true);
                  else if (i !== activeIndex) navigation.navigate(slot.name as never);
                }}
                style={{ position: 'absolute', left, top: 0, width: right - left, height: TH }}
              />
            );
          })}
        </View>
      </View>

      <PoleHub visible={hubOpen} onClose={() => setHubOpen(false)} />
    </>
  );
}
