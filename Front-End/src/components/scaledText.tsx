import { Text as NativeText, StyleSheet, TextProps, TextStyle } from "react-native";
import { useFontSize } from "@/contexts/fontSizeContext";

export default function ScaledText({ style, ...props }: TextProps) {
  const { scaleFont } = useFontSize();
  const baseStyle = StyleSheet.flatten(style) as TextStyle | undefined;
  const scaledStyle: TextStyle = {
    fontSize: scaleFont(typeof baseStyle?.fontSize === "number" ? baseStyle.fontSize : 14),
    ...(typeof baseStyle?.lineHeight === "number" ? { lineHeight: scaleFont(baseStyle.lineHeight) } : {}),
  };

  return <NativeText {...props} style={[style, scaledStyle]} />;
}
