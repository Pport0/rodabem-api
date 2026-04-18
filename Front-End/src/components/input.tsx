import Colors from "@/constants/colors";
import { useFontSize } from "@/contexts/fontSizeContext";
import { StyleSheet, TextInput, TextInputProps, useColorScheme, View } from "react-native";

interface InputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  type?: 'text' | 'password';
}

export default function Input({ placeholder, value, onChangeText, type = 'text', ...rest }: InputProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { scaleFont } = useFontSize();

  return (
    <View style={[styles.container, { borderColor: colors.tint, backgroundColor: colors.background }]}>
      <TextInput
        placeholderTextColor={colorScheme === 'dark' ? '#888' : '#aaa'}
        keyboardAppearance={colorScheme}
        style={[styles.input, { color: colors.text, fontSize: scaleFont(16) }]}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={type === 'password'}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
  },
});
