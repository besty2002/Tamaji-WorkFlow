import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import type { LeaveRequest } from '../../types/database';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { LoadingSpinner, ErrorState, EmptyState } from '../../components/ui/States';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export function RequestList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['myRequests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!user?.id,
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myRequests', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalance', user?.id] });
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState />;

  const filteredRequests = requests?.filter(req => filterStatus === 'all' || req.status === filterStatus) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Leave Requests</h1>
        <Link to="/requests/new">
          <Button>New Request</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex justify-between items-center py-3">
          <span>Requests</span>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="ml-4 text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {format(new Date(req.start_date), 'MMM d, yyyy')}
                        {req.start_date !== req.end_date && ` - ${format(new Date(req.end_date), 'MMM d, yyyy')}`}
                        {req.is_half_day && ` (Half ${req.half_day_type})`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                        {req.type.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${req.status === 'approved' ? 'bg-green-100 text-green-800' : 
                            req.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                            req.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Link to={`/requests/${req.id}`} className="text-indigo-600 hover:text-indigo-900">View</Link>
                        {(req.status === 'draft' || req.status === 'submitted') && (
                          <button 
                            onClick={() => {
                              if (confirm('Are you sure you want to cancel this request?')) {
                                cancelMutation.mutate(req.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                            disabled={cancelMutation.isPending}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No leave requests found." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
