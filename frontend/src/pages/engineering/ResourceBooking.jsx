import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { RiCalendarCheckLine, RiBuildingLine, RiComputerLine, RiTimeLine, RiAddLine } from 'react-icons/ri';

const ResourceBooking = () => {
    const { user } = useAuth();
    const [resources, setResources] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [showForm, setShowForm] = useState(false);

    // Form
    const [formData, setFormData] = useState({ resource_id: '', date: '', start_time: '', end_time: '', purpose: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchResources();
    }, []);

    const fetchResources = async () => {
        try {
            const resRes = await api.get('/engineering/resources');
            setResources(resRes.data);
            const resBook = await api.get('/engineering/bookings');
            setBookings(resBook.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Combine date and time
        const start = `${formData.date}T${formData.start_time}:00`;
        const end = `${formData.date}T${formData.end_time}:00`;

        setLoading(true);
        try {
            await api.post('/engineering/bookings', {
                resource_id: formData.resource_id,
                start_time: start,
                end_time: end,
                purpose: formData.purpose
            });
            toast.success('Booking requested successfully!');
            setShowForm(false);
            setFormData({ resource_id: '', date: '', start_time: '', end_time: '', purpose: '' });
            fetchResources();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Booking failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <RiCalendarCheckLine className="text-blue-600" /> Resource Booking
                    </h1>
                    <p className="text-slate-500 mt-1">Book seminar halls, labs, and equipment.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/30"
                >
                    <RiAddLine size={20} /> New Booking
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 mb-8 animate-fade-in-down max-w-2xl mx-auto">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">Book a Resource</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="text-sm font-bold text-slate-700">Select Resource</label>
                            <select required className="w-full px-4 py-2 border rounded-lg outline-none bg-white"
                                value={formData.resource_id} onChange={e => setFormData({ ...formData, resource_id: e.target.value })}>
                                <option value="">Select Resource</option>
                                {resources.map(r => (
                                    <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-bold text-slate-700">Date</label>
                                <input type="date" required className="w-full px-4 py-2 border rounded-lg outline-none"
                                    value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    min={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700">Start Time</label>
                                <input type="time" required className="w-full px-4 py-2 border rounded-lg outline-none"
                                    value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700">End Time</label>
                                <input type="time" required className="w-full px-4 py-2 border rounded-lg outline-none"
                                    value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700">Purpose</label>
                            <textarea required className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" rows="2"
                                value={formData.purpose} onChange={e => setFormData({ ...formData, purpose: e.target.value })} placeholder="e.g. Final Year Project Presentation"></textarea>
                        </div>
                        <div className="flex justify-end gap-3 mt-2">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                            <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
                                {loading ? 'Confirm Booking' : 'Book Now'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Recent Bookings</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                            <tr>
                                <th className="px-6 py-4">Resource</th>
                                <th className="px-6 py-4">Booked By</th>
                                <th className="px-6 py-4">Time Slot</th>
                                <th className="px-6 py-4">Purpose</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {bookings.map(book => (
                                <tr key={book.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-800 w-48">
                                        <div className="flex items-center gap-2">
                                            {book.resource_type === 'venue' ? <RiBuildingLine /> : <RiComputerLine />}
                                            {book.resource_name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{book.user_name}</td>
                                    <td className="px-6 py-4 w-60">
                                        <div className="flex flex-col text-xs">
                                            <span className="font-bold">{new Date(book.start_time).toDateString()}</span>
                                            <span className="text-slate-500">
                                                {new Date(book.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                {new Date(book.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{book.purpose}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${book.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            book.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {book.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {bookings.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                        No bookings found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ResourceBooking;
