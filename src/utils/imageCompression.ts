export const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      // Kullanıcı talebi üzerine fotoğraf MB/boyut sınırı kaldırıldı.
      // Orijinal base64 verisi hiçbir sıkıştırma veya boyutlandırma yapılmadan döndürülüyor.
      resolve(event.target?.result as string);
    };
    reader.onerror = (error) => reject(error);
  });
};
