import React, { useState, useEffect } from 'react';

interface CampaignCountdownProps {
  targetDate: string | Date;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const CampaignCountdown: React.FC<CampaignCountdownProps> = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const targetTime = new Date(targetDate).getTime();

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTimeLeft(); // Initial calculation

    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) {
    return null; // Or a loading state
  }

  if (isExpired) {
    return (
      <div className="p-4 bg-gray-100 border border-gray-300 rounded-md text-center">
        <h3 className="text-xl font-bold text-gray-500">Campaign Ended</h3>
        <p className="text-gray-400">This campaign is no longer active.</p>
      </div>
    );
  }

  const isUrgent = timeLeft.days === 0; // Less than 24 hours

  return (
    <div className={`p-4 rounded-md text-center ${isUrgent ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
      <h3 className={`text-lg mb-2 ${isUrgent ? 'text-red-600 font-bold' : 'text-blue-800'}`}>
        {isUrgent ? 'Campaign Ending Soon!' : 'Campaign Ends In:'}
      </h3>
      <div className={`flex justify-center gap-4 text-2xl font-mono ${isUrgent ? 'text-red-700' : 'text-blue-900'}`}>
        <div className="flex flex-col items-center">
          <span>{timeLeft.days}</span>
          <span className="text-xs uppercase tracking-wider">Days</span>
        </div>
        <span>:</span>
        <div className="flex flex-col items-center">
          <span>{timeLeft.hours.toString().padStart(2, '0')}</span>
          <span className="text-xs uppercase tracking-wider">Hours</span>
        </div>
        <span>:</span>
        <div className="flex flex-col items-center">
          <span>{timeLeft.minutes.toString().padStart(2, '0')}</span>
          <span className="text-xs uppercase tracking-wider">Mins</span>
        </div>
        <span>:</span>
        <div className="flex flex-col items-center">
          <span>{timeLeft.seconds.toString().padStart(2, '0')}</span>
          <span className="text-xs uppercase tracking-wider">Secs</span>
        </div>
      </div>
    </div>
  );
};
