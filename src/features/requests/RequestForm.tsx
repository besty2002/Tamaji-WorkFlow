import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { LeaveRequest, PublicHoliday } from '../../types/database';
import { format } from 'date-fns';
import { calculateBusinessDays } from '../../lib/utils';
import { Calendar, Info } from 'lucide-react';

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
  const [holidays, setHolidays] = useState<string[]>([]);

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
  const endDate = watch('end_date');

  // Fetch holidays
  useEffect(() => {
    const fetchHolidays = async () => {
      const { data } = await supabase.from('public_holidays').select('date');
      if (data) {
        setHolidays(data.map((h: any) => h.date));
      }
    };
    fetchHolidays();
  }, []);

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

  const calculatedDays = calculateBusinessDays(startDate, endDate, isHalfDay, holidays);

  const onSubmit = async (data: RequestFormData, status: 'draft' | 'submitted') => {
    if (!user) return;
    if (calculatedDays <= 0) {
      setErrorMsg('有効な営業日が選択されていません。');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      if (data.start_date > data.end_date) {
        throw new Error('開始日は終了日より前である必要があります。');
      }

      const payload = {
        user_id: user.id,
        type: data.type,
        start_date: data.start_date,
        end_date: data.end_date,
        is_half_day: data.is_half_day,
        half_day_type: data.is_half_day ? data.half_day_type : null,
        num_days: calculatedDays, // Save the calculated business days
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
      setErrorMsg(err.message || '保存中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  const isReadonly = isEdit && request?.status !== 'draft' && request?.status !== 'submitted';

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center space-x-2 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
          <Calendar className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isEdit ? (isReadonly ? '休暇申請の詳細' : '休暇申請の編集') : '新規休暇申請'}
        </h1>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
        <CardContent className="p-8">
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-semibold animate-in shake duration-300">
              {errorMsg}
            </div>
          )}
          
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 ml-1 mb-2">休暇の種類</label>
              <select 
                {...register('type')} 
                disabled={isReadonly}
                className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none disabled:bg-slate-50"
              >
                <option value="paid_leave">年次有給休暇</option>
                <option value="sick">病気休暇</option>
                <option value="special">特別休暇</option>
                <option value="unpaid">無給休暇</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="開始日"
                type="date"
                disabled={isReadonly}
                className="rounded-2xl py-3"
                {...register('start_date', { required: true })}
              />
              <Input
                label="終了日"
                type="date"
                disabled={isHalfDay || isReadonly}
                className="rounded-2xl py-3"
                {...register('end_date', { required: true })}
              />
            </div>

            {/* Business Day Calculation Result */}
            {!isHalfDay && (
              <div className="bg-indigo-50 rounded-2xl p-4 flex items-center justify-between border border-indigo-100">
                <div className="flex items-center text-indigo-700 text-sm font-bold">
                  <Info className="w-4 h-4 mr-2" />
                  申請日数 (土日・祝日を除く)
                </div>
                <div className="text-2xl font-black text-indigo-600">
                  {calculatedDays} <span className="text-sm font-bold">日</span>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <input
                type="checkbox"
                id="is_half_day"
                disabled={isReadonly}
                {...register('is_half_day')}
                className="h-5 w-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
              />
              <label htmlFor="is_half_day" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                半休を使用する
              </label>
            </div>

            {isHalfDay && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-bold text-slate-700 ml-1 mb-2">半休の時間帯</label>
                <select 
                  {...register('half_day_type', { required: isHalfDay })} 
                  disabled={isReadonly}
                  className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none disabled:bg-slate-50"
                >
                  <option value="">午前/午後を選択...</option>
                  <option value="AM">午前 (AM)</option>
                  <option value="PM">午後 (PM)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 ml-1 mb-2">理由</label>
              <textarea
                {...register('reason')}
                disabled={isReadonly}
                rows={4}
                className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none disabled:bg-slate-50"
                placeholder="休暇の理由を簡潔に入力してください..."
              />
            </div>

            {isReadonly && request?.manager_comment && (
              <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl">
                <span className="text-xs font-black text-amber-600 uppercase tracking-widest">管理者コメント</span>
                <p className="text-sm text-amber-900 mt-2 font-medium leading-relaxed">{request.manager_comment}</p>
              </div>
            )}

            {!isReadonly && (
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/requests')}
                  disabled={loading}
                  className="rounded-2xl order-3 sm:order-1"
                >
                  キャンセル
                </Button>
                <div className="hidden sm:block flex-1 order-2"></div>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handleSubmit((data) => onSubmit(data, 'draft'))}
                  disabled={loading}
                  className="rounded-2xl order-1 sm:order-3"
                >
                  下書き保存
                </Button>
                <Button 
                  type="button" 
                  variant="primary" 
                  onClick={handleSubmit((data) => onSubmit(data, 'submitted'))}
                  disabled={loading}
                  className="rounded-2xl order-2 sm:order-4 shadow-lg shadow-indigo-200"
                >
                  申請する
                </Button>
              </div>
            )}
            {isReadonly && (
              <div className="pt-6 border-t border-slate-100">
                <Button type="button" variant="outline" className="rounded-2xl w-full sm:w-auto" onClick={() => navigate('/requests')}>一覧に戻る</Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
