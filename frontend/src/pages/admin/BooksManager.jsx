import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    RiAddLine, RiEditLine, RiDeleteBinLine, RiDownloadLine,
    RiLayoutGridFill, RiListCheck, RiSearchLine, RiFilter3Line,
    RiBookLine, RiBookOpenLine, RiAlertLine, RiCloseLine, RiUploadCloud2Line
} from 'react-icons/ri';
import { SERVER_URL } from '../../config';

const BooksManager = () => {
    // Data State
    const [books, setBooks] = useState([]);
    const [stats, setStats] = useState({ total: 0, available: 0, lowStock: 0, distinctCategories: 0 });

    // View State
    const [viewMode, setViewMode] = useState('list'); // 'grid' | 'list'
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'Available', 'Out of Stock'

    // Selection State
    const [selectedBooks, setSelectedBooks] = useState([]);

    // Modal & Form State
    const [showFormModal, setShowFormModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        book_name: '', author: '', category: 'General', total_quantity: 1
    });
    const [imageFile, setImageFile] = useState(null);
    const [pdfFile, setPdfFile] = useState(null);

    // Import State
    const [uploadFile, setUploadFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);

    const CATEGORIES = [
        'Programming', 'Operating Systems', 'Networking & Security', 'Database Management',
        'Web Development', 'Hardware & Electronics', 'Mathematics & General', 'Other'
    ];

    useEffect(() => {
        fetchBooks();
    }, []);

    // Also update stats when books change
    useEffect(() => {
        const safeBooks = Array.isArray(books) ? books : [];
        setStats({
            total: safeBooks.reduce((acc, b) => acc + (parseInt(b.total_quantity) || 0), 0),
            available: safeBooks.reduce((acc, b) => acc + (parseInt(b.available_quantity) || 0), 0),
            ebooks: safeBooks.filter(b => b.pdf_url).length,
            distinctCategories: new Set(safeBooks.map(b => b.category)).size
        });
    }, [books]);

    const fetchBooks = async () => {
        try {
            const res = await api.get('/books');
            setBooks(Array.isArray(res.data) ? res.data : []);
            setSelectedBooks([]);
        } catch (error) {
            setBooks([]);
            toast.error('Failed to fetch books');
        }
    };

    // --- Actions ---

    const handleEdit = (book) => {
        setFormData({
            book_name: book.book_name,
            author: book.author,
            category: book.category || 'General',
            total_quantity: book.total_quantity,
            _initial_total: book.total_quantity,
            _initial_available: book.available_quantity
        });
        setEditingId(book.id);
        setImageFile(null);
        setPdfFile(null);
        setShowFormModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this book?')) return;
        try {
            await api.delete(`/books/${id}`);
            toast.success('Book deleted');
            fetchBooks();
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedBooks.length} books?`)) return;
        try {
            await api.post('/books/bulk-delete', { ids: selectedBooks });
            toast.success('Books deleted');
            fetchBooks();
        } catch (error) {
            toast.error('Bulk delete failed');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        data.append('book_name', formData.book_name);
        data.append('author', formData.author);
        data.append('category', formData.category);
        data.append('total_quantity', formData.total_quantity);

        // Calculate available quantity intelligently
        let finalAvailable;
        if (editingId) {
            const diff = parseInt(formData.total_quantity) - parseInt(formData._initial_total);
            finalAvailable = parseInt(formData._initial_available) + diff;
            if (finalAvailable < 0) finalAvailable = 0; // Prevent negative stock
        } else {
            finalAvailable = formData.total_quantity;
        }
        data.append('available_quantity', finalAvailable);

        if (imageFile) data.append('image', imageFile);
        if (pdfFile) data.append('pdf', pdfFile);

        try {
            if (editingId) {
                await api.put(`/books/${editingId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Book updated');
            } else {
                await api.post('/books', data, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Book added');
            }
            fetchBooks();
            closeFormModal();
        } catch (error) {
            toast.error('Operation failed');
        }
    };

    const closeFormModal = () => {
        setShowFormModal(false);
        setEditingId(null);
        setFormData({ book_name: '', author: '', category: 'General', total_quantity: 1 });
        setImageFile(null);
        setPdfFile(null);
    };

    // --- Import Logic ---

    const handlePreviewUpload = async () => {
        if (!uploadFile) return;
        const data = new FormData();
        data.append('file', uploadFile);
        const toastId = toast.loading('Parsing file...');
        try {
            const res = await api.post('/books/bulk-preview', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(`Found ${res.data.count} books.`, { id: toastId });
            setPreviewData(res.data.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Parse failed', { id: toastId });
        }
    };

    const confirmImport = async () => {
        if (!uploadFile) return;
        const data = new FormData();
        data.append('file', uploadFile);
        const toastId = toast.loading('Saving books...');
        try {
            const res = await api.post('/books/bulk-upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(res.data.message, { id: toastId });
            setShowImportModal(false);
            setPreviewData(null);
            setUploadFile(null);
            fetchBooks();
        } catch (err) {
            toast.error('Upload failed', { id: toastId });
        }
    };

    const handleExportCSV = () => {
        if (books.length === 0) return toast.error('No books to export');
        const headers = ['Book Name', 'Author', 'Category', 'Total Quantity', 'Available Quantity'];
        const csvContent = [headers.join(','), ...books.map(b => `"${b.book_name}","${b.author}","${b.category || ''}",${b.total_quantity},${b.available_quantity}`)].join('\n');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
        link.download = `books_export.csv`;
        link.click();
    };

    // --- Filter Logic ---

    const filteredBooks = books.filter(book => {
        const matchesSearch = (
            book.book_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.author.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const matchesCategory = filterCategory ? book.category === filterCategory : true;

        let matchesStatus = true;
        if (filterStatus === 'Available') matchesStatus = book.available_quantity > 0;
        if (filterStatus === 'Out of Stock') matchesStatus = book.available_quantity === 0;
        if (filterStatus === 'E-Books') matchesStatus = !!book.pdf_url; // New Filter

        return matchesSearch && matchesCategory && matchesStatus;
    });

    return (
        <div className="space-y-6">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        Library Holdings
                        <button onClick={fetchBooks} className="text-gray-400 hover:text-blue-600 transition p-1 rounded-full hover:bg-blue-50" title="Refresh Data">
                            <RiLayoutGridFill className="rotate-45" size={18} />
                        </button>
                    </h1>
                    <p className="text-sm text-slate-500">Manage your book collection</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-slate-600 rounded-lg text-sm hover:bg-gray-50 transition">
                        <RiDownloadLine /> Export
                    </button>
                    <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-slate-600 rounded-lg text-sm hover:bg-gray-50 transition">
                        <RiUploadCloud2Line /> Import
                    </button>
                    <button onClick={() => { setShowFormModal(true); setEditingId(null); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition font-medium shadow-sm shadow-blue-200">
                        <RiAddLine /> Add Book
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div onClick={() => setFilterStatus('All')} className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition border-l-4 border-l-blue-500">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><RiBookLine size={24} /></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">Total Inventory</p>
                        <p className="text-2xl font-bold text-slate-800" title={`${books.length} distinct titles`}>{stats.total}</p>
                    </div>
                </div>
                <div onClick={() => setFilterStatus('Available')} className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition border-l-4 border-l-emerald-500">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><RiBookOpenLine size={24} /></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">Available</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.available}</p>
                    </div>
                </div>
                {/* Replaced Low Stock with E-Books for better visibility as requested */}
                <div onClick={() => setFilterStatus('E-Books')} className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition border-l-4 border-l-red-500">
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg"><RiDownloadLine size={24} /></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">Digital Books</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.ebooks || 0}</p>
                    </div>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 border-l-4 border-l-purple-500">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><RiFilter3Line size={24} /></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">Categories</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.distinctCategories}</p>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10">
                <div className="flex w-full md:w-auto gap-4 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by title or author..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <select
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="">All Categories</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value="Available">Available</option>
                        <option value="Out of Stock">Out of Stock</option>
                        <option value="E-Books">E-Books Only</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 border-l pl-4 border-gray-200">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <RiLayoutGridFill size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <RiListCheck size={20} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {selectedBooks.length > 0 && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center border border-red-100">
                    <span className="font-medium flex items-center gap-2"><RiDeleteBinLine /> {selectedBooks.length} items selected</span>
                    <button onClick={handleBulkDelete} className="px-3 py-1 bg-white border border-red-200 rounded shadow-sm hover:bg-red-50 text-sm font-bold">Delete Selected</button>
                </div>
            )}

            {viewMode === 'list' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs">
                                <tr>
                                    <th className="px-6 py-4 w-10">
                                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            onChange={(e) => setSelectedBooks(e.target.checked ? books.map(b => b.id) : [])}
                                            checked={books.length > 0 && selectedBooks.length === books.length}
                                        />
                                    </th>
                                    <th className="px-6 py-4">Book Details</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-center">Qty (Avail/Total)</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredBooks.map(book => (
                                    <tr key={book.id} className="hover:bg-slate-50 transition group">
                                        <td className="px-6 py-4">
                                            <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={selectedBooks.includes(book.id)}
                                                onChange={(e) => setSelectedBooks(e.target.checked ? [...selectedBooks, book.id] : selectedBooks.filter(id => id !== book.id))}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-14 bg-gray-100 rounded overflow-hidden flex-shrink-0 border border-gray-200 relative">
                                                    {book.image_url ? (
                                                        <img src={`${SERVER_URL}/${book.image_url}`} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-gray-300"><RiBookLine /></div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 line-clamp-1 flex items-center gap-2">
                                                        {book.book_name}
                                                        {book.pdf_url && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">PDF</span>}
                                                    </p>
                                                    <p className="text-slate-500 text-xs">{book.author}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{book.category}</span></td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${book.available_quantity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {book.available_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono text-xs">
                                            <span className="font-bold text-slate-700">{book.available_quantity}</span>
                                            <span className="text-gray-400 mx-1">/</span>
                                            <span className="text-gray-500">{book.total_quantity}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {book.pdf_url && (
                                                <a href={`${SERVER_URL}/${book.pdf_url}`} target="_blank" rel="noopener noreferrer" className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="View PDF">
                                                    <RiDownloadLine />
                                                </a>
                                            )}
                                            <button onClick={() => handleEdit(book)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"><RiEditLine /></button>
                                            <button onClick={() => handleDelete(book.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"><RiDeleteBinLine /></button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredBooks.length === 0 && (
                                    <tr><td colSpan="6" className="text-center py-12 text-gray-400">No books found matching your criteria.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredBooks.map(book => (
                        <div key={book.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group relative">
                            <div className="aspect-[2/3] bg-gray-100 relative overflow-hidden">
                                {book.image_url ? (
                                    <img src={`${SERVER_URL}/${book.image_url}`} className="w-full h-full object-cover transition" alt="" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-300 text-4xl"><RiBookLine /></div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                    {book.pdf_url && (
                                        <a href={`${SERVER_URL}/${book.pdf_url}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-white text-red-600 rounded-full transition shadow-lg" title="View PDF">
                                            <RiDownloadLine />
                                        </a>
                                    )}
                                    <button onClick={() => handleEdit(book)} className="p-3 bg-white text-blue-600 rounded-full transition shadow-lg"><RiEditLine /></button>
                                    <button onClick={() => handleDelete(book.id)} className="p-3 bg-white text-red-600 rounded-full transition shadow-lg"><RiDeleteBinLine /></button>
                                </div>
                                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                    {book.available_quantity === 0 && <span className="bg-red-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded">Stock Out</span>}
                                    {book.pdf_url && <span className="bg-red-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded flex items-center gap-1"><RiDownloadLine size={10} /> PDF</span>}
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-slate-800 line-clamp-1 mb-1" title={book.book_name}>{book.book_name}</h3>
                                <p className="text-xs text-slate-500 mb-2">{book.author}</p>
                                <div className="flex justify-between items-center text-xs text-gray-400 border-t pt-2 border-gray-100">
                                    <span>{book.category}</span>
                                    <span className={book.available_quantity > 0 ? 'text-emerald-600 font-bold' : 'text-red-500'}>{book.available_quantity} Left</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showFormModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Book' : 'Add New Book'}</h2>
                            <button onClick={closeFormModal} className="p-2 hover:bg-gray-100 rounded-full transition"><RiCloseLine size={24} /></button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Book Title</label>
                                    <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.book_name} onChange={(e) => setFormData({ ...formData, book_name: e.target.value })} required placeholder="e.g. Design Patterns"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Author</label>
                                        <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                        <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                            value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Quantity</label>
                                    <input type="number" min="1" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.total_quantity} onChange={(e) => setFormData({ ...formData, total_quantity: e.target.value })} required
                                    />
                                </div>

                                <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-3">Attachments</p>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm w-20">Cover Img:</span>
                                            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="text-sm text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm w-20">PDF File:</span>
                                            <input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files[0])} className="text-sm text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <button type="button" onClick={closeFormModal} className="flex-1 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-slate-600">Cancel</button>
                                    <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-500/30">
                                        {editingId ? 'Save Changes' : 'Create Book'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">Import Books</h2>
                            <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition"><RiCloseLine size={24} /></button>
                        </div>
                        <div className="p-6">
                            {!previewData ? (
                                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition cursor-pointer relative">
                                    <input type="file" accept=".xlsx, .xls, .csv, .ods, .pdf" onChange={(e) => setUploadFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    <div className="pointer-events-none">
                                        <RiUploadCloud2Line className="mx-auto text-4xl text-gray-400 mb-2" />
                                        <p className="font-medium text-slate-600">{uploadFile ? uploadFile.name : 'Click to upload Excel, CSV or PDF'}</p>
                                        <p className="text-xs text-slate-400 mt-1">Supported formats: .xlsx, .csv, .ods, .pdf</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col max-h-96">
                                    <div className="p-2 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider text-center">Previewing {previewData.length} Items</div>
                                    <div className="overflow-y-auto flex-1">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-2">Title</th>
                                                    <th className="px-4 py-2">Author</th>
                                                    <th className="px-4 py-2">Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData.map((item, idx) => (
                                                    <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                                                        <td className="px-4 py-2">{item.book_name}</td>
                                                        <td className="px-4 py-2">{item.author}</td>
                                                        <td className="px-4 py-2">{item.qty}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 flex justify-end gap-3">
                                {previewData ? (
                                    <>
                                        <button onClick={() => { setPreviewData(null); setUploadFile(null); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Back</button>
                                        <button onClick={confirmImport} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">Confirm Import</button>
                                    </>
                                ) : (
                                    <button onClick={handlePreviewUpload} disabled={!uploadFile} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed">Preview Data</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BooksManager;
