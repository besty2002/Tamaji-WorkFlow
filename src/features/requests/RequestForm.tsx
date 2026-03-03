import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { LeaveRequest } from '../../types/database';
import { format } from 'date-fns';

interface RequestFormData {
  type: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  half_day_type: 'AM' | 'PM' | '';
  reason: string;
}

export function RequestForm() {
  const { id } = useParams();
  const isEdit = !!id && id !== 'new';
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [request, setRequest] = useState<LeaveRequest | null>(null);

  const { register, handleSubmit, watch, setValue, reset } = useForm<RequestFormData>({
    defaultValues: {
      type: 'paid_leave',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(new Date(), 'yyyy-MM-dd'),
      is_half_day: false,
      half_day_type: '',
      reason: '',
    }
  });

  const isHalfDay = watch('is_half_day');
  const startDate = watch('start_date');

  useEffect(() => {
    if (isEdit) {
      const fetchRequest = async () => {
        const { data } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('id', id)
          .single();
        if (data) {
          setRequest(data as LeaveRequest);
          reset({
            type: data.type,
            start_date: data.start_date,
            end_date: data.end_date,
            is_half_day: data.is_half_day,
            half_day_type: data.half_day_type || '',
            reason: data.reason || '',
          });
        }
      };
      fetchRequest();
    }
  }, [id, isEdit, reset]);

  // Sync end_date with start_date if half day
  useEffect(() => {
    if (isHalfDay) {
      setValue('end_date', startDate);
    }
  }, [isHalfDay, startDate, setValue]);

  const onSubmit = async (data: RequestFormData, status: 'draft' | 'submitted') => {
    if (!user) return;
    setLoading(true);
    setErrorMsg('');

    try {
      if (data.start_date > data.end_date) {
        throw new Error('Start date cannot be after end date.');
      }

      const payload = {
        user_id: user.id,
        type: data.type,
        start_date: data.start_date,
        end_date: data.end_date,
        is_half_day: data.is_half_day,
        half_day_type: data.is_half_day ? data.half_day_type : null,
        reason: data.reason,
        status: status,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('leave_requests')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('leave_requests')
          .insert([payload]);
        if (error) throw error;
      }
      
      navigate('/requests');
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  const isReadonly = isEdit && request?.status !== 'draft' && request?.status !== 'submitted';

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          {isEdit ? (isReadonly ? 'View Leave Request' : 'Edit Leave Request') : 'New Leave Request'}
        </CardHeader>
        <CardContent>
          {errorMsg && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{errorMsg}</div>}
          
          <form className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Leave Type</label>
              <select 
                {...register('type')} 
                disabled={isReadonly}
                className="mt-1 block w-full rounded-md border-gray-300 border py-2 px-3 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
              >
                <option value="paid_leave">Annual Leave (Paid)</option>
                <option value="sick">Sick Leave</option>
                <option value="special">Special Leave</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                disabled={isReadonly}
                {...register('start_date', { required: true })}
              />
              <Input
                label="End Date"
                type="date"
                disabled={isHalfDay || isReadonly}
                {...register('end_date', { required: true })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_half_day"
                disabled={isReadonly}
                {...register('is_half_day')}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:bg-gray-100"
              />
              <label htmlFor="is_half_day" className="text-sm text-gray-700">
                Half Day
              </label>
            </div>

            {isHalfDay && (
              <div>
                <label className="text-sm font-medium text-gray-700">Half Day Time</label>
                <select 
                  {...register('half_day_type', { required: isHalfDay })} 
                  disabled={isReadonly}
                  className="mt-1 block w-full rounded-md border-gray-300 border py-2 px-3 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
                >
                  <option value="">Select AM/PM...</option>
                  <option value="AM">Morning (AM)</option>
                  <option value="PM">Afternoon (PM)</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">Reason</label>
              <textarea
                {...register('reason')}
                disabled={isReadonly}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 border py-2 px-3 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
                placeholder="Brief reason for leave..."
              />
            </div>

            {isReadonly && request?.manager_comment && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                <span className="text-xs font-semibold text-gray-500 uppercase">Manager Comment</span>
                <p className="text-sm text-gray-800 mt-1">{request.manager_comment}</p>
              </div>
            )}

            {!isReadonly && (
              <div className="flex space-x-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/requests')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <div className="flex-1"></div>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handleSubmit((data) => onSubmit(data, 'draft'))}
                  disabled={loading}
                >
                  Save Draft
                </Button>
                <Button 
                  type="button" 
                  variant="primary" 
                  onClick={handleSubmit((data) => onSubmit(data, 'submitted'))}
                  disabled={loading}
                >
                  Submit Request
                </Button>
              </div>
            )}
            {isReadonly && (
              <div className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => navigate('/requests')}>Back to List</Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
