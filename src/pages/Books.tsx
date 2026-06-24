import { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../store/useStore';

import { Plus, X, Trash2, Edit, Eye, Download } from 'lucide-react';
import { compressImage } from '../utils/imageCompression';
import { sortByNewest } from '../utils/sortByNewest';
import { sanitizeExternalUrl } from '../utils/safeUrl';

const PAGE_SIZE = 12;

export const Books = () => {
  const { books, isAdmin, addBook, updateBook, deleteBook, fetchBooks, fetchBookPdf, isSessionLoading, darkMode } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [booksLoading, setBooksLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Fetch books on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setBooksLoading(true);
      try { await fetchBooks(); } catch (e) { console.error('[Books] fetch error:', e); }
      if (!cancelled) setBooksLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Re-fetch after session is ready (handles RLS timing)
  useEffect(() => {
    if (!isSessionLoading) {
      fetchBooks().catch(() => {});
    }
  }, [isSessionLoading]);

  // Form State
  const [title, setTitle] = useState('');
  const [issue, setIssue] = useState('');
  const [owner, setOwner] = useState('');
  const [content, setContent] = useState('');
  const [photo, setPhoto] = useState('');
  const [pdfData, setPdfData] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [bookViews, setBookViews] = useState('');
  const [bookDownloads, setBookDownloads] = useState('');
  const [detailPdf, setDetailPdf] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [downloadCountedForCurrentOpen, setDownloadCountedForCurrentOpen] = useState(false);
  const downloadInFlightRef = useRef(false);

  const getPdfFileName = (book: any) => {
    const rawName = String(book?.pdf_name || book?.title || 'dergi').trim();
    const safeName = rawName
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'dergi';

    return safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`;
  };

  const buildStorageDownloadUrl = (pdfUrl: string, fileName: string) => {
    try {
      const url = new URL(pdfUrl);
      url.searchParams.set('download', fileName);
      return url.toString();
    } catch {
      const separator = pdfUrl.includes('?') ? '&' : '?';
      return `${pdfUrl}${separator}download=${encodeURIComponent(fileName)}`;
    }
  };

  const isDataPdfUrl = (value: string) => value.startsWith('data:application/pdf');

  const isIOSDevice = () => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  const triggerAnchorDownload = (url: string, fileName: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.rel = 'noopener noreferrer';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch {
      return false;
    }
  };

  const openPdfInNewTab = (url: string) => {
    try {
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (newWindow) {
        newWindow.opener = null;
      }
      return !!newWindow;
    } catch {
      return false;
    }
  };

  const fetchPdfAsBlobUrl = async (url: string) => {
    try {
      const response = await fetch(url, { method: 'GET', credentials: 'omit', cache: 'no-store' });
      if (!response.ok) return null;

      const blob = await response.blob();
      if (!blob || blob.size === 0) return null;

      const blobType = (blob.type || '').toLowerCase();
      if (blobType && !blobType.includes('pdf')) return null;

      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  };

  const handleOpenModal = async (book?: any) => {
    if (book) {
      setEditingId(book.id);
      setTitle(book.title || '');
      setIssue(book.issue || '');
      setOwner(book.owner || book.participant1 || '');
      setContent(book.content || book.description || '');
      setPhoto(book.photo || book.cover || '');
      setPdfName(book.pdf_name || '');
      setBookViews(book.views !== undefined ? String(book.views) : '');
      setBookDownloads(book.downloads !== undefined ? String(book.downloads) : '');
      // Load PDF reference
      if (!book.pdf) {
        const pdf = await fetchBookPdf(book.id);
        setPdfData(pdf || '');
      } else {
        setPdfData(book.pdf || '');
      }
    } else {
      setEditingId(null);
      setTitle('');
      setIssue('');
      setOwner('');
      setContent('');
      setPhoto('');
      setPdfData('');
      setPdfName('');
      setBookViews('');
      setBookDownloads('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const bookData: any = {
      title,
      issue,
      owner,
      content,
      photo: photo || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&h=500&fit=crop',
      pdf: pdfData,
      pdf_name: pdfName,
    };

    if (isAdmin) {
      bookData.views = bookViews ? parseInt(bookViews, 10) : 0;
      bookData.downloads = bookDownloads ? parseInt(bookDownloads, 10) : 0;
    }

    // Reset form and close modal immediately
    setIsModalOpen(false);
    setEditingId(null);
    setTitle(''); setIssue(''); setOwner(''); setContent('');
    setPhoto(''); setPdfData(''); setPdfName('');
    setBookViews(''); setBookDownloads('');

    // Save in background
    try {
      if (editingId) {
        await updateBook(editingId, bookData);
      } else {
        await addBook(bookData);
      }
      fetchBooks().catch(() => {});
    } catch (error: any) {
      console.error('[Books] save error:', error);
      // Re-open modal on failure so admin can retry
      setIsModalOpen(true);
      alert('Kaydetme başarısız oldu. Lütfen tekrar deneyin.\n\nHata: ' + (error?.message || 'Bilinmeyen hata'));
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Bu dergiyi silmek istediğinize emin misiniz?')) {
      deleteBook(id);
    }
  };

  const handleEdit = (e: React.MouseEvent, book: any) => {
    e.stopPropagation();
    handleOpenModal(book);
  };

  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        const compressedBase64 = await compressImage(file, 1200, 1200, 0.8);
        setPhoto(compressedBase64);
      } catch (error) {
        console.error('Image compression failed:', error);
        alert('Resim yüklenirken bir hata oluştu.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        alert('Lütfen yalnızca PDF dosyası yükleyin.');
        return;
      }

      const maxPdfSizeMb = 50;
      if (file.size > maxPdfSizeMb * 1024 * 1024) {
        alert(`PDF dosyası en fazla ${maxPdfSizeMb} MB olabilir.`);
        return;
      }

      try {
        const signatureBuffer = await file.slice(0, 5).arrayBuffer();
        const signature = new TextDecoder().decode(signatureBuffer);
        if (signature !== '%PDF-') {
          alert('Geçersiz PDF dosyası. Lütfen farklı bir dosya seçin.');
          return;
        }

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = () => {
          setPdfData(reader.result as string);
          if (!pdfName.trim()) {
            setPdfName(file.name.replace(/\.pdf$/i, ''));
          }
          setIsUploading(false);
        };
        reader.onerror = () => {
          alert('PDF yüklenirken bir hata oluştu.');
          setIsUploading(false);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('PDF upload failed:', error);
        alert('PDF yüklenirken bir hata oluştu.');
        setIsUploading(false);
      }
    }
  };

  const handlePdfDownload = async (book: any) => {
    const rawPdfSource = String(detailPdf || book?.pdf || '').trim();
    if (!rawPdfSource || downloadInFlightRef.current || downloadCountedForCurrentOpen) return;

    try {
      downloadInFlightRef.current = true;
      setPdfDownloading(true);

      const fileName = getPdfFileName(book);
      let downloadTriggered = false;

      if (isDataPdfUrl(rawPdfSource)) {
        downloadTriggered = triggerAnchorDownload(rawPdfSource, fileName) || openPdfInNewTab(rawPdfSource);
      } else {
        const safePdfUrl = sanitizeExternalUrl(rawPdfSource);
        if (!safePdfUrl) {
          throw new Error('Unsafe PDF URL blocked');
        }

        const directDownloadUrl = buildStorageDownloadUrl(safePdfUrl, fileName);

        const blobUrl = await fetchPdfAsBlobUrl(directDownloadUrl) || await fetchPdfAsBlobUrl(safePdfUrl);
        if (blobUrl) {
          downloadTriggered = triggerAnchorDownload(blobUrl, fileName) || openPdfInNewTab(blobUrl);
          window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        }

        if (!downloadTriggered) {
          downloadTriggered = triggerAnchorDownload(directDownloadUrl, fileName);
        }

        if (!downloadTriggered || isIOSDevice()) {
          downloadTriggered = openPdfInNewTab(directDownloadUrl)
            || openPdfInNewTab(safePdfUrl)
            || downloadTriggered;
        }
      }

      if (!downloadTriggered) {
        throw new Error('No supported download strategy succeeded');
      }

      if (!downloadCountedForCurrentOpen) {
        const newDownloads = (book.downloads || 0) + 1;
        updateBook(book.id, { downloads: newDownloads }).catch(() => {});
        setDownloadCountedForCurrentOpen(true);
      }
    } catch (error) {
      console.error('[Books] PDF download error:', error);
      alert('PDF indirilemedi. Lütfen tekrar deneyin.');
    } finally {
      setPdfDownloading(false);
      downloadInFlightRef.current = false;
    }
  };

  const sortedBooks = useMemo(() => sortByNewest(books), [books]);
  const visibleBooks = useMemo(() => sortedBooks.slice(0, visibleCount), [sortedBooks, visibleCount]);
  const hasMore = visibleCount < sortedBooks.length;
  const activeBook = books.find(b => b.id === selectedBook);

  const closeBookDetail = () => {
    setSelectedBook(null);
    setDetailPdf(null);
    setDownloadCountedForCurrentOpen(false);
  };

  const loadBookDetail = async (bookId: string) => {
    setSelectedBook(bookId);
    setDetailPdf(null);
    setDownloadCountedForCurrentOpen(false);
    setPdfLoading(true);
    try {
      const pdf = await fetchBookPdf(bookId);
      setDetailPdf(pdf || null);
    } catch (e) {
      console.error('[Books] PDF load error:', e);
      setDetailPdf(null);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-purple-700">Dergiler</h2>
        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} /> Dergi Ekle
          </button>
        )}
      </div>

      {/* Loading State */}
      {booksLoading && books.length === 0 && (
        <div className="text-center py-16">
          <div className={darkMode ? 'text-gray-400' : 'text-gray-500'}></div>
        </div>
      )}

      {/* Grid View - 2 columns */}
      {(!booksLoading || books.length > 0) && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {visibleBooks.map((book, index) => (
          <div
            key={book.id}
            onClick={() => loadBookDetail(book.id)}
            className={`rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer group relative flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
          >
            {/* Admin Controls */}
            {isAdmin && (
              <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleEdit(e, book)}
                  className={`p-1.5 rounded-full text-blue-600 shadow-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white/90 hover:bg-blue-50'}`}
                  title="Düzenle"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={(e) => handleDelete(e, book.id)}
                  className={`p-1.5 rounded-full text-red-600 shadow-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white/90 hover:bg-red-50'}`}
                  title="Sil"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            {/* Cover + Badge */}
            <div className="relative">
              <div className="aspect-[4/3] overflow-hidden rounded-t-xl">
                <img
                  loading={index < 4 ? 'eager' : 'lazy'}
                  fetchPriority={index < 4 ? 'high' : 'auto'}
                  src={book.photo || book.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&h=500&fit=crop'}
                  alt={book.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              {/* Pink badge - Dergi Sayısı */}
              {book.issue && (
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg shadow-md" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.85), rgba(244,114,182,0.85))' }}>
                  <h3 className="font-bold text-sm text-white drop-shadow-sm whitespace-nowrap">
                    {book.issue}
                  </h3>
                </div>
              )}
            </div>

            {/* Content below cover */}
            <div className="px-4 pt-3 pb-3 flex flex-col flex-1">
              {/* Dergi Başlığı - mode-aware */}
              <h3 className={`font-bold text-base leading-tight mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {book.title}
              </h3>

              {/* Hak Sahibi - pembe */}
              {book.owner && (
                <p className="text-xs font-medium mb-2" style={{ color: '#ec4899' }}>
                  {book.owner}
                </p>
              )}

              {/* Content preview */}
              {book.content && (
                <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-3" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {book.content}
                </p>
              )}

              {/* Stats row */}
              <div className="mt-auto pt-2 flex items-end justify-between">
                <div className="flex flex-col items-start gap-0.5 text-xs text-gray-400 mb-3">
                  <div className="flex items-center gap-1">
                    <Eye size={13} />
                    <span>{book.views || 0}</span>
                  </div>
                  {(book.downloads || 0) > 0 && (
                    <div className="flex items-center gap-1">
                      <Download size={13} />
                      <span>{book.downloads}</span>
                    </div>
                  )}
                </div>
                {book.created_at && (
                  <div className="text-xs font-medium" style={{ color: '#f4a7b9' }}>
                    {new Date(book.created_at).toLocaleDateString('tr-TR')}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className={`px-6 py-3 rounded-full font-medium shadow-md transition-all hover:scale-105 ${darkMode ? 'bg-purple-700 text-white hover:bg-purple-600' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
          >
            Daha Fazla Göster ({sortedBooks.length - visibleCount} kaldı)
          </button>
        </div>
      )}

      {/* Reader Detail View - Full Screen */}
      {activeBook && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={closeBookDetail}>
          <div className={`w-full h-full overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
            {/* Sticky Header - Sadece Kapat Butonu */}
            <div className={`sticky top-0 p-4 border-b flex justify-end items-center z-10 w-full ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
              <button
                onClick={closeBookDetail}
                className="p-2 hover:bg-gray-100 rounded-full shrink-0"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 max-w-2xl mx-auto pb-24">
              {/* Dergi Başlığı - Ortada, mode-aware */}
              <div className="mb-5 text-center">
                <h2 className={`text-xl font-bold leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {activeBook.title}
                </h2>
              </div>

              {/* Kapak - Tam Boyut */}
              <div className="w-full rounded-xl overflow-hidden mb-6 shadow-md">
                <img
                  loading="eager"
                  fetchPriority="high"
                  src={activeBook.photo || activeBook.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&h=500&fit=crop'}
                  alt={activeBook.title}
                  className="w-full object-contain"
                />
              </div>

              {/* Hak Sahibi - Pembe başlık */}
              {activeBook.owner && (
                <div className="mb-5">
                  <p className="text-sm font-bold mb-1" style={{ color: '#ec4899' }}>Hak Sahibi</p>
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {activeBook.owner}
                  </p>
                </div>
              )}

              {/* Dergi İçeriği - Pembe başlık */}
              {activeBook.content && (
                <div className="mb-8">
                  <p className="text-sm font-bold mb-2" style={{ color: '#ec4899' }}>Dergi İçeriği</p>
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                    {activeBook.content}
                  </p>
                </div>
              )}

              {/* PDF Download Box */}
              {(detailPdf || activeBook.pdf) && (
                <div className="flex flex-col items-center mt-10 mb-6">
                  <button
                    onClick={() => handlePdfDownload({ ...activeBook, pdf: detailPdf || activeBook.pdf })}
                    disabled={pdfDownloading || downloadCountedForCurrentOpen}
                    className="pdf-download-btn flex items-center gap-3 px-10 py-4 rounded-2xl shadow-lg cursor-pointer w-full max-w-sm justify-center disabled:opacity-70"
                  >
                    <Download size={22} className="text-white" />
                    <span className="font-semibold text-sm text-white">
                      {pdfDownloading ? 'İndiriliyor...' : (downloadCountedForCurrentOpen ? 'Bu açılışta indirildi' : (activeBook.pdf_name || 'PDF İndir'))}
                    </span>
                  </button>
                  {(activeBook.downloads || 0) > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-3">
                      <Download size={12} />
                      <span>{activeBook.downloads} indirme</span>
                    </div>
                  )}
                </div>
              )}
              {pdfLoading && (
                <div className="flex flex-col items-center mt-10 mb-6">
                  <div className="text-sm text-gray-400">PDF hazırlanıyor...</div>
                </div>
              )}

              {!pdfLoading && !detailPdf && !activeBook.pdf && (
                <div className="flex flex-col items-center mt-10 mb-6">
                  <div className="text-sm text-gray-400">Bu dergi için PDF bulunamadı.</div>
                </div>
              )}

              <div className="flex justify-center mt-12 mb-2">
                <button
                  onClick={closeBookDetail}
                  className={`px-8 py-3 rounded-full font-medium shadow-md transition-all hover:scale-105 ${darkMode ? 'bg-purple-700 text-white hover:bg-purple-600' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                >
                  Listeye Dön
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
          >
            <div className="p-6 border-b flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold" style={{ color: '#c084fc' }}>
                {editingId ? 'Dergiyi Düzenle' : 'Yeni Dergi Ekle'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Dergi Başlığı */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#c084fc' }}>
                    Dergi Başlığı
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    style={{ borderColor: '#f4a7b9' }}
                    required
                  />
                </div>

                {/* Dergi Sayısı */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#c084fc' }}>
                    Dergi Sayısı
                  </label>
                  <input
                    type="text"
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    style={{ borderColor: '#f4a7b9' }}
                    placeholder="Örn: Sayı 1, Mart 2025"
                  />
                </div>

                {/* Hak Sahibi */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#c084fc' }}>
                    Hak Sahibi
                  </label>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    style={{ borderColor: '#f4a7b9' }}
                    required
                  />
                </div>

                {/* Dergi İçeriği */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#c084fc' }}>
                    Dergi İçeriği
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                    style={{ borderColor: '#f4a7b9' }}
                    required
                  />
                </div>

                {/* Kapak Fotoğrafı */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#c084fc' }}>
                    Dergi Kapağı
                  </label>
                  <div className="flex items-center gap-4">
                    {photo && (
                      <img src={photo} alt="Kapak" className="h-20 w-20 object-cover rounded-lg" />
                    )}
                    <label className="flex-1 cursor-pointer border-2 border-dashed rounded-lg p-3 hover:bg-gray-50 flex items-center justify-center gap-2 text-gray-500"
                      style={{ borderColor: '#f4a7b9' }}
                    >
                      <span className="text-sm">
                        {isUploading ? 'Yükleniyor...' : '📷 Kapak Fotoğrafı Seç'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* PDF Yükleme */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#c084fc' }}>
                    PDF Yükle
                  </label>
                  <div className="flex items-center gap-4">
                    {pdfData && (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <span>✅ PDF yüklendi</span>
                      </div>
                    )}
                    <label className="flex-1 cursor-pointer border-2 border-dashed rounded-lg p-3 hover:bg-gray-50 flex items-center justify-center gap-2 text-gray-500"
                      style={{ borderColor: '#f4a7b9' }}
                    >
                      <span className="text-sm">
                        {isUploading ? 'Yükleniyor...' : '📄 PDF Dosyası Seç'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handlePdfUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* PDF Kutucuk Adı */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#c084fc' }}>
                    PDF Kutucuk Adı
                  </label>
                  <input
                    type="text"
                    value={pdfName}
                    onChange={(e) => setPdfName(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    style={{ borderColor: '#f4a7b9' }}
                    placeholder="Örn: Dergiyi İndir"
                  />
                </div>

                {/* Görüntülenme Sayısı */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#c084fc' }}>
                    Görüntülenme Sayısı
                  </label>
                  <input
                    type="number"
                    value={bookViews}
                    onChange={(e) => setBookViews(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    style={{ borderColor: '#f4a7b9' }}
                    placeholder="0"
                    min="0"
                  />
                </div>

                {/* İndirme Sayısı */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#c084fc' }}>
                    İndirme Sayısı
                  </label>
                  <input
                    type="number"
                    value={bookDownloads}
                    onChange={(e) => setBookDownloads(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    style={{ borderColor: '#f4a7b9' }}
                    placeholder="0"
                    min="0"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full text-white py-3 rounded-lg font-medium transition-colors mt-4"
                  style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}
                >
                  {editingId ? 'Değişiklikleri Kaydet' : 'Dergiyi Kaydet'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
