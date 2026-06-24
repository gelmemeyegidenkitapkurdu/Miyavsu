import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, X, CheckCircle, Trash2, Edit, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sortByNewest } from '../utils/sortByNewest';

const VOTED_POLLS_STORAGE_KEY = 'polls-voted-ids';

export const Polls = () => {
  const { polls, isAdmin, addPoll, updatePoll, deletePoll, votePoll, darkMode } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [pollViews, setPollViews] = useState('');

  const handleOpenModal = (poll?: any) => {
    if (poll) {
      setEditingId(poll.id);
      setQuestion(poll.question);
      setOptions(poll.options.map((o: any) => o.text));
      setPollViews(poll.views !== undefined ? String(poll.views) : '');
    } else {
      setEditingId(null);
      setQuestion('');
      setOptions(['', '']);
      setPollViews('');
    }
    setIsModalOpen(true);
  };

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty options
    const validOptions = options.filter(o => o && o.trim());
    
    if (validOptions.length === 0) {
      alert('Lütfen en az bir seçenek ekleyin!');
      return;
    }
    
    if (editingId) {
      const existingPoll = polls.find(p => p.id === editingId);
      
      // Keep existing options that still have text, add new ones
      const updatedOptions = validOptions.map((text, i) => {
        // Try to find existing option by matching text or by index
        const existingOption = existingPoll?.options.find((o: any) => o.text === text) 
          || existingPoll?.options[i];
        return {
          id: existingOption?.id || Math.random().toString(),
          text: text.trim(),
          votes: existingOption ? existingOption.votes : 0
        };
      });

      updatePoll(editingId, {
        question,
        options: updatedOptions,
        views: pollViews ? parseInt(pollViews, 10) : 0
      });
    } else {
      addPoll({
        question,
        options: validOptions.map((text, i) => ({
          id: Math.random().toString(),
          text: text.trim(),
          votes: 0
        })),
        views: pollViews ? parseInt(pollViews, 10) : 0
      });
    }

    setIsModalOpen(false);
    setEditingId(null);
    setQuestion('');
    setOptions(['', '']);
    setPollViews('');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu anketi silmek istediğinize emin misiniz?')) {
      deletePoll(id);
    }
  };

  const handleEdit = (poll: any) => {
    handleOpenModal(poll);
  };

  const [votedPolls, setVotedPolls] = useState<string[]>([]);

  useEffect(() => {
    if (isAdmin) {
      return;
    }

    try {
      const storedVotes = localStorage.getItem(VOTED_POLLS_STORAGE_KEY);
      if (!storedVotes) {
        setVotedPolls([]);
        return;
      }

      const parsedVotes = JSON.parse(storedVotes);
      if (Array.isArray(parsedVotes)) {
        setVotedPolls(parsedVotes.filter((id: unknown): id is string => typeof id === 'string'));
      } else {
        setVotedPolls([]);
      }
    } catch {
      setVotedPolls([]);
    }
  }, [isAdmin]);

  const handleVote = (pollId: string, optionId: string) => {
    if (!isAdmin && votedPolls.includes(pollId)) return;

    votePoll(pollId, optionId);

    if (!votedPolls.includes(pollId)) {
      const nextVotedPolls = [...votedPolls, pollId];
      setVotedPolls(nextVotedPolls);

      if (!isAdmin) {
        localStorage.setItem(VOTED_POLLS_STORAGE_KEY, JSON.stringify(nextVotedPolls));
      }
    }
  };

  const sortedPolls = sortByNewest(polls);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-purple-700">Anketler</h2>
        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} /> Anket Ekle
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {sortedPolls.map((poll) => (
          <motion.div
            key={poll.id}
            className={`rounded-xl p-6 shadow-md border relative group ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100'}`}
          >
            {isAdmin && (
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(poll)}
                  className={`p-2 rounded-full text-blue-600 shadow-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-blue-50'}`}
                  title="Düzenle"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDelete(poll.id)}
                  className={`p-2 rounded-full text-red-600 shadow-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-red-50'}`}
                  title="Sil"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
            
            <h3 className="text-xl font-bold text-gray-800 mb-6 pr-16">{poll.question}</h3>
            
            <div className="space-y-4">
              {poll.options.map((option) => {
                const percentage = poll.totalVotes > 0 
                  ? Math.round((option.votes / poll.totalVotes) * 100) 
                  : 0;
                
                return (
                  <div key={option.id} className="relative">
                    <button
                      onClick={() => handleVote(poll.id, option.id)}
                      disabled={!isAdmin && votedPolls.includes(poll.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all relative overflow-hidden z-10 ${
                        !isAdmin && votedPolls.includes(poll.id)
                          ? 'border-gray-200 cursor-default'
                          : 'border-blue-100 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex justify-between items-center relative z-10">
                        <span className="font-medium text-gray-700">{option.text}</span>
                        {votedPolls.includes(poll.id) && (
                          <span className="font-bold text-blue-600">{percentage}%</span>
                        )}
                      </div>
                    </button>
                    
                    {/* Progress Bar Background */}
                    {votedPolls.includes(poll.id) && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className="absolute top-0 left-0 h-full bg-blue-100 rounded-lg z-0"
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Eye size={14} />
                <span>{poll.views || 0}</span>
              </div>
              {isAdmin && (
                <span>Toplam Oy: {poll.totalVotes}</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

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
                  {editingId ? 'Anketi Düzenle' : 'Yeni Anket Ekle'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Soru</label>
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Anket sorusunu yazın..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Seçenekler</label>
                  <div className="space-y-2">
                    {options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                          placeholder={`${index + 1}. Seçenek`}
                          required
                        />
                        {options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setOptions(options.filter((_, i) => i !== index))}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <X size={20} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="mt-2 text-sm text-purple-600 font-medium hover:text-purple-700 flex items-center gap-1"
                  >
                    <Plus size={16} /> Seçenek Ekle
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Görüntülenme Sayısı</label>
                  <input
                    type="number"
                    value={pollViews}
                    onChange={(e) => setPollViews(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors mt-4"
                >
                  {editingId ? 'Değişiklikleri Kaydet' : 'Anketi Yayınla'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
