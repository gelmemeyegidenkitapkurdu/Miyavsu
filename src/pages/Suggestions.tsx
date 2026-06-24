import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, X, ExternalLink, Upload, Trash2, Edit, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '../utils/imageCompression';
import { sortByNewest } from '../utils/sortByNewest';
import { CategorySearch } from '../components/ui/CategorySearch';
import { sanitizeExternalUrl } from '../utils/safeUrl';

const PAGE_SIZE = 12;

export const Suggestions = () => {
  const { suggestions, isAdmin, addSuggestion, updateSuggestion, deleteSuggestion, darkMode } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [image, setImage] = useState('');
  const [suggestionViews, setSuggestionViews] = useState('');

  const handleOpenModal = (suggestion?: any) => {
    if (suggestion) {
      setEditingId(suggestion.id);
      setTitle(suggestion.title);
      setGenre(suggestion.genre);
      setAuthor(suggestion.author || '');
      setDescription(suggestion.description);
      setLink(suggestion.link);
      setImage(suggestion.image);
      setSuggestionViews(suggestion.views !== undefined ? String(suggestion.views) : '');
    } else {
      setEditingId(null);
      setTitle('');
      setGenre('');
      setAuthor('');
      setDescription('');
      setLink('');
      setImage('');
      setSuggestionViews('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const sanitizedLink = sanitizeExternalUrl(link);
    if (!sanitizedLink) {
      alert('Lütfen geçerli bir kitap bağlantısı girin (http/https).');
      return;
    }

    const suggestionData = {
      title,
      genre,
      author,
      description,
      link: sanitizedLink,
      image: image || 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=500&h=500&fit=crop',
      views: suggestionViews ? parseInt(suggestionViews, 10) : 0
    };

    if (editingId) {
      updateSuggestion(editingId, suggestionData);
    } else {
      addSuggestion(suggestionData);
    }
    
    setIsModalOpen(false);
    setEditingId(null);
    setTitle(''); setGenre(''); setAuthor(''); setDescription(''); setLink(''); setImage(''); setSuggestionViews('');
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Bu öneriyi silmek istediğinize emin misiniz?')) {
      deleteSuggestion(id);
    }
  };

  const handleEdit = (e: React.MouseEvent, suggestion: any) => {
    e.stopPropagation();
    handleOpenModal(suggestion);
  };

  const [isUploading, setIsUploading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        const compressedBase64 = await compressImage(file, 800, 1200, 0.8);
        setImage(compressedBase64);
      } catch (error) {
        console.error('Image compression failed:', error);
        alert('Resim yüklenirken bir hata oluştu.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  const getSafeSuggestionLink = (suggestion: any) => sanitizeExternalUrl(suggestion?.link);

  const sortedSuggestions = useMemo(() => sortByNewest(suggestions), [suggestions]);
  const filteredSuggestions = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLocaleLowerCase('tr-TR');
    if (!normalizedQuery) return sortedSuggestions;

    return sortedSuggestions.filter((suggestion) =>
      [suggestion.title, suggestion.genre, suggestion.author, suggestion.description]
        .some((field) => String(field || '').toLocaleLowerCase('tr-TR').includes(normalizedQuery))
    );
  }, [searchTerm, sortedSuggestions]);
  const visibleSuggestions = useMemo(() => filteredSuggestions.slice(0, visibleCount), [filteredSuggestions, visibleCount]);
  const hasMore = visibleCount < filteredSuggestions.length;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-purple-700">Öneriler</h2>
        </div>
        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} /> Öneri Ekle
          </button>
        )}
      </div>

      <CategorySearch
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Önerilerde ara..."
        darkMode={darkMode}
      />

      <div className="grid grid-cols-2 gap-6">
        {visibleSuggestions.map((suggestion) => (
          <motion.div
            key={suggestion.id}
            whileHover={{ y: -5 }}
            onClick={() => setSelectedSuggestion(suggestion)}
            className={`rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all flex flex-col relative group cursor-pointer ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
          >
            {isAdmin && (
              <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleEdit(e, suggestion)}
                  className={`p-1.5 rounded-full text-blue-600 shadow-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white/90 hover:bg-blue-50'}`}
                  title="Düzenle"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={(e) => handleDelete(e, suggestion.id)}
                  className={`p-1.5 rounded-full text-red-600 shadow-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white/90 hover:bg-red-50'}`}
                  title="Sil"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            <div className="h-48 overflow-hidden relative">
              <img
                src={suggestion.image}
                alt={suggestion.title}
                className="w-full h-full object-cover"
              />
              <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold text-pink-600 shadow-sm ${darkMode ? 'bg-gray-700/90' : 'bg-white/90'}`}>
                {suggestion.genre}
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col overflow-hidden">
              <h3 className="text-xl font-bold text-gray-800 mb-2 truncate">{suggestion.title}</h3>
              <p className="text-gray-600 text-sm mb-3 flex-1 line-clamp-3 overflow-hidden">{suggestion.description}</p>
              <div className="flex items-center gap-1 mb-3 text-xs text-gray-400">
                <Eye size={14} />
                <span>{suggestion.views || 0}</span>
              </div>
              {getSafeSuggestionLink(suggestion) ? (
                <a
                  href={getSafeSuggestionLink(suggestion)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-green-50 text-green-600 py-2 rounded-lg font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink size={18} /> İncele
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full bg-gray-100 text-gray-400 py-2 rounded-lg font-medium cursor-not-allowed flex items-center justify-center gap-2"
                  title="Geçerli bir kitap linki bulunamadı"
                >
                  <ExternalLink size={18} /> İncele
                </button>
              )}
              {suggestion.created_at && (
                <div className="text-right mt-2 text-xs text-gray-400">
                  {new Date(suggestion.created_at).toLocaleDateString('tr-TR')}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className={`px-6 py-3 rounded-full font-medium shadow-md transition-all hover:scale-105 ${darkMode ? 'bg-purple-700 text-white hover:bg-purple-600' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
          >
            Daha Fazla Göster ({filteredSuggestions.length - visibleCount} kaldı)
          </button>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`rounded-2xl w-full max-w-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
            >
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-xl font-bold text-purple-700">
                  {editingId ? 'Öneriyi Düzenle' : 'Yeni Öneri Ekle'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resim</label>
                  <div className="flex items-center gap-4">
                    {image && <img src={image} alt="Preview" className="h-16 w-16 object-cover rounded" />}
                    <label className="flex-1 cursor-pointer border border-gray-300 rounded-lg p-2 hover:bg-gray-50 flex items-center justify-center gap-2 text-gray-600">
                      <Upload size={18} />
                      <span>Resim Seç</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} className="hidden" />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kitap İsmi</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kitap Türü</label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yazar</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kitap Linki</label>
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="https://..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Görüntülenme Sayısı</label>
                  <input
                    type="number"
                    value={suggestionViews}
                    onChange={(e) => setSuggestionViews(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="flex justify-end gap-4 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    {editingId ? 'Güncelle' : 'Öneriyi Ekle'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedSuggestion && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedSuggestion(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative shrink-0">
                <img
                  src={selectedSuggestion.image}
                  alt={selectedSuggestion.title}
                  className="w-full h-64 object-cover"
                />
                <button 
                  onClick={() => setSelectedSuggestion(null)}
                  className={`absolute top-4 right-4 p-2 rounded-full shadow-md ${darkMode ? 'bg-gray-700/90 hover:bg-gray-600' : 'bg-white/90 hover:bg-white'}`}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="flex items-center gap-2 flex-nowrap">
                  <span className="text-pink-600 font-semibold whitespace-nowrap shrink-0">Kitap Türü:</span>
                  <span className="text-gray-800 break-words overflow-hidden">{selectedSuggestion.genre}</span>
                </div>
                <div className="flex items-start gap-2 flex-nowrap">
                  <span className="text-pink-600 font-semibold whitespace-nowrap shrink-0">Kitap İsmi:</span>
                  <span className="text-gray-800 break-words overflow-hidden">{selectedSuggestion.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-nowrap">
                  <span className="text-pink-600 font-semibold whitespace-nowrap shrink-0">Yazar:</span>
                  <span className="text-gray-800 break-words overflow-hidden">{selectedSuggestion.author}</span>
                </div>
                <div className="flex items-start gap-2 flex-nowrap">
                  <span className="text-pink-600 font-semibold whitespace-nowrap shrink-0">Konusu:</span>
                  <span className="text-gray-800 break-words" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{selectedSuggestion.description}</span>
                </div>
                {getSafeSuggestionLink(selectedSuggestion) ? (
                  <a
                    href={getSafeSuggestionLink(selectedSuggestion)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-pink-600 font-semibold hover:text-pink-700 transition-colors"
                  >
                    <ExternalLink size={18} />
                    Link
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 text-gray-400 font-semibold" title="Geçerli bir kitap linki bulunamadı">
                    <ExternalLink size={18} />
                    Link geçersiz
                  </span>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
