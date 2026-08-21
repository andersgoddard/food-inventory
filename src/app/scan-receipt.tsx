import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { useReceiptScan } from '@/hooks/use-receipt-scan';
import { shoppingService } from '@/services';
import { InventoryCategory, InventoryUnit } from '@/types/inventory';
import { generateUUID } from '@/utils/id';
import { resizeImageForUpload } from '@/utils/image';

export default function ScanReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ shoppingListId?: string; shoppingItemId?: string }>();
  const {
    photos,
    location,
    receipt,
    lines,
    status,
    error,
    setLocation,
    addPhotos,
    removePhoto,
    analyze,
    updateReceipt,
    updateLine,
    toggleLine,
    confirm,
  } = useReceiptScan();
  const [isPicking, setIsPicking] = useState(false);

  const addPickedAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    // Receipts need more resolution than food photos to keep line-item text legible.
    const resized = await Promise.all(
      assets.map(async (asset) => {
        const image = await resizeImageForUpload(asset, { maxDimension: 2000, compress: 0.8 });
        return {
          id: generateUUID(),
          uri: image.uri,
          width: image.width,
          height: image.height,
          fileName: asset.fileName,
        };
      })
    );
    addPhotos(resized);
  };

  const pickReceipt = async () => {
    try {
      setIsPicking(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 4,
        quality: 0.7,
      });
      if (!result.canceled) await addPickedAssets(result.assets);
    } catch (pickerError) {
      Alert.alert('Photo selection failed', pickerError instanceof Error ? pickerError.message : 'Unable to select receipt photos');
    } finally {
      setIsPicking(false);
    }
  };

  const takeReceiptPhoto = async () => {
    try {
      setIsPicking(true);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera permission needed', 'Allow camera access to scan a receipt.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (!result.canceled) await addPickedAssets(result.assets);
    } catch (pickerError) {
      Alert.alert('Camera failed', pickerError instanceof Error ? pickerError.message : 'Unable to take a receipt photo');
    } finally {
      setIsPicking(false);
    }
  };

  const handleConfirm = async () => {
    const completed = await confirm();
    if (completed) {
      if (params.shoppingListId && params.shoppingItemId) {
        await shoppingService.confirmItemPurchased(params.shoppingListId, params.shoppingItemId);
        router.replace({ pathname: '/shopping', params: { shoppingListId: params.shoppingListId, message: 'Receipt items added to inventory' } });
        return;
      }
      router.replace({ pathname: '/inventory', params: { message: 'Receipt items added' } });
    }
  };

  const extractedTotal = lines.reduce((total, line) => total + (line.lineTotal || 0), 0);
  const totalMatches = receipt?.total === null || receipt?.total === undefined
    ? true
    : Math.abs(extractedTotal - receipt.total) < 0.01;
  const isBusy = status === 'extracting' || status === 'confirming';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="title">Scan receipt</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Capture a receipt, check the extracted lines, then choose what to add.
          </ThemedText>

          <LocationSelector value={location} onChange={(value) => value && setLocation(value)} />

          <ThemedView style={styles.actionRow}>
            <Button title="Take photo" onPress={takeReceiptPhoto} disabled={isPicking || isBusy} style={styles.action} />
            <Button title="Choose pages" variant="secondary" onPress={pickReceipt} disabled={isPicking || isBusy} style={styles.action} />
          </ThemedView>

          {photos.length > 0 && (
            <ThemedView style={styles.photoGrid}>
              {photos.map((photo) => (
                <ThemedView key={photo.id} style={styles.photoCell}>
                  <Image source={{ uri: photo.uri }} style={styles.photo} />
                  <Pressable onPress={() => removePhoto(photo.id)}>
                    <ThemedText type="small" style={styles.removeText}>Remove page</ThemedText>
                  </Pressable>
                </ThemedView>
              ))}
            </ThemedView>
          )}

          <Button title={isBusy ? 'Extracting receipt...' : 'Extract receipt'} onPress={() => void analyze()} disabled={photos.length === 0 || isBusy} />
          {error && <FeedbackBanner message={error} tone="error" />}

          {status === 'review' && receipt && (
            <ThemedView style={styles.reviewSection}>
              <ThemedText type="subtitle">Review receipt</ThemedText>
              <Input label="Merchant" value={receipt.merchantName || ''} onChangeText={(merchantName) => updateReceipt({ merchantName })} />
              <Input label="Purchase date" value={receipt.purchaseDate || ''} onChangeText={(purchaseDate) => updateReceipt({ purchaseDate })} />
              <Input label="Total" value={receipt.total?.toString() || ''} keyboardType="decimal-pad" onChangeText={(value) => updateReceipt({ total: Number(value) || null })} />
              <ThemedText type="small" style={totalMatches ? styles.match : styles.mismatch}>
                Extracted lines: {extractedTotal.toFixed(2)} {totalMatches ? '(matches total)' : '(check line totals)'}
              </ThemedText>

              <ThemedText type="subtitle">Review items</ThemedText>
              {lines.map((line) => (
                <ThemedView key={line.id} style={styles.lineCard}>
                  <ThemedView style={styles.lineHeader}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {Math.round(line.confidence * 100)}% confidence
                    </ThemedText>
                    <Pressable onPress={() => toggleLine(line.id)}>
                      <ThemedText type="small" style={styles.rejectText}>
                        {line.reviewStatus === 'rejected' ? 'Keep' : 'Skip'}
                      </ThemedText>
                    </Pressable>
                  </ThemedView>
                  {line.reviewStatus !== 'rejected' ? (
                    <>
                      <Input label="Product" value={line.normalizedName} onChangeText={(normalizedName) => updateLine(line.id, { normalizedName })} />
                      <CategorySelector value={line.category} onChange={(category: InventoryCategory) => updateLine(line.id, { category })} />
                      <ThemedView style={styles.quantityRow}>
                        <ThemedView style={styles.quantityField}>
                          <Input label="Quantity" value={line.quantity?.toString() || ''} keyboardType="decimal-pad" onChangeText={(value) => updateLine(line.id, { quantity: Number(value) || null })} />
                        </ThemedView>
                        <ThemedView style={styles.quantityField}>
                          <UnitSelector value={line.unit} onChange={(unit: InventoryUnit) => updateLine(line.id, { unit })} />
                        </ThemedView>
                      </ThemedView>
                      <Input label="Line total" value={line.lineTotal?.toString() || ''} keyboardType="decimal-pad" onChangeText={(value) => updateLine(line.id, { lineTotal: Number(value) || null })} />
                    </>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">This line will not be added.</ThemedText>
                  )}
                </ThemedView>
              ))}
              <Button title="Add receipt items" onPress={handleConfirm} disabled={isBusy} />
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
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Platform.OS === 'web' ? 88 : Spacing.three },
  content: { gap: Spacing.three, paddingBottom: Spacing.six },
  actionRow: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  photoCell: { width: '23%', gap: Spacing.one },
  photo: { width: '100%', aspectRatio: 0.7, borderRadius: Spacing.two },
  removeText: { color: '#FF3B30', textAlign: 'center' },
  reviewSection: { gap: Spacing.three },
  lineCard: { padding: Spacing.three, borderRadius: Spacing.two, gap: Spacing.two },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  rejectText: { color: '#FF3B30', fontWeight: '600' },
  quantityRow: { flexDirection: 'row', gap: Spacing.two },
  quantityField: { flex: 1 },
  match: { color: '#238636', fontWeight: '600' },
  mismatch: { color: '#FF9500', fontWeight: '600' },
  cancelAction: { alignItems: 'center', paddingVertical: Spacing.two },
});
