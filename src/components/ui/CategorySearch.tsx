import { Search, X } from 'lucide-react';

interface CategorySearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  darkMode: boolean;
}

export const CategorySearch = ({ value, onChange, placeholder, darkMode }: CategorySearchProps) => {
  return (
    <div className="mb-6 rounded-2xl border-2 border-pink-500 bg-pink-500 p-1">
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${darkMode ? 'bg-black' : 'bg-white'}`}>
        <Search size={18} className="text-pink-500" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-transparent text-sm outline-none ${darkMode ? 'text-white placeholder:text-pink-300' : 'text-gray-700 placeholder:text-pink-400'}`}
          aria-label={placeholder}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded-full p-1 text-pink-500 transition-colors hover:bg-pink-100/20"
            aria-label="Aramayı temizle"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
