import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import type { LeaveRequest } from '../../types/database';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { LoadingSpinner, ErrorState, EmptyState } from '../../components/ui/States';
import { format } from 'date-fns';

export function ManageRequests() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('submitted');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          profiles (
            id,
            display_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data as LeaveRequest[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    
    // Optional: Realtime subscription for managers
    const channel = supabase.channel('public:leave_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
        fetchRequests(); // Refresh on any change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  const handleAction = async (id: string, newStatus: 'approved' | 'rejected') => {
    const comment = prompt(`Please enter a comment for ${newStatus}ing this request:` + (newStatus === 'rejected' ? ' (Required)' : ' (Optional)'));
    
    if (newStatus === 'rejected' && !comment) {
      alert('A comment is required when rejecting a request.');
      return;
    }
    if (comment === null) return; // cancelled prompt

    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: newStatus,
          manager_comment: comment || null,
          decided_by: user?.id,
          decided_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      fetchRequests();
    } catch (err: any) {
      alert('Error updating request: ' + err.message);
    }
  };

  if (profile?.role === 'employee') return <ErrorState message="Unauthorized access" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Leave Requests</h1>
      </div>

      <Card>
        <CardHeader className="flex justify-between items-center py-3">
          <span>All Requests</span>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ml-4 text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option value="submitted">Pending (Submitted)</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorState message={error} />
          ) : requests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {req.profiles?.display_name || req.profiles?.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="font-medium text-gray-900">
                          {format(new Date(req.start_date), 'MMM d, yyyy')}
                          {req.start_date !== req.end_date && ` - ${format(new Date(req.end_date), 'MMM d, yyyy')}`}
                          {req.is_half_day && ` (Half ${req.half_day_type})`}
                        </div>
                        <div className="capitalize text-xs">{req.type.replace('_', ' ')}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={req.reason || ''}>
                        {req.reason || '-'}
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
                        {req.status === 'submitted' && (
                          <>
                            <button onClick={() => handleAction(req.id, 'approved')} className="text-green-600 hover:text-green-900">Approve</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => handleAction(req.id, 'rejected')} className="text-red-600 hover:text-red-900">Reject</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message={`No ${statusFilter === 'all' ? '' : statusFilter} requests found.`} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
