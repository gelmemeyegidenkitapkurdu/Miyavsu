import { useState } from 'react';
import { useStore } from '../store/useStore';
import { SectionCard } from '../components/SectionCard';
import { RibbonRain } from '../components/ui/RibbonRain';
import { BookOpen, BookMarked, PenTool, MessageCircle, Mic, Bell, Plus, X, Trash2, Edit, Eye, User, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '../utils/imageCompression';
import { sortByNewest } from '../utils/sortByNewest';
import profilePlaceholder from '../assets/profile-placeholder.jpg';
import { Link } from 'react-router-dom';
import { sanitizeExternalUrl, sanitizeMailtoUrl } from '../utils/safeUrl';

export const Home = () => {
  const { adminProfile, announcements, isAdmin, addAnnouncement, updateAnnouncement, deleteAnnouncement, darkMode, toggleDarkMode } = useStore();
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Announcement Form
  const [annTitle, setAnnTitle] = useState('');
  const [annAuthor, setAnnAuthor] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annImage, setAnnImage] = useState('');
  const [annViews, setAnnViews] = useState('');

  const instagramUrl = sanitizeExternalUrl(adminProfile.instagram);
  const contactMailUrl = sanitizeMailtoUrl(adminProfile.email);

  const handleOpenModal = (ann?: any) => {
    if (ann) {
      setEditingId(ann.id);
      setAnnTitle(ann.title);
      setAnnAuthor(ann.author);
      setAnnContent(ann.content);
      setAnnImage(ann.image);
      setAnnViews(ann.views !== undefined ? String(ann.views) : '');
    } else {
      setEditingId(null);
      setAnnTitle('');
      setAnnAuthor('');
      setAnnContent('');
      setAnnImage('');
      setAnnViews('');
    }
    setIsAnnouncementModalOpen(true);
  };

  const handleAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      title: annTitle,
      author: annAuthor,
      content: annContent,
      image: annImage || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=500&h=500&fit=crop',
      views: annViews ? parseInt(annViews, 10) : 0
    };

    if (editingId) {
      updateAnnouncement(editingId, data);
    } else {
      addAnnouncement(data);
    }
    
    setIsAnnouncementModalOpen(false);
    setEditingId(null);
    setAnnTitle(''); setAnnAuthor(''); setAnnContent(''); setAnnImage(''); setAnnViews('');
  };

  const handleDeleteAnnouncement = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Bu duyuruyu silmek istediğinize emin misiniz?')) {
      deleteAnnouncement(id);
    }
  };

  const handleEditAnnouncement = (e: React.MouseEvent, ann: any) => {
    e.stopPropagation();
    handleOpenModal(ann);
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        const compressedBase64 = await compressImage(file, 1200, 1200, 0.8);
        setAnnImage(compressedBase64);
      } catch (error) {
        console.error('Image compression failed:', error);
        alert('Resim yüklenirken bir hata oluştu.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const sortedAnnouncements = sortByNewest(announcements);
  const displayedAnnouncements = sortedAnnouncements.slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto relative">
      <RibbonRain />
      
      {/* About Section */}
      <div className={`rounded-3xl p-8 shadow-xl mb-12 flex flex-col md:flex-row items-center gap-8 border-4 border-pink-100 relative z-20 group transition-colors duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {isAdmin && (
          <Link 
            to="/profile" 
            className={`absolute top-4 right-4 p-2 rounded-full text-blue-600 shadow-md opacity-0 group-hover:opacity-100 transition-opacity ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-blue-50'}`}
            title="Profili Düzenle"
          >
            <Edit size={20} />
          </Link>
        )}
        
        <div className="w-48 h-48 shrink-0 rounded-full overflow-hidden border-4 border-pink-200 shadow-inner">
          <img 
            src={adminProfile.image && adminProfile.image !== "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&h=500&fit=crop" ? adminProfile.image : profilePlaceholder} 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl font-bold text-purple-600 mb-4">Hakkımda</h2>
          <p className={`text-lg leading-relaxed mb-6 whitespace-pre-wrap ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {adminProfile.about}
          </p>
          <div className="flex justify-center md:justify-start gap-4">
            {instagramUrl ? (
              <a 
                href={instagramUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full font-medium hover:opacity-90 transition-opacity shadow-md"
              >
                Instagram'da Takip Et
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="bg-gradient-to-r from-purple-300 to-pink-300 text-white px-6 py-2 rounded-full font-medium opacity-70 cursor-not-allowed shadow-md"
                title="Geçerli bir Instagram bağlantısı bulunamadı"
              >
                Instagram'da Takip Et
              </button>
            )}

            {contactMailUrl ? (
              <a 
                href={contactMailUrl}
                className={`px-6 py-2 rounded-full font-medium transition-colors ${darkMode ? 'bg-pink-900/50 text-pink-300 border-2 border-pink-500 hover:bg-pink-800/50' : 'bg-white text-pink-500 border-2 border-pink-500 hover:bg-pink-50'}`}
              >
                İletişime Geç
              </a>
            ) : (
              <button
                type="button"
                disabled
                className={`px-6 py-2 rounded-full font-medium border-2 opacity-70 cursor-not-allowed ${darkMode ? 'bg-pink-900/30 text-pink-300 border-pink-500' : 'bg-white text-pink-400 border-pink-300'}`}
                title="Geçerli bir e-posta adresi bulunamadı"
              >
                İletişime Geç
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sections List */}
      <div className="flex flex-col gap-6 relative z-20">
        {/* Dark Mode Toggle Button */}
        <div className="flex justify-center mb-2">
          <button
            onClick={toggleDarkMode}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium shadow-md transition-all duration-300 hover:scale-105 ${
              darkMode
                ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600 border border-gray-600'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            {darkMode ? 'Aydınlık Mod' : 'Karanlık Mod'}
          </button>
        </div>
        <SectionCard
          title="Yazılar"
          description="Kitap incelemeleri, düşünceler ve daha fazlası."
          icon={PenTool}
          to="/writings"
          color="border-purple-200 hover:border-purple-400"
        />
        <SectionCard
          title="Anketler"
          description="Sizce hangisi? Oylara katılın."
          icon={MessageCircle}
          to="/polls"
          color="border-blue-200 hover:border-blue-400"
        />
        <SectionCard
          title="Öneriler"
          description="Okumanız gereken kitap önerileri."
          icon={BookMarked}
          to="/suggestions"
          color="border-green-200 hover:border-green-400"
        />
        <SectionCard
          title="Röportajlar"
          description="Yazarlar ve okurlarla keyifli sohbetler."
          icon={Mic}
          to="/interviews"
          color="border-pink-200 hover:border-pink-400"
        />
        <SectionCard
          title="Dergiler"
          description="Aylık özetler ve daha fazlası."
          icon={BookOpen}
          to="/books"
          color="border-yellow-200 hover:border-yellow-400"
        />
      </div>

      {/* Announcements Section */}
      <div className="mt-12 relative z-20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-purple-600 flex items-center gap-2">
            <Bell className="text-purple-600" /> Duyurular
          </h2>
          {isAdmin && (
            <button
              onClick={() => handleOpenModal()}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
            >
              <Plus size={20} /> Duyuru Ekle
            </button>
          )}
        </div>

        <div className="space-y-4">
          {displayedAnnouncements.map((ann) => (
            <motion.div
              key={ann.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 rounded-xl shadow-md border-l-4 border-purple-500 hover:shadow-lg transition-shadow cursor-pointer relative group ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
              onClick={() => setSelectedAnnouncement(ann)}
            >
              {isAdmin && (
                <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleEditAnnouncement(e, ann)}
                    className={`p-2 rounded-full text-blue-600 shadow-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-blue-50'}`}
                    title="Düzenle"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteAnnouncement(e, ann.id)}
                    className={`p-2 rounded-full text-red-600 shadow-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-red-50'}`}
                    title="Sil"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}

              <div className="flex gap-4">
                <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden">
                  <img src={ann.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-purple-700 mb-1 break-words">{ann.title}</h3>
                  <div className="text-sm text-gray-500 mb-2">
                    <span>{ann.author}</span> • <span>{ann.date}</span>
                  </div>
                  <p className="text-gray-600 line-clamp-2 break-words" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{ann.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Eye size={14} />
                      <span>{ann.views || 0}</span>
                    </div>
                    <div className="text-xs text-gray-400 font-medium">
                      {new Date(ann.date).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
              </div>
            </div>
          </motion.div>
          ))}
          
          {announcements.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
              Henüz duyuru yok.
            </div>
          )}

          {!showAllAnnouncements && announcements.length > 3 && (
            <button
              onClick={() => setShowAllAnnouncements(true)}
              className="w-full py-3 text-purple-600 font-medium hover:bg-purple-50 rounded-lg transition-colors"
            >
              Tüm Duyuruları Gör ({announcements.length})
            </button>
          )}
        </div>
      </div>

      {/* All Announcements Modal */}
      <AnimatePresence>
        
      {/* Selected Announcement Modal */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-screen h-screen flex flex-col relative shadow-2xl p-8 md:p-12 overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-white'}`}
            >
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className={`fixed top-4 right-4 p-3 backdrop-blur rounded-full z-50 shadow-md ${darkMode ? 'bg-gray-700/80 hover:bg-gray-600' : 'bg-white/80 hover:bg-gray-100'}`}
              >
                <X size={24} />
              </button>

              <div className="flex items-start gap-6 mt-4">
                {selectedAnnouncement.image && (
                  <img
                    src={selectedAnnouncement.image}
                    alt=""
                    className="w-32 h-32 object-cover rounded-lg shrink-0"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-purple-700 mb-2">{selectedAnnouncement.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <User size={14} />
                    <span>{selectedAnnouncement.author}</span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap text-lg leading-relaxed break-words" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{selectedAnnouncement.content}</p>
                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Eye size={16} />
                      <span>{selectedAnnouncement.views || 0}</span>
                    </div>
                    <div className="text-sm text-gray-400 font-medium">
                      {new Date(selectedAnnouncement.date).toLocaleDateString('tr-TR')}
                    </div>
                  </div>

                  <div className="flex justify-center mt-10">
                    <button
                      onClick={() => setSelectedAnnouncement(null)}
                      className={`px-8 py-3 rounded-full font-medium shadow-md transition-all hover:scale-105 ${darkMode ? 'bg-purple-700 text-white hover:bg-purple-600' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                    >
                      Listeye Dön
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {showAllAnnouncements && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-screen h-screen flex flex-col relative shadow-2xl p-6 md:p-12 overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-white'}`}
            >
              <button
                onClick={() => setShowAllAnnouncements(false)}
                className={`fixed top-4 right-4 p-3 backdrop-blur rounded-full z-50 shadow-md ${darkMode ? 'bg-gray-700/80 hover:bg-gray-600' : 'bg-white/80 hover:bg-gray-100'}`}
              >
                <X size={24} />
              </button>
              
              <h2 className="text-3xl font-bold text-purple-600 mb-8 flex items-center gap-2">
                <Bell /> Tüm Duyurular
              </h2>

              <div className="space-y-6">
                {sortedAnnouncements.map((ann) => (
                  <div key={ann.id} className={`p-6 rounded-xl border relative group ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    {isAdmin && (
                      <div className="absolute top-4 right-4 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleEditAnnouncement(e, ann)}
                          className={`p-2 rounded-full text-blue-600 shadow-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-blue-50'}`}
                          title="Düzenle"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteAnnouncement(e, ann.id)}
                          className={`p-2 rounded-full text-red-600 shadow-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-red-50'}`}
                          title="Sil"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="w-full md:w-48 h-48 shrink-0 rounded-lg overflow-hidden">
                        <img src={ann.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-2xl font-bold text-purple-700 mb-2 break-words">{ann.title}</h3>
                        <div className="text-sm text-gray-500 mb-4 pb-4 border-b border-gray-200">
                          <span className="font-medium text-gray-700">{ann.author}</span> • {ann.date}
                        </div>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{ann.content}</p>
                        <div className="flex items-center gap-1 mt-3 text-sm text-gray-400">
                          <Eye size={15} />
                          <span>{ann.views || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Announcement Modal */}
      <AnimatePresence>
        {isAnnouncementModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`rounded-2xl w-full max-w-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
            >
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-xl font-bold text-purple-600">
                  {editingId ? 'Duyuruyu Düzenle' : 'Yeni Duyuru Ekle'}
                </h3>
                <button onClick={() => setIsAnnouncementModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAnnouncementSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
                  <input
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yazar</label>
                  <input
                    type="text"
                    value={annAuthor}
                    onChange={(e) => setAnnAuthor(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resim</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {isUploading && <span className="text-sm text-purple-600 mt-2 block">Yükleniyor...</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İçerik</label>
                  <textarea
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Görüntülenme Sayısı</label>
                  <input
                    type="number"
                    value={annViews}
                    onChange={(e) => setAnnViews(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors mt-4"
                >
                  {editingId ? 'Değişiklikleri Kaydet' : 'Duyuru Paylaş'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
