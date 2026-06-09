import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

/** Where a picked image comes from. */
export type PhotoSource = 'library' | 'camera' | 'files';

const DIR = FileSystem.documentDirectory + 'photos/';

async function persist(uri: string, name: string): Promise<string> {
  try {
    await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
    const dest = DIR + `${Date.now()}-${name}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri; // fall back to the original uri
  }
}

/** Pick an image from the chosen source, copy it locally, return its uri (or null). */
export async function pickImage(source: PhotoSource): Promise<string | null> {
  if (source === 'files') {
    const res = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return null;
    return persist(res.assets[0].uri, res.assets[0].name);
  }

  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (res.canceled || !res.assets?.[0]) return null;
    return persist(res.assets[0].uri, res.assets[0].fileName ?? 'photo.jpg');
  }

  // library
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
  if (res.canceled || !res.assets?.[0]) return null;
  return persist(res.assets[0].uri, res.assets[0].fileName ?? 'photo.jpg');
}
