import { Picker } from '@react-native-picker/picker';
import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type FormSelectOption = {
  label: string;
  value: string;
};

type FormSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: FormSelectOption[];
  containerStyle?: StyleProp<ViewStyle>;
};

export default function FormSelect({
  value,
  onValueChange,
  options,
  containerStyle,
}: FormSelectProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {Platform.OS === 'web' ? (
        <select
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          style={styles.webSelect as React.CSSProperties}
        >
          {options.map((option) => (
            <option key={`${option.label}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <Picker selectedValue={value} onValueChange={onValueChange} style={styles.nativePicker}>
          {options.map((option) => (
            <Picker.Item key={`${option.label}-${option.value}`} label={option.label} value={option.value} />
          ))}
        </Picker>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 0,
    width: '100%',
    height: '100%',
  },
  nativePicker: {
    width: '100%',
    minWidth: 0,
    borderWidth: 0,
  },
  webSelect: {
    width: '100%',
    minWidth: 0,
    height: '100%',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: 16,
    paddingLeft: 12,
    paddingRight: 36,
    WebkitAppearance: 'menulist',
    appearance: 'menulist',
    boxSizing: 'border-box',
  },
});