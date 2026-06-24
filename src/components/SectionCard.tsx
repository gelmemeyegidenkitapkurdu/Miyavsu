import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { useStore } from '../store/useStore';

interface SectionCardProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  emoji?: string;
  to: string;
  color: string;
}

export const SectionCard = ({ title, description, icon: Icon, emoji, to, color }: SectionCardProps) => {
  const { darkMode } = useStore();
  
  return (
    <Link to={to} className="block h-full">
      <motion.div 
        whileHover={{ scale: 1.03 }}
        className={`h-full p-6 rounded-2xl shadow-lg border-2 ${color} flex flex-col items-center text-center transition-colors hover:shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
      >
        <div className="mb-4 text-4xl">
          {Icon ? <Icon size={48} className={darkMode ? 'text-gray-300' : 'text-gray-700'} /> : emoji}
        </div>
        <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{title}</h3>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{description}</p>
      </motion.div>
    </Link>
  );
};
