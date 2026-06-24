import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Save, Upload, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '../utils/imageCompression';
import profilePlaceholder from '../assets/profile-placeholder.jpg';
import headerBg from '../assets/header-bg.jpg';

export const Profile = () => {
  const { adminProfile, updateProfile, darkMode } = useStore();
  const [about, setAbout] = useState(adminProfile.about);
  const [email, setEmail] = useState(adminProfile.email);
  const [instagram, setInstagram] = useState(adminProfile.instagram);
  const [image, setImage] = useState(adminProfile.image);
  const [headerImage, setHeaderImage] = useState(adminProfile.headerImage);
  const [isUploading, setIsUploading] = useState(false);
  const [isHeaderUploading, setIsHeaderUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({ about, email, instagram, image, headerImage });
    alert('Profil bilgileri güncellendi!');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        const compressedBase64 = await compressImage(file, 1200, 1200, 0.8);
        setImage(compressedBase64);
      } catch (error) {
        console.error('Image compression failed:', error);
        alert('Resim yüklenirken bir hata oluştu.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleHeaderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsHeaderUploading(true);
        const compressedBase64 = await compressImage(file, 1800, 900, 0.82);
        setHeaderImage(compressedBase64);
      } catch (error) {
        console.error('Header image compression failed:', error);
        alert('Başlık arka plan resmi yüklenirken bir hata oluştu.');
      } finally {
        setIsHeaderUploading(false);
      }
    }
  };

  return (
    <div className={`max-w-2xl mx-auto p-8 rounded-2xl shadow-xl border transition-colors duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-pink-100'}`}>
      <h2 className={`text-2xl font-bold mb-8 transition-colors duration-300 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Profil Düzenle</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Profil Resmi</label>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-pink-200 shadow-sm shrink-0">
              <img src={image && image !== "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&h=500&fit=crop" ? image : profilePlaceholder} alt="Profile Preview" className="w-full h-full object-cover" />
            </div>
            <label className={`flex-1 cursor-pointer border-2 border-dashed rounded-lg p-4 text-center transition-colors relative ${darkMode ? 'border-gray-600 hover:border-pink-500' : 'border-gray-300 hover:border-pink-500'} ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className={`flex flex-col items-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Upload size={24} className="mb-1" />
                <span className="text-sm">{isUploading ? 'Yükleniyor...' : 'Yeni resim seçmek için tıklayın'}</span>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Başlık Arka Plan Resmi</label>
          <div className="space-y-3">
            <div className="w-full h-40 rounded-xl overflow-hidden border-2 border-pink-200 shadow-sm">
              <img src={headerImage || headerBg} alt="Başlık arka plan önizleme" className="w-full h-full object-cover" />
            </div>
            <label className={`w-full cursor-pointer border-2 border-dashed rounded-lg p-4 text-center transition-colors relative flex items-center justify-center gap-2 ${darkMode ? 'border-gray-600 hover:border-pink-500 text-gray-300' : 'border-gray-300 hover:border-pink-500 text-gray-600'} ${isHeaderUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="file"
                accept="image/*"
                onChange={handleHeaderImageUpload}
                disabled={isHeaderUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <ImageIcon size={20} />
              <span className="text-sm">{isHeaderUploading ? 'Yükleniyor...' : 'Başlık resmi seçmek için tıklayın'}</span>
            </label>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Bu görsel yalnızca GELMEMEYEGİDENKİTAPKURDU yazısının arkasında görünür.
            </p>
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Hakkımda Yazısı</label>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={4}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 outline-none resize-none transition-colors duration-300 ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'border-gray-300'}`}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>İletişim E-posta</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 outline-none transition-colors duration-300 ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'border-gray-300'}`}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Instagram Linki</label>
          <input
            type="url"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 outline-none transition-colors duration-300 ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'border-gray-300'}`}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-pink-500 text-white py-3 rounded-lg hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Save size={20} />
          Değişiklikleri Kaydet
        </button>
      </form>
    </div>
  );
};
