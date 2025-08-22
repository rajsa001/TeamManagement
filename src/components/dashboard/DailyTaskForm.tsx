import React, { useState, useEffect, useRef } from 'react';
import { DailyTask, Member, TaskAttachment } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { fileUploadService } from '../../services/fileUpload';
import { Paperclip, X, Link, File } from 'lucide-react';

interface DailyTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: Omit<DailyTask, 'id' | 'created_at' | 'updated_at' | 'user' | 'created_by_user'>) => Promise<void>;
  task?: DailyTask | null;
  members: Member[];
  currentUserId: string;
  isAdmin?: boolean;
}

export const DailyTaskForm: React.FC<DailyTaskFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  members,
  currentUserId,
  isAdmin = false
}) => {
  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    user_id: isAdmin ? (members.length > 0 ? members[0].id : currentUserId) : currentUserId,
    tags: [] as string[],
    task_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) {
      setFormData({
        task_name: task.task_name,
        description: task.description || '',
        priority: task.priority,
        user_id: task.user_id,
        tags: task.tags || [],
        task_date: task.task_date
      });
      setAttachments(task.attachments || []);
    } else {
      setFormData({
        task_name: '',
        description: '',
        priority: 'medium',
        user_id: isAdmin ? (members.length > 0 ? members[0].id : currentUserId) : currentUserId,
        tags: [],
        task_date: new Date().toISOString().split('T')[0]
      });
      setAttachments([]);
    }
  }, [task, currentUserId, isAdmin, members]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.task_name.trim()) return;
    
    // Ensure we have a valid user_id
    if (!formData.user_id || formData.user_id === '') {
      console.error('No valid user selected');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        created_by: currentUserId,
        status: 'pending',
        attachments,
        is_active: true
      });
      onClose();
    } catch (error) {
      console.error('Error submitting task:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (const file of Array.from(files)) {
        let tempAttachment: TaskAttachment | null = null;
        try {
          // Validate file
          const validation = fileUploadService.validateFile(file);
          if (!validation.isValid) {
            alert(validation.error);
            continue;
          }

          // Show loading state
          tempAttachment = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: file.name,
            url: URL.createObjectURL(file), // Temporary URL for preview
            type: 'file',
            file_type: file.type,
            size: file.size,
            uploaded_at: new Date().toISOString()
          };
          setAttachments(prev => [...prev, tempAttachment!]);

          // Upload to Supabase Storage
          const uploadedAttachment = await fileUploadService.uploadFile(file, currentUserId);
          
          // Replace temporary attachment with real one
          setAttachments(prev => prev.map(att => 
            att.id === tempAttachment!.id ? uploadedAttachment : att
          ));
        } catch (error) {
          alert(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Remove temporary attachment if upload failed
          if (tempAttachment) {
            setAttachments(prev => prev.filter(att => att.id !== tempAttachment!.id));
          }
        }
      }
    }
  };

  const handleUrlAdd = () => {
    if (urlInput.trim()) {
      const attachment = fileUploadService.createUrlAttachment(urlInput.trim());
      setAttachments(prev => [...prev, attachment]);
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const removeAttachment = async (id: string) => {
    const attachment = attachments.find(att => att.id === id);
    if (attachment && attachment.type === 'file') {
      try {
        // Delete from Supabase Storage
        await fileUploadService.deleteFile(attachment.url);
      } catch (error) {
        console.error('Failed to delete file from storage:', error);
        // Continue with removal even if storage deletion fails
      }
    }
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Daily Task' : 'Create Daily Task'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Name *
          </label>
          <input
            type="text"
            value={formData.task_name}
            onChange={(e) => setFormData(prev => ({ ...prev, task_name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter task name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter task description"
            rows={3}
          />
        </div>

        {isAdmin && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign to Member
            </label>
            <select
              value={formData.user_id}
              onChange={(e) => setFormData(prev => ({ ...prev, user_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={members.length === 0}
            >
              {members.length === 0 ? (
                <option value="">Loading members...</option>
              ) : (
                members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Date
          </label>
          <input
            type="date"
            value={formData.task_date}
            onChange={(e) => setFormData(prev => ({ ...prev, task_date: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a tag and press Enter"
            />
            <Button
              type="button"
              onClick={addTag}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Add
            </Button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Attachments Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            📎 Attachments <span className="text-xs text-gray-500">(Optional)</span>
          </label>
          <div className="flex space-x-3 mb-3">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 shadow-sm"
            >
              <Paperclip className="w-4 h-4" />
              <span className="font-medium">Upload File</span>
            </Button>
            <Button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-200 shadow-sm"
            >
              <Link className="w-4 h-4" />
              <span className="font-medium">Add URL</span>
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
          />
          {showUrlInput && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
              <div className="flex space-x-3">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Enter URL (e.g., https://example.com/document.pdf)..."
                  className="flex-1 px-4 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <Button
                  type="button"
                  onClick={handleUrlAdd}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                >
                  Add URL
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowUrlInput(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 shadow-sm"
                >
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-green-600 mt-2">💡 Add links to external documents, images, or resources</p>
            </div>
          )}
          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-2">
                    {attachment.type === 'file' ? (
                      <File className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Link className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-sm text-gray-700 truncate">{attachment.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !formData.task_name.trim() || (isAdmin && members.length === 0)}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {loading ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
