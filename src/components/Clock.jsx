import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export default function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="glass-panel p-6 flex flex-col items-center justify-center text-center w-full relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-wider font-mono text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
        {format(time, 'HH:mm:ss')}
      </h2>
      <p className="text-gray-400 mt-2 text-lg font-medium tracking-wide uppercase">
        {format(time, 'EEEE, dd MMMM')}
      </p>
    </div>
  );
}
