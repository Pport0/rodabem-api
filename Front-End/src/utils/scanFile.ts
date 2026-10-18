import { Toast } from "@/shared/ui/molecules/Toast";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

export type ScanSource = "camera" | "document";

export interface ScanFile {
  uri: string;
  name: string;
  type: string;
}

export function resolveMimeType(fileName: string, mimeType?: string | null) {
  if (mimeType) return mimeType;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

export function normalizeFileName(name?: string | null, fallback = "scan.jpg") {
  return name?.trim() || fallback;
}

// Escolha do arquivo para o scan, comum ao cadastro de caminhao e de documento (#50).
// Devolve null quando o usuario cancela ou nega a camera.
export async function pickScanFile(
  source: ScanSource,
  fileNamePrefix: string
): Promise<ScanFile | null> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Toast.show("Permissao de camera negada", {
        type: "error",
        backgroundColor: "#E53E3E",
      });
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.length) return null;
    const asset = result.assets[0];
    const name = normalizeFileName(asset.fileName, `${fileNamePrefix}-${Date.now()}.jpg`);
    return { uri: asset.uri, name, type: resolveMimeType(name, asset.mimeType) };
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const name = normalizeFileName(asset.name, `${fileNamePrefix}-${Date.now()}`);
  return { uri: asset.uri, name, type: resolveMimeType(name, asset.mimeType) };
}
