import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Leave } from '../../types';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { toast } from 'react-toastify';
import { supabase } from '../../lib/supabase';

interface LeaveFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (leave: any) => void;
  selectedDate?: string;
  initialData?: any;
  noModal?: boolean;
  leaves: Leave[]; // <-- add this
}

const LeaveForm: React.FC<LeaveFormProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  selectedDate, 
  initialData, 
  noModal = false,
  leaves // <-- add this
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    category: 'single-day',
    leave_date: '',
    from_date: '',
    to_date: '',
    leave_type: 'casual' as Leave['leave_type'],
    reason: '',
    brief_description: '',
    user_id: user?.id || '',
    end_date: '',
    id: undefined,
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const [error, setError] = useState('');
  const [holidays, setHolidays] = useState<string[]>([]); // store as array of date strings

  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        category: initialData.category || 'single-day',
        leave_date: initialData.leave_date || '',
        from_date: initialData.from_date || '',
        to_date: initialData.to_date || '',
        leave_type: initialData.leave_type || 'casual',
        reason: initialData.reason || '',
        brief_description: initialData.brief_description || '',
        user_id: initialData.user_id || user?.id || '',
        end_date: initialData.end_date || '',
        id: initialData.id,
      });
    } else if (selectedDate) {
      setFormData(prev => ({ ...prev, leave_date: selectedDate }));
    }
  }, [initialData, isOpen, selectedDate, user]);

  useEffect(() => {
    if (isOpen && user?.role === 'member' && !initialData) {
      setFormData(prev => ({ ...prev, user_id: user.id }));
    }
  }, [isOpen, user, initialData]);

  useEffect(() => {
    // Fetch holidays for the current cycle
    const fetchHolidays = async () => {
      const { data, error } = await supabase
        .from('company_holidays')
        .select('date')
        .gte('date', '2025-01-01') // Use the same cycle as before
        .lte('date', '2026-12-31'); // Use the same cycle as before
      if (!error && data) {
        setHolidays(data.map((h: any) => h.date));
      }
    };
    fetchHolidays();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation: ensure correct fields are set
    if (formData.category === 'single-day') {
      if (!formData.leave_date) {
        setError('Please select a leave date.');
        return;
      }
      // Clear multi-day fields
      formData.from_date = '';
      formData.to_date = '';
    } else {
      if (!formData.from_date || !formData.to_date) {
        setError('Please select both from and to dates.');
        return;
      }
      // Clear single-day field
      formData.leave_date = '';
    }
    setError('');
    onSubmit(formData);
    setFormData({
      category: 'single-day',
      leave_date: '',
      from_date: '',
      to_date: '',
      leave_type: 'casual',
      reason: '',
      brief_description: '',
      user_id: user?.id || '',
      end_date: '',
      id: undefined,
    });
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Helper to count total days, Sundays, and already leave days in a range
  function getDaysInfo(fromDate: string, toDate: string, existingLeaves: Leave[]) {
    if (!fromDate || !toDate) return { total: 0, sundays: 0, alreadyLeave: 0, holidays: 0, leaveDays: 0 };
    const from = new Date(fromDate);
    const to = new Date(toDate);
    let total = 0;
    let sundays = 0;
    let alreadyLeave = 0;
    let holidaysCount = 0;
    // Build set of already booked days
    const leaveDatesSet = new Set<string>();
    existingLeaves.forEach(leave => {
      if (leave.category === 'multi-day' && leave.from_date && leave.to_date) {
        let d = new Date(leave.from_date);
        const to2 = new Date(leave.to_date);
        while (d <= to2) {
          leaveDatesSet.add(d.toISOString().split('T')[0]);
          d.setDate(d.getDate() + 1);
        }
      } else if (leave.leave_date) {
        leaveDatesSet.add(new Date(leave.leave_date).toISOString().split('T')[0]);
      }
    });
    let leaveDays = 0;
    let idx = 0;
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      total++;
      const dayStr = d.toISOString().split('T')[0];
      if (d.getDay() === 0) {
        sundays++;
      } else if (leaveDatesSet.has(dayStr)) {
        alreadyLeave++;
      } else if (holidays.includes(dayStr)) {
        holidaysCount++;
      } else {
        leaveDays++;
      }
      idx++;
    }
    return { total, sundays, alreadyLeave, holidays: holidaysCount, leaveDays };
  }

  // Build set of already booked days (excluding Sundays)
  const bookedDatesSet = new Set<string>();
  leaves.forEach(leave => {
    if (leave.category === 'multi-day' && leave.from_date && leave.to_date) {
      let d = new Date(leave.from_date);
      const to2 = new Date(leave.to_date);
      while (d <= to2) {
        if (d.getDay() !== 0) bookedDatesSet.add(d.toISOString().split('T')[0]);
        d.setDate(d.getDate() + 1);
      }
    } else if (leave.leave_date) {
      const d = new Date(leave.leave_date);
      if (d.getDay() !== 0) bookedDatesSet.add(d.toISOString().split('T')[0]);
    }
  });
  // Add holidays to bookedDatesSet for blocking selection
  holidays.forEach(date => bookedDatesSet.add(date));

  // Custom onChange for from_date and to_date to prevent selecting booked dates
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (bookedDatesSet.has(value) || holidays.includes(value)) {
      toast('❌ Date not selectable', {
        description: holidays.includes(value) ? 'This date is a company holiday.' : 'This date is already booked for another leave.',
        style: { background: '#ef4444', color: 'white' },
        duration: 4000,
      });
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Define current cycle
  const cycleStart = '2025-01-01';
  const cycleEnd = '2026-12-31';

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="single-day">Single Day</option>
          <option value="multi-day">Multi Day</option>
        </select>
      </div>

      {formData.category === 'single-day' ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leave Date
            </label>
            <input
              type="date"
              name="leave_date"
              value={formData.leave_date}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              min={cycleStart}
              max={cycleEnd}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leave Type
            </label>
            <select
              name="leave_type"
              value={formData.leave_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="paid">Paid Leave</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Please provide a reason for your leave..."
              required
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leave Reason
            </label>
            <input
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              name="from_date"
              value={formData.from_date}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              min={cycleStart}
              max={cycleEnd}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              name="to_date"
              value={formData.to_date}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              min={formData.from_date || cycleStart}
              max={cycleEnd}
            />
          </div>
          {/* Days calculator */}
          {formData.from_date && formData.to_date && (
            <div className="text-xs text-gray-700 bg-gray-50 rounded p-2 mt-1">
              {(() => {
                const info = getDaysInfo(formData.from_date, formData.to_date, leaves);
                return <>
                  <span className="font-semibold">Total days:</span> {info.total} &nbsp;|&nbsp;
                  <span className="font-semibold">Sundays:</span> {info.sundays} &nbsp;|&nbsp;
                  <span className="font-semibold">Holidays:</span> {info.holidays} &nbsp;|&nbsp;
                  <span className="font-semibold">Already leave:</span> {info.alreadyLeave} &nbsp;|&nbsp;
                  <span className="font-semibold">Leave days:</span> {info.leaveDays}
                </>;
              })()}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leave Type
            </label>
            <select
              name="leave_type"
              value={formData.leave_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Leave Type</option>
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="paid">Paid Leave</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leave Brief Description
            </label>
            <textarea
              name="brief_description"
              value={formData.brief_description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your multi-day leave..."
              required
            />
          </div>
        </>
      )}

      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

      <div className="flex justify-end space-x-3 pt-4">
        <Button variant="outline" onClick={onClose} type="button">
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? 'Update Leave' : 'Request Leave'}
        </Button>
      </div>
    </form>
  );

  if (noModal) {
    return formContent;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Leave' : 'Add Leave Request'}>
      {formContent}
    </Modal>
  );
};

export default LeaveForm;