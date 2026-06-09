import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Sheet, PrimaryButton } from './ListUI';
import { WheelPicker } from './WheelPicker';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/**
 * Controlled date+time fields (mini-calendar + hour/minute wheels), themed.
 * Embeddable anywhere — no modal of its own. `withDate=false` → time only.
 */
export function DateTimeFields({
  value,
  onChange,
  withDate = true,
  collapsible = false,
}: {
  value: Date;
  onChange: (date: Date) => void;
  withDate?: boolean;
  /** Show a compact summary that expands the picker on tap. */
  collapsible?: boolean;
}) {
  const { theme } = useTheme();
  const palette = theme.poleColors.planning;
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [open, setOpen] = useState(!collapsible);

  const first = new Date(viewYear, viewMonth, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const selectedKey = keyOf(value);

  const shift = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };
  const pickDay = (d: number) => onChange(new Date(viewYear, viewMonth, d, value.getHours(), value.getMinutes()));
  const pickHour = (h: number) => onChange(new Date(value.getFullYear(), value.getMonth(), value.getDate(), h, value.getMinutes()));
  const pickMinute = (m: number) => onChange(new Date(value.getFullYear(), value.getMonth(), value.getDate(), value.getHours(), m));

  const summary = withDate
    ? `${value.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · ${value.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    : value.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (collapsible && !open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          paddingHorizontal: 16,
          paddingVertical: 13,
        }}
      >
        <Ionicons name={withDate ? 'calendar-outline' : 'time-outline'} size={18} color={palette.solid} />
        <Text variant="body" style={{ flex: 1, textTransform: 'capitalize' }}>
          {summary}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.colors.muted} />
      </Pressable>
    );
  }

  return (
    <View>
      {collapsible ? (
        <Pressable onPress={() => setOpen(false)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing(2) }}>
          <Ionicons name="chevron-up" size={18} color={theme.colors.muted} />
          <Text variant="label" color={theme.colors.inkSoft} style={{ flex: 1, textTransform: 'capitalize' }}>
            {summary}
          </Text>
        </Pressable>
      ) : null}
      {withDate ? (
        <View style={{ marginBottom: theme.spacing(2) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Pressable onPress={() => shift(-1)} hitSlop={10} style={navBtn(theme)}>
              <Ionicons name="chevron-back" size={16} color={theme.colors.ink} />
            </Pressable>
            <Text variant="label" style={{ flex: 1, textAlign: 'center', textTransform: 'capitalize' }}>
              {first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </Text>
            <Pressable onPress={() => shift(1)} hitSlop={10} style={navBtn(theme)}>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.ink} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row' }}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} variant="caption" color={theme.colors.muted} style={{ flex: 1, textAlign: 'center' }}>
                {d}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
            {cells.map((d, i) => {
              if (d == null) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
              const isSel = keyOf(new Date(viewYear, viewMonth, d)) === selectedKey;
              return (
                <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
                  <Pressable
                    onPress={() => pickDay(d)}
                    style={{
                      flex: 1,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSel ? palette.solid : 'transparent',
                    }}
                  >
                    <Text variant="label" color={isSel ? palette.on : theme.colors.ink}>
                      {d}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <WheelPicker values={HOURS} index={value.getHours()} onChange={pickHour} />
        <Text variant="title" color={theme.colors.muted}>
          :
        </Text>
        <WheelPicker values={MINUTES} index={value.getMinutes()} onChange={pickMinute} />
      </View>
    </View>
  );
}

/** Standalone modal version (fields + Valider). */
export function DateTimePicker({
  visible,
  initial,
  withDate = true,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  initial: Date;
  withDate?: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
}) {
  const [value, setValue] = useState(initial);
  // reset when reopened
  React.useEffect(() => {
    if (visible) setValue(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Date et heure">
      <DateTimeFields value={value} onChange={setValue} withDate={withDate} />
      <PrimaryButton label="Valider" onPress={() => onConfirm(value)} />
    </Sheet>
  );
}

const navBtn = (t: ReturnType<typeof useTheme>['theme']) => ({
  width: 32,
  height: 32,
  borderRadius: t.radius.pill,
  borderWidth: 1,
  borderColor: t.colors.border,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
});
