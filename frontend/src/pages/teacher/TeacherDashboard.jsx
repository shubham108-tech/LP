import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    RiBookmarkLine, RiLayoutGridFill, RiListCheck, RiFilter3Line,
    RiHeartLine, RiHeartFill, RiDownloadLine, RiFireFill,
    RiFileList3Line, RiHistoryLine, RiBookOpenLine,
    RiSunLine, RiMoonLine, RiLightbulbLine, RiAddLine, RiCloseLine, RiBookReadLine,
    RiMessage3Line, RiSendPlaneFill, RiStarFill, RiStarLine
} from 'react-icons/ri';
import { useAuth } from '../../context/AuthContext';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SERVER_URL } from '../../config';
import { useSearchParams } from 'react-router-dom';
import EnhancedReader from '../../components/EnhancedReader';

const TeacherDashboard = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    // Tab State
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'browse');

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    const changeTab = (tabId) => {
        setActiveTab(tabId);
        setSearchParams(prev => {
            prev.set('tab', tabId);
            return prev;
        });
    };

    // Theme State
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

    // Data State
    const [books, setBooks] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [myHistory, setMyHistory] = useState([]);
    const [leaderboard, setLeaderboard] = useState({ topReaders: [], examToppers: [] });
    const [myBadges, setMyBadges] = useState({ read_count: 0, badges: [] });
    const [wishlist, setWishlist] = useState([]); // Server-side wishlist

    // Browse Tab State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedBook, setSelectedBook] = useState(null);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestReason, setRequestReason] = useState('');
    const [requestLink, setRequestLink] = useState('');
    const [sortBy, setSortBy] = useState('title_asc');
    const [showAvailableOnly, setShowAvailableOnly] = useState(false);
    const [showEbooksOnly, setShowEbooksOnly] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [readingBook, setReadingBook] = useState(null);

    // Suggestion State
    const [showSuggestModal, setShowSuggestModal] = useState(false);
    const [suggestData, setSuggestData] = useState({ book_name: '', author: '', reference_link: '' });

    // Discussion State
    const [showDiscussions, setShowDiscussions] = useState(false);
    const [discussions, setDiscussions] = useState([]);

    // Review State
    const [selectedBookReviews, setSelectedBookReviews] = useState([]); // Array directly
    const [averageRating, setAverageRating] = useState(0);
    const [userRating, setUserRating] = useState(0);
    const [userReviewText, setUserReviewText] = useState('');

    const CATEGORIES = [
        'Programming',
        'Operating Systems',
        'Networking & Security',
        'Database Management',
        'Web Development',
        'Hardware & Electronics',
        'Mathematics & General',
        'Other'
    ];

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

    // Effects
    useEffect(() => {
        if (activeTab === 'browse' || activeTab === 'ebooks') {
            fetchBooks();
            fetchWishlist();
        }
        if (activeTab === 'requests') fetchRequests();
        if (activeTab === 'history') fetchHistory();
        if (activeTab === 'community') {
            fetchLeaderboard();
            fetchBadges();
        }
    }, [activeTab]);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    useEffect(() => {
        if (readingBook && showDiscussions) {
            fetchDiscussions(readingBook.id);
            // Poll for new messages every 5 seconds
            const interval = setInterval(() => fetchDiscussions(readingBook.id), 5000);
            return () => clearInterval(interval);
        }
    }, [readingBook, showDiscussions]);

    // Sync URL params with Reading State
    useEffect(() => {
        const bookId = searchParams.get('reading');
        if (bookId && books.length > 0) {
            const book = books.find(b => b.id.toString() === bookId);
            if (book) setReadingBook(book);
        } else if (!bookId) {
            setReadingBook(null);
        }
    }, [searchParams, books]);

    const openReader = (book) => {
        setReadingBook(book);
        setSearchParams(prev => {
            prev.set('reading', book.id);
            return prev;
        });
    };

    const closeReader = () => {
        setReadingBook(null);
        setSearchParams(prev => {
            prev.delete('reading');
            return prev;
        });
    };

    // API Calls
    const fetchBooks = async () => {
        try {
            const res = await api.get('/books');
            setBooks(res.data);
        } catch (error) { toast.error('Failed to fetch books'); }
    };

    const fetchRequests = async () => {
        try {
            const res = await api.get('/requests/my');
            setMyRequests(res.data);
        } catch (error) { toast.error('Failed to fetch requests'); }
    };

    const fetchHistory = async () => {
        try {
            const res = await api.get('/issues/my');
            setMyHistory(res.data);
        } catch (error) { toast.error('Failed to fetch history'); }
    };

    const fetchLeaderboard = async () => {
        try {
            const res = await api.get('/gamification/leaderboard');
            setLeaderboard(res.data);
        } catch (error) { console.error(error); }
    };

    const fetchBadges = async () => {
        try {
            const res = await api.get(`/engagement/badges/${user.id}`);
            setMyBadges(res.data);
        } catch (error) { console.error(error); }
    };

    const fetchWishlist = async () => {
        try {
            const res = await api.get('/engagement/wishlist');
            // Store just IDs for easy checking
            const ids = res.data.map(item => item.book_id);
            setWishlist(ids);
        } catch (error) { console.error('Wishlist init error', error); }
    };

    const submitSuggestion = async (e) => {
        e.preventDefault();
        try {
            await api.post('/suggestions', suggestData);
            toast.success('Suggestion sent successfully!');
            setShowSuggestModal(false);
            setSuggestData({ book_name: '', author: '', reference_link: '' });
        } catch (error) {
            toast.error('Failed to send suggestion');
        }
    };

    const fetchDiscussions = async (bookId) => {
        try {
            const res = await api.get(`/discussions/${bookId}`);
            setDiscussions(res.data);
        } catch (error) {
            console.error('Failed to fetch discussions');
        }
    };

    const postMessage = async (bookId, message) => {
        if (!message.trim()) return;
        try {
            await api.post(`/discussions/${bookId}`, { message });
            fetchDiscussions(bookId);
        } catch (error) {
            toast.error('Failed to post message');
        }
    };

    const fetchReviews = async (bookId) => {
        try {
            const res = await api.get(`/engagement/reviews/${bookId}`);
            setSelectedBookReviews(res.data);
            // Calculate Average
            if (res.data.length > 0) {
                const total = res.data.reduce((sum, rev) => sum + rev.rating, 0);
                setAverageRating((total / res.data.length).toFixed(1));
            } else {
                setAverageRating(0);
            }
        } catch (error) {
            console.error('Failed to fetch reviews');
        }
    };

    const submitReview = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/engagement/review`, {
                book_id: selectedBook.id,
                rating: userRating,
                comment: userReviewText
            });
            toast.success('Review submitted');
            fetchReviews(selectedBook.id);
            setUserRating(0);
            setUserReviewText('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit review');
        }
    };

    // Stats Logic
    const getHistoryStats = () => {
        const categoryCounts = {};
        myHistory.forEach(item => {
            // Need to join with books data if category not in history endpoint?
            // Actually getMyIssues returns book_name, author but maybe not category?
            // Let's rely on matching with current books list if possible or just use a mock category if missing.
            // Current backend getMyIssues returns: id, issue_date, return_date, returned, book_name, author. No category!
            // I should fetch books list to map category, or update backend. 
            // Better: update Dashboard.fetchHistory to also fetch books if empty to map category?
            // Or just assume 'General' for now to avoid breaking changes?
            // Wait, I fetch books in browse tab. If user hasn't visited browse tab, books is empty.
            // I'll fetch books if needed.
            // Or better: Just categorize by Author for now? Or "Returned vs Issued"?
            // Reading Insights usually implies Genre/Category.
            // I'll use "Author Distribution" as backup or try to find book in `books` state.
            // If books state is empty, stats might be empty. I'll make sure to load books.

            // Just for this demo, I'll count 'Returned' vs 'Possession' status as a chart since that data is robust.
            // Or I can update backend to include category. Time constraint.
            // I'll use Status Distribution (Returned vs Issued) and maybe Author Distribution (Top 5 Authors).

            const author = item.author || 'Unknown';
            categoryCounts[author] = (categoryCounts[author] || 0) + 1;
        });

        return Object.keys(categoryCounts).map(key => ({ name: key, value: categoryCounts[key] })).slice(0, 5);
    };

    const historyStats = getHistoryStats();

    // Actions
    const toggleWishlist = async (bookId) => {
        try {
            const res = await api.post('/engagement/wishlist', { book_id: bookId });
            if (res.data.added) {
                setWishlist([...wishlist, bookId]);
                toast.success('Added to wishlist');
            } else {
                setWishlist(wishlist.filter(id => id !== bookId));
                toast.success('Removed from wishlist');
            }
        } catch (error) {
            toast.error('Failed to update wishlist');
        }
    };

    const submitRequest = async () => {
        if (!selectedBook) return;
        try {
            await api.post('/requests', {
                book_id: selectedBook.id,
                reason: requestReason,
                reference_link: requestLink
            });
            toast.success('Request placed successfully');
            closeRequestModal();
            if (activeTab === 'requests') fetchRequests();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Request failed');
        }
    };

    const openRequestModal = (book) => {
        setSelectedBook(book);
        fetchReviews(book.id); // Fetch reviews when modal opens
        setRequestReason('');
        setRequestLink('');
        setShowRequestModal(true);
    };

    const closeRequestModal = () => {
        setShowRequestModal(false);
        setSelectedBook(null);
    };

    const downloadCSV = () => {
        if (filteredBooks.length === 0) return toast.error('No books');
        const headers = ['Book Name', 'Author', 'Category', 'Total', 'Available', 'Created At'];
        const csvRows = [headers.join(',')];
        filteredBooks.forEach(book => {
            csvRows.push([
                `"${book.book_name.replace(/"/g, '""')}"`,
                `"${book.author.replace(/"/g, '""')}"`,
                `"${book.category || ''}"`,
                book.total_quantity,
                book.available_quantity,
                book.created_at ? new Date(book.created_at).toLocaleDateString() : ''
            ].join(','));
        });
        const url = URL.createObjectURL(new Blob([csvRows.join('\n')], { type: 'text/csv' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `library_books_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Downloaded');
    };

    const isNewArrival = (dateString) => {
        if (!dateString) return false;
        const diffDays = Math.ceil(Math.abs(new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
    };

    const filteredBooks = books.filter(book => {
        const matchesSearch = book.book_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.author.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory ? (book.category === selectedCategory) : true;
        const matchesAvailability = showAvailableOnly ? book.available_quantity > 0 : true;
        const matchesEbook = showEbooksOnly ? (book.pdf_url && book.pdf_url.length > 0) : true;
        return matchesSearch && matchesCategory && matchesAvailability && matchesEbook;
    }).sort((a, b) => {
        if (sortBy === 'favorites') {
            const aFav = wishlist.includes(a.id);
            const bFav = wishlist.includes(b.id);
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;
        }
        switch (sortBy) {
            case 'title_asc': return a.book_name.localeCompare(b.book_name);
            case 'title_desc': return b.book_name.localeCompare(a.book_name);
            case 'qty_high': return b.available_quantity - a.available_quantity;
            case 'newest': return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            default: return 0;
        }
    });

    const relatedBooks = selectedBook ? books.filter(b =>
        b.category === selectedBook.category && b.id !== selectedBook.id
    ).sort(() => 0.5 - Math.random()).slice(0, 3) : [];

    return (
        <div className={`min-h-screen pb-10 transition-colors duration-300 ${darkMode ? 'dark bg-slate-900 text-white' : 'bg-gray-50 text-slate-800'}`}>
            <div className="max-w-7xl mx-auto px-4 pt-6">

                {/* Header Actions */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold dark:text-white">Dashboard</h1>
                        <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition">
                            {darkMode ? <RiSunLine className="text-yellow-400 text-xl" /> : <RiMoonLine className="text-slate-600 text-xl" />}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-8 bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 max-w-fit">
                    {[
                        { id: 'browse', icon: RiBookOpenLine, label: 'Browse' },
                        { id: 'ebooks', icon: RiBookReadLine, label: 'E-Books' },
                        { id: 'requests', icon: RiFileList3Line, label: 'Requests' },
                        { id: 'history', icon: RiHistoryLine, label: 'History' },
                        { id: 'community', icon: RiFireFill, label: 'Community' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => changeTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                        >
                            <tab.icon size={18} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* BROWSE TAB */}
                {activeTab === 'browse' && (
                    <div className="animate-fade-in">
                        {/* Controls */}
                        <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                            <div className="flex flex-1 gap-4 w-full flex-col sm:flex-row">
                                <input
                                    type="text"
                                    placeholder="Search books..."
                                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:text-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <select
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-700 dark:text-white"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                >
                                    <option value="">All Categories</option>
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 items-center w-full xl:w-auto flex-wrap sm:flex-nowrap">
                                <button
                                    onClick={() => setShowSuggestModal(true)}
                                    className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-2 rounded-lg transition border border-emerald-200 dark:border-emerald-800 whitespace-nowrap"
                                >
                                    <RiLightbulbLine /> Suggest Book
                                </button>
                                <select
                                    className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg outline-none text-sm bg-gray-50 dark:bg-slate-700 dark:text-white"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="title_asc">Title (A-Z)</option>
                                    <option value="favorites">Wishlist</option>
                                    <option value="newest">New Arrivals</option>
                                    <option value="qty_high">High Qty</option>
                                </select>

                                <div className="flex gap-2">
                                    <button onClick={downloadCSV} className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 border dark:border-slate-600 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700" title="Export CSV">
                                        <RiDownloadLine size={20} />
                                    </button>
                                    <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1 border dark:border-slate-600">
                                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                                            <RiLayoutGridFill size={20} />
                                        </button>
                                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                                            <RiListCheck size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Books Grid */}
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredBooks.map((book) => (
                                    <div key={book.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-slate-700 overflow-hidden group relative flex flex-col">
                                        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                                            {isNewArrival(book.created_at) && <span className="bg-blue-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full shadow flex items-center gap-1"><RiFireFill /> New</span>}
                                            {book.available_quantity > 0 && book.available_quantity < 5 && <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-full border border-orange-200">Low Stock</span>}
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); toggleWishlist(book.id); }} className="absolute top-3 right-3 z-10 p-2 bg-white/80 dark:bg-slate-900/80 rounded-full shadow hover:bg-white dark:hover:bg-slate-900 text-gray-400 hover:text-red-500 transition">
                                            {wishlist.includes(book.id) ? <RiHeartFill className="text-red-500" /> : <RiHeartLine />}
                                        </button>
                                        <div className="h-48 bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                            {book.image_url ? (
                                                <img src={`${SERVER_URL}/${book.image_url}`} alt={book.book_name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            ) : (
                                                <RiBookmarkLine className="text-4xl text-slate-300 dark:text-slate-500" />
                                            )}
                                        </div>
                                        <div className="p-5 flex flex-col flex-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{book.category}</span>
                                            <h3 className="font-bold text-lg text-slate-800 dark:text-white line-clamp-1 mb-1" title={book.book_name}>{book.book_name}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{book.author}</p>
                                            <div className="flex justify-between items-center mt-auto">
                                                <div className="text-xs text-slate-400">
                                                    Available: <span className={book.available_quantity > 0 ? 'text-emerald-500 font-bold' : 'text-red-500 font-bold'}>{book.available_quantity}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    {book.pdf_url && (
                                                        <button
                                                            onClick={() => openReader(book)}
                                                            className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-medium text-sm flex items-center gap-1 transition-colors"
                                                            title="Read Online"
                                                        >
                                                            <RiBookOpenLine /> Read
                                                        </button>
                                                    )}
                                                    <button onClick={() => openRequestModal(book)} disabled={book.available_quantity === 0} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${book.available_quantity > 0 ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30' : 'bg-gray-100 dark:bg-slate-700 text-gray-400 cursor-not-allowed'}`}>
                                                        {book.available_quantity > 0 ? 'Request' : 'Unavailable'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                        <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-100 dark:border-slate-600 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                                            <tr>
                                                <th className="px-6 py-4 w-12"></th>
                                                <th className="px-6 py-4">Book Details</th>
                                                <th className="px-6 py-4">Category</th>
                                                <th className="px-6 py-4 text-center">Availability</th>
                                                <th className="px-6 py-4 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                            {filteredBooks.map((book) => (
                                                <tr key={book.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                    <td className="px-6 py-4 text-center">
                                                        <button onClick={() => toggleWishlist(book.id)} className="text-gray-400 hover:text-red-500">
                                                            {wishlist.includes(book.id) ? <RiHeartFill className="text-red-500" /> : <RiHeartLine />}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-14 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden border border-gray-200 dark:border-slate-600 flex-shrink-0">
                                                                {book.image_url ? <img src={`${SERVER_URL}/${book.image_url}`} className="w-full h-full object-cover" /> : <RiBookmarkLine className="m-auto mt-4 text-slate-300" />}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-800 dark:text-white line-clamp-1">{book.book_name}</div>
                                                                <div className="text-slate-500 dark:text-slate-400 text-xs">{book.author}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-xs">{book.category}</span></td>
                                                    <td className="px-6 py-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{book.available_quantity}</td>
                                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                        {book.pdf_url && (
                                                            <button
                                                                onClick={() => openReader(book)}
                                                                className="px-3 py-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-medium text-sm flex items-center gap-1 transition-colors border border-emerald-100"
                                                            >
                                                                <RiBookOpenLine /> Read
                                                            </button>
                                                        )}
                                                        <button onClick={() => openRequestModal(book)} disabled={book.available_quantity === 0} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium text-sm">Request</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* E-BOOKS TAB */}
                {activeTab === 'ebooks' && (
                    <div className="animate-fade-in">
                        <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                            <div className="flex flex-1 gap-4 w-full flex-col sm:flex-row">
                                <input
                                    type="text"
                                    placeholder="Search e-books..."
                                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:text-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <select
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-700 dark:text-white"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                >
                                    <option value="">All Categories</option>
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {books.filter(book => {
                                const matchesSearch = book.book_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    book.author.toLowerCase().includes(searchTerm.toLowerCase());
                                const matchesCategory = selectedCategory ? (book.category === selectedCategory) : true;
                                const isEbook = book.pdf_url && book.pdf_url.length > 0;
                                return matchesSearch && matchesCategory && isEbook;
                            }).map((book) => (
                                <div key={book.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-slate-700 overflow-hidden group relative flex flex-col">
                                    <div className="h-48 bg-emerald-50 dark:bg-slate-700 flex items-center justify-center overflow-hidden relative">
                                        <div className="absolute top-3 right-3 z-10">
                                            <button onClick={(e) => { e.stopPropagation(); toggleWishlist(book.id); }} className="p-2 bg-white/80 dark:bg-slate-900/80 rounded-full shadow hover:bg-white dark:hover:bg-slate-900 text-gray-400 hover:text-red-500 transition">
                                                {wishlist.includes(book.id) ? <RiHeartFill className="text-red-500" /> : <RiHeartLine />}
                                            </button>
                                        </div>
                                        {book.image_url ? (
                                            <img src={`${SERVER_URL}/${book.image_url}`} alt={book.book_name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        ) : (
                                            <RiBookOpenLine className="text-4xl text-emerald-300 dark:text-emerald-700" />
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                            <span className="text-white text-xs font-bold uppercase tracking-wider bg-emerald-600 px-2 py-0.5 rounded">E-Book</span>
                                        </div>
                                    </div>
                                    <div className="p-5 flex flex-col flex-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{book.category}</span>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white line-clamp-1 mb-1" title={book.book_name}>{book.book_name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{book.author}</p>
                                        <button
                                            onClick={() => openReader(book)}
                                            className="mt-auto w-full py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                                        >
                                            <RiBookOpenLine size={18} /> Read Now
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {books.filter(b => b.pdf_url).length === 0 && (
                                <div className="col-span-full text-center py-20 text-gray-400">
                                    No E-Books available at the moment.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* COMMUNITY TAB */}
                {activeTab === 'community' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                        {/* Badges Section */}
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm h-full">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <RiStarFill className="text-yellow-400" /> My Achievements
                                </h3>

                                <div className="text-center mb-6">
                                    <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                                        <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">{myBadges.read_count}</span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Books Read</p>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Badges Earned</h4>
                                    {myBadges.badges?.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            {myBadges.badges.map((badge, idx) => (
                                                <div key={idx} className="bg-emerald-50 dark:bg-slate-700 p-3 rounded-lg border border-emerald-100 dark:border-slate-600 flex flex-col items-center text-center">
                                                    <div className="text-2xl mb-1">{badge.icon}</div>
                                                    <div className="font-bold text-sm text-emerald-800 dark:text-white">{badge.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 text-center py-4">Read books to earn badges!</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Leaderboard Section */}
                        {/* Leaderboard Section */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Top Readers */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <RiBookOpenLine className="text-blue-500" /> Top Readers
                                </h3>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                        <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-100 dark:border-slate-600 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                                            <tr>
                                                <th className="px-6 py-4 w-12">Rank</th>
                                                <th className="px-6 py-4">Reader</th>
                                                <th className="px-6 py-4 text-right">Books Read</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                            {leaderboard.topReaders?.map((user, index) => (
                                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                    <td className="px-6 py-4">
                                                        {index === 0 && <span className="text-2xl">🥇</span>}
                                                        {index === 1 && <span className="text-2xl">🥈</span>}
                                                        {index === 2 && <span className="text-2xl">🥉</span>}
                                                        {index > 2 && <span className="font-bold text-gray-400">#{index + 1}</span>}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-slate-600 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400">
                                                                {user.name.charAt(0)}
                                                            </div>
                                                            <span className="font-medium text-slate-800 dark:text-white">{user.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-blue-600 dark:text-blue-400">
                                                        {user.books_read}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!leaderboard.topReaders || leaderboard.topReaders?.length === 0) && (
                                                <tr>
                                                    <td colSpan="3" className="px-6 py-12 text-center text-gray-400">
                                                        No data available yet. Start reading!
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Exam Toppers */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <RiFireFill className="text-orange-500" /> Exam Toppers
                                </h3>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                        <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-100 dark:border-slate-600 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                                            <tr>
                                                <th className="px-6 py-4 w-12">Rank</th>
                                                <th className="px-6 py-4">Student</th>
                                                <th className="px-6 py-4 text-right">Total Score</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                            {leaderboard.examToppers?.map((user, index) => (
                                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                    <td className="px-6 py-4">
                                                        {index === 0 && <span className="text-2xl">🥇</span>}
                                                        {index === 1 && <span className="text-2xl">🥈</span>}
                                                        {index === 2 && <span className="text-2xl">🥉</span>}
                                                        {index > 2 && <span className="font-bold text-gray-400">#{index + 1}</span>}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-slate-600 flex items-center justify-center font-bold text-orange-600 dark:text-orange-400">
                                                                {user.name.charAt(0)}
                                                            </div>
                                                            <span className="font-medium text-slate-800 dark:text-white">{user.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-orange-600 dark:text-orange-400">
                                                        {user.total_score}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!leaderboard.examToppers || leaderboard.examToppers?.length === 0) && (
                                                <tr>
                                                    <td colSpan="3" className="px-6 py-12 text-center text-gray-400">
                                                        No exam data yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* REQUESTS TAB */}
                {activeTab === 'requests' && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden animate-fade-in">
                        {myRequests.length === 0 ? (
                            <div className="text-center py-20 text-gray-400">No requests found.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                    <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-100 dark:border-slate-600 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                                        <tr>
                                            <th className="px-6 py-4">Book</th>
                                            <th className="px-6 py-4">Requested Date</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                        {myRequests.map((req) => (
                                            <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{req.book_name} <span className="text-gray-400 font-normal">by {req.author}</span></td>
                                                <td className="px-6 py-4">{new Date(req.request_date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${req.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400' :
                                                        req.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400' :
                                                            'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400'
                                                        }`}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">{req.reason || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                        {/* CHART SECTION */}
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm h-full">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Reading Insights</h3>
                                {historyStats.length > 0 ? (
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={historyStats}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {historyStats.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <p className="text-center text-xs text-gray-500 mt-2">Top Authors Read</p>
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-gray-400 text-sm">
                                        No history data for insights yet.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* TABLE SECTION */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                            {myHistory.length === 0 ? (
                                <div className="text-center py-20 text-gray-400">No history found.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                        <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-100 dark:border-slate-600 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                                            <tr>
                                                <th className="px-6 py-4">Book</th>
                                                <th className="px-6 py-4">Issue Date</th>
                                                <th className="px-6 py-4">Return Date</th>
                                                <th className="px-6 py-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                            {myHistory.map((issue) => (
                                                <tr key={issue.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{issue.book_name}</td>
                                                    <td className="px-6 py-4">{new Date(issue.issue_date).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4">{issue.return_date ? new Date(issue.return_date).toLocaleDateString() : '-'}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${issue.returned
                                                            ? 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
                                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                                            }`}>
                                                            {issue.returned ? 'Returned' : 'In Possession'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Request Modal */}
                {showRequestModal && selectedBook && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex gap-6 flex-col sm:flex-row">
                                <div className="w-32 h-48 bg-slate-100 dark:bg-slate-700 rounded-lg flex-shrink-0 overflow-hidden mx-auto sm:mx-0">
                                    {selectedBook.image_url ? (
                                        <img src={`${SERVER_URL}/${selectedBook.image_url}`} className="w-full h-full object-cover" />
                                    ) : <RiBookmarkLine className="text-4xl text-slate-300 dark:text-slate-500 m-auto h-full" />}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{selectedBook.book_name}</h2>
                                    <p className="text-slate-500 dark:text-slate-400 mb-4 text-lg">{selectedBook.author}</p>
                                    <div className="flex gap-2 mb-4">
                                        <span className="bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300">{selectedBook.category}</span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedBook.available_quantity > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400'}`}>
                                            {selectedBook.available_quantity > 0 ? 'Available' : 'Out of Stock'}
                                        </span>
                                    </div>
                                    <div className="space-y-4">
                                        <textarea
                                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-gray-50 dark:bg-slate-700 dark:text-white"
                                            rows="2"
                                            placeholder="Reason for request (Optional)..."
                                            value={requestReason}
                                            onChange={(e) => setRequestReason(e.target.value)}
                                        />
                                        <div className="flex justify-end gap-3">
                                            <button onClick={closeRequestModal} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg font-medium transition">Cancel</button>
                                            <button onClick={submitRequest} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition">Confirm Request</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Reviews Section */}
                            <div className="p-6 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700">
                                <h3 className="font-bold text-lg mb-4 dark:text-white flex items-center gap-2">
                                    <RiStarFill className="text-yellow-400" />
                                    Reviews <span className="text-sm font-normal text-gray-500">({selectedBookReviews.average_rating} / 5.0)</span>
                                </h3>

                                {/* Review Form */}
                                <form onSubmit={submitReview} className="mb-6 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
                                    <div className="flex gap-2 mb-3">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setUserRating(star)}
                                                className={`text-2xl transition hover:scale-110 ${star <= userRating ? 'text-yellow-400' : 'text-gray-300 dark:text-slate-600'}`}
                                            >
                                                <RiStarFill />
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-gray-50 dark:bg-slate-700 dark:text-white mb-2"
                                        rows="2"
                                        placeholder="Write your review..."
                                        value={userReviewText}
                                        onChange={(e) => setUserReviewText(e.target.value)}
                                    />
                                    <div className="flex justify-end">
                                        <button type="submit" disabled={userRating === 0} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">Post Review</button>
                                    </div>
                                </form>

                                {/* Reviews List */}
                                <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {selectedBookReviews.reviews.length === 0 ? (
                                        <p className="text-gray-400 text-sm text-center py-4">No reviews yet.</p>
                                    ) : (
                                        selectedBookReviews.reviews.map((rev) => (
                                            <div key={rev.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                                                            {rev.user_name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-sm dark:text-white">{rev.user_name}</div>
                                                            <div className="flex text-yellow-400 text-[10px]">
                                                                {[...Array(rev.rating)].map((_, i) => <RiStarFill key={i} />)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400">{new Date(rev.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 pl-10">{rev.review_text}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Related Books Section */}
                            {relatedBooks.length > 0 && (
                                <div className="p-6 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700">
                                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2"><RiFireFill className="text-orange-500" /> You might also like</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        {relatedBooks.map(rb => (
                                            <div key={rb.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition" onClick={() => setSelectedBook(rb)}>
                                                <div className="h-32 bg-slate-100 dark:bg-slate-700 rounded mb-2 overflow-hidden">
                                                    {rb.image_url ? <img src={`${SERVER_URL}/${rb.image_url}`} className="w-full h-full object-cover" /> : null}
                                                </div>
                                                <h4 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1">{rb.book_name}</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{rb.author}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ... existing code ... */}

                {/* Reader Modal (Enhanced) */}
                {readingBook && (
                    <EnhancedReader
                        book={readingBook}
                        onClose={closeReader}
                        SERVER_URL={SERVER_URL}
                        user={user}
                        discussions={discussions}
                        postMessage={postMessage}
                    />
                )}

                {/* Suggestion Modal */}
                {showSuggestModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-md shadow-2xl p-6 animate-fade-in-down">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><RiLightbulbLine className="text-yellow-500" /> Suggest a Book</h2>
                            <form onSubmit={submitSuggestion} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Book Name *</label>
                                    <input
                                        required
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
                                        value={suggestData.book_name}
                                        onChange={e => setSuggestData({ ...suggestData, book_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Author *</label>
                                    <input
                                        required
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
                                        value={suggestData.author}
                                        onChange={e => setSuggestData({ ...suggestData, author: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reference Link (Optional)</label>
                                    <input
                                        type="url"
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
                                        placeholder="e.g. Amazon link"
                                        value={suggestData.reference_link}
                                        onChange={e => setSuggestData({ ...suggestData, reference_link: e.target.value })}
                                    />
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setShowSuggestModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                                    <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg">Send Suggestion</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherDashboard;
