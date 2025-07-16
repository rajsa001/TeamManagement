import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Leave } from '../../types';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

interface LeaveFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (leave: any) => void;
  selectedDate?: string;
  initialData?: any;
  noModal?: boolean;
}

const LeaveForm: React.FC<LeaveFormProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  selectedDate, 
  initialData, 
  noModal = false
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
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
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
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