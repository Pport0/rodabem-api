import { useFontSize } from '@/contexts/fontSizeContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface DateFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  error?: string;
}

function formatDateBR(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('pt-BR');
}

export function DateField({ label, value, onChange, error }: DateFieldProps) {
  const [show, setShow] = useState(false);
  const { scaleFont } = useFontSize();

  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, { fontSize: scaleFont(13) }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.dateInput, error ? styles.dateInputError : null]}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dateInputText,
            { fontSize: scaleFont(15) },
            !value && styles.dateInputPlaceholder,
          ]}
        >
          {value ? formatDateBR(value) : 'DD/MM/AAAA'}
        </Text>
        <Ionicons name="calendar-outline" size={scaleFont(18)} color="#888" />
      </TouchableOpacity>
      {error && (
        <Text style={[styles.errorText, { fontSize: scaleFont(12) }]}>{error}</Text>
      )}
      {show && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_event, selectedDate) => {
            setShow(Platform.OS === 'ios');
            if (selectedDate) onChange(selectedDate);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateInputError: {
    borderColor: '#E53E3E',
  },
  dateInputText: {
    color: '#111',
  },
  dateInputPlaceholder: {
    color: '#aaa',
  },
  label: {
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 0.4,
  },
  fieldContainer: {
    gap: 6,
  },
  errorText: {
    color: '#E53E3E',
  },
});
