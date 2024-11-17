
import React, { useState, useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface CalendarModalProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onClose: () => void;
}

function CalendarModal({ selectedDate, onDateSelect, onClose }: CalendarModalProps) {
  const { t } = useTranslation();
  const [viewDate, setViewDate] = useState(new Date(selectedDate));

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };
  
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
          onClose();
      }
  }

  const { calendarGrid, monthName, year } = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const currentLocale = document.documentElement.lang || 'en-US';
    const monthName = viewDate.toLocaleString(currentLocale, { month: 'long' });

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendarGrid = [];
    let day = 1;

    for (let i = 0; i < 6; i++) { // Max 6 rows
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < firstDayOfMonth) {
          const prevMonthDays = new Date(year, month, 0).getDate();
          const dayNum = prevMonthDays - firstDayOfMonth + j + 1;
          calendarGrid.push({ day: dayNum, isCurrentMonth: false, date: new Date(year, month-1, dayNum) });
        } else if (day > daysInMonth) {
          const dayNum = day - daysInMonth;
          calendarGrid.push({ day: dayNum, isCurrentMonth: false, date: new Date(year, month+1, dayNum) });
          day++;
        } else {
          calendarGrid.push({ day, isCurrentMonth: true, date: new Date(year, month, day) });
          day++;
        }
      }
    }
    return { calendarGrid: calendarGrid.slice(0, 35), monthName, year }; // Ensure 35 days for consistent grid
  }, [viewDate]);

  const today = new Date();
  const dayNames = [t('dayS'), t('dayM'), t('dayT'), t('dayW'), t('dayTh'), t('dayF'), t('daySa')];


  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="calendar-header">
          <button onClick={handlePrevMonth} className="hover:text-[var(--theme-primary)]">&lt;</button>
          <span className="font-bold">{monthName} {year}</span>
          <button onClick={handleNextMonth} className="hover:text-[var(--theme-primary)]">&gt;</button>
        </div>
        <div className="calendar-grid">
          {dayNames.map(d => <div key={d} className="calendar-cell day-name">{d}</div>)}
          {calendarGrid.map(({ day, isCurrentMonth, date }, index) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === today.toDateString();
            let classes = 'calendar-cell';
            if (!isCurrentMonth) classes += ' other-month';
            if (isSelected) classes += ' selected';
            if (isToday) classes += ' today';
            
            return (
              <div key={index} className={classes} onClick={() => onDateSelect(date)}>
                {day}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarModal;