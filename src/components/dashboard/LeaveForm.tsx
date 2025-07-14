import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Leave } from '../../types';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

interface LeaveFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (leave: Omit<Leave, 'id' | 'created_at' | 'updated_at'>) => void;
  selectedDate?: string;
}

const LeaveForm: React.FC<LeaveFormProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  selectedDate 
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    leave_date: '',
    leave_type: 'casual' as Leave['leave_type'],
    reason: '',
    user_id: user?.id || '',
  });

  useEffect(() => {
    if (selectedDate) {
      setFormData(prev => ({ ...prev, leave_date: selectedDate }));
    }
  }, [selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ 
      leave_date: '', 
      leave_type: 'casual', 
      reason: '', 
      user_id: user?.id || '' 
    });
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Leave Request">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Leave Date
          </label>
          <input
            type="date"
            name="leave_date"
            value={formData.leave_date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
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

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            Request Leave
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default LeaveForm;