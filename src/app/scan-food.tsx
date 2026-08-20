import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategorySelector } from '@/components/inventory/category-selector';
import { LocationSelector } from '@/components/inventory/location-selector';
import { UnitSelector } from '@/components/inventory/unit-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useFoodScan } from '@/hooks/use-food-scan';
import { InventoryCategory, InventoryUnit } from '@/types/inventory';
import { generateUUID } from '@/utils/id';

export default function ScanFoodScreen() {
  const router = useRouter();
  const {
    location,
    photos,
    candidates,
    status,
    error,
    setLocation,
    addPhotos,
    removePhoto,
    analyze,
    updateCandidate,
    toggleCandidate,
    confirm,
  } = useFoodScan();
  const [isPicking, setIsPicking] = useState(false);

  const addPickedAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    addPhotos(
      assets.map((asset) => ({
        id: generateUUID(),
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName,
      }))
    );
  };

  const pickFromLibrary = async () => {
    try {
      setIsPicking(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 6,
        quality: 0.7,
      });
      if (!result.canceled) addPickedAssets(result.assets);
    } catch (pickerError) {
      Alert.alert('Photo selection failed', pickerError instanceof Error ? pickerError.message : 'Unable to select photos');
    } finally {
      setIsPicking(false);
    }
  };

  const takePhoto = async () => {
    try {
      setIsPicking(true);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera permission needed', 'Allow camera access to scan food.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (!result.canceled) addPickedAssets(result.assets);
    } catch (pickerError) {
      Alert.alert('Camera failed', pickerError instanceof Error ? pickerError.message : 'Unable to take a photo');
    } finally {
      setIsPicking(false);
    }
  };

  const handleConfirm = async () => {
    const completed = await confirm();
    if (completed) {
      router.replace({ pathname: '/inventory', params: { message: 'Scanned items added' } });
    }
  };

  const isAnalysing = status === 'analysing' || status === 'confirming';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="title">Scan food</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Add photos, review the suggested items, then choose what to save.
          </ThemedText>

          <LocationSelector value={location} onChange={(value) => value && setLocation(value)} />

          <ThemedView style={styles.actionRow}>
            <Button title="Take photo" onPress={takePhoto} disabled={isPicking || isAnalysing} style={styles.action} />
            <Button title="Choose photos" variant="secondary" onPress={pickFromLibrary} disabled={isPicking || isAnalysing} style={styles.action} />
          </ThemedView>

          {photos.length > 0 && (
            <ThemedView style={styles.photoGrid}>
              {photos.map((photo) => (
                <ThemedView key={photo.id} style={styles.photoCell}>
                  <Image source={{ uri: photo.uri }} style={styles.photo} />
                  <Pressable onPress={() => removePhoto(photo.id)} style={styles.removePhoto}>
                    <ThemedText type="small" style={styles.removePhotoText}>Remove</ThemedText>
                  </Pressable>
                </ThemedView>
              ))}
            </ThemedView>
          )}

          <Button
            title={status === 'review' ? 'Analyse again' : 'Analyse photos'}
            onPress={analyze}
            disabled={photos.length === 0 || isAnalysing}
          />

          {error && <FeedbackBanner message={error} tone="error" />}

          {status === 'review' && (
            <ThemedView style={styles.reviewSection}>
              <ThemedText type="subtitle">Review suggestions</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                These are mock suggestions for the V0.2 workflow. Check every item before saving.
              </ThemedText>
              {candidates.map((candidate) => (
                <ThemedView key={candidate.id} style={styles.candidate}>
                  <ThemedView style={styles.candidateHeader}>
                    <ThemedText type="default" style={styles.confidence}>
                      {Math.round(candidate.confidence * 100)}% confidence
                    </ThemedText>
                    <Pressable onPress={() => toggleCandidate(candidate.id)}>
                      <ThemedText type="small" style={styles.rejectAction}>
                        {candidate.reviewStatus === 'rejected' ? 'Keep' : 'Reject'}
                      </ThemedText>
                    </Pressable>
                  </ThemedView>
                  {candidate.reviewStatus !== 'rejected' ? (
                    <>
                      <Input
                        label="Name"
                        value={candidate.name}
                        onChangeText={(name) => updateCandidate(candidate.id, { name })}
                      />
                      <CategorySelector
                        value={candidate.category}
                        onChange={(category: InventoryCategory) => updateCandidate(candidate.id, { category })}
                      />
                      <Input
                        label="Quantity"
                        value={candidate.quantity?.toString() || ''}
                        keyboardType="decimal-pad"
                        onChangeText={(value) => updateCandidate(candidate.id, { quantity: Number(value) || null })}
                      />
                      <UnitSelector
                        value={candidate.unit}
                        onChange={(unit: InventoryUnit) => updateCandidate(candidate.id, { unit })}
                      />
                    </>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">This suggestion will not be added.</ThemedText>
                  )}
                </ThemedView>
              ))}
              <Button title="Add reviewed items" onPress={handleConfirm} disabled={isAnalysing} />
            </ThemedView>
          )}

          <Pressable onPress={() => router.replace('/inventory')} style={styles.cancelAction}>
            <ThemedText type="small" themeColor="textSecondary">Back to inventory</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === 'web' ? 88 : Spacing.three,
  },
  content: { gap: Spacing.three, paddingBottom: Spacing.six },
  actionRow: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  photoCell: { width: '31%', gap: Spacing.one },
  photo: { width: '100%', aspectRatio: 1, borderRadius: Spacing.two },
  removePhoto: { alignItems: 'center' },
  removePhotoText: { color: '#FF3B30', fontWeight: '600' },
  reviewSection: { gap: Spacing.three },
  candidate: { padding: Spacing.three, borderRadius: Spacing.two, gap: Spacing.two },
  candidateHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  confidence: { fontWeight: '600' },
  rejectAction: { color: '#FF3B30', fontWeight: '600' },
  cancelAction: { alignItems: 'center', paddingVertical: Spacing.two },
});
