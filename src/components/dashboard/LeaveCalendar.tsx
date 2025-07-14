import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Leave } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LeaveForm from './LeaveForm';

interface LeaveCalendarProps {
  leaves: Leave[];
  onAddLeave: (leave: Omit<Leave, 'id' | 'created_at' | 'updated_at'>) => void;
  showUserInfo?: boolean;
}

const LeaveCalendar: React.FC<LeaveCalendarProps> = ({ 
  leaves, 
  onAddLeave, 
  showUserInfo = false 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getLeaveForDate = (day: number) => {
    const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return leaves.find(leave => leave.leave_date === dateString);
  };

  const handleDateClick = (day: number) => {
    const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateString);
    setIsFormOpen(true);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = getDaysInMonth(currentDate);

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            icon={ChevronLeft}
            onClick={() => navigateMonth('prev')}
          />
          <h2 className="text-xl font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            icon={ChevronRight}
            onClick={() => navigateMonth('next')}
          />
        </div>
        <Button
          icon={Plus}
          onClick={() => setIsFormOpen(true)}
        >
          Add Leave
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {dayNames.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={index} className="p-2 h-20" />;
          }

          const leave = getLeaveForDate(day);
          const isToday = 
            day === new Date().getDate() &&
            currentDate.getMonth() === new Date().getMonth() &&
            currentDate.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={day}
              className={`
                p-2 h-20 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors
                ${isToday ? 'bg-blue-50 border-blue-300' : ''}
                ${leave ? 'bg-red-50 border-red-300' : ''}
              `}
              onClick={() => handleDateClick(day)}
            >
              <div className="flex flex-col h-full">
                <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                  {day}
                </span>
                {leave && (
                  <div className="flex-1 mt-1">
                    <div className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded truncate">
                      {leave.leave_type}
                    </div>
                    {showUserInfo && leave.user && (
                      <div className="text-xs text-gray-600 mt-1 truncate">
                        {leave.user.name}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <LeaveForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedDate('');
        }}
        onSubmit={onAddLeave}
        selectedDate={selectedDate}
      />
    </Card>
  );
};

export default LeaveCalendar;