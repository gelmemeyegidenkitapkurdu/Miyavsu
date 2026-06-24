import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import ribbonImg from '../../assets/ribbon.png';

const Ribbon = ({ delay, left }: { delay: number; left: string }) => (
  <motion.div
    initial={{ y: -120, opacity: 0 }}
    animate={{ y: '115vh', opacity: [0, 1, 1, 0] }}
    transition={{
      duration: 10,
      repeat: Infinity,
      delay,
      ease: 'linear',
    }}
    className="fixed top-0 z-[15] pointer-events-none"
    style={{ left }}
  >
    <img src={ribbonImg} alt="ribbon" className="w-16 h-auto drop-shadow-md" />
  </motion.div>
);

export const RibbonRain = () => {
  const [ribbons, setRibbons] = useState<{ id: number; delay: number; left: string }[]>([]);

  useEffect(() => {
    const newRibbons = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      delay: Math.random() * 10,
      left: `${Math.random() * 100}%`,
    }));
    setRibbons(newRibbons);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[15] overflow-hidden">
      {ribbons.map((ribbon) => (
        <Ribbon key={ribbon.id} delay={ribbon.delay} left={ribbon.left} />
      ))}
    </div>
  );
};
