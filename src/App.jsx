import React, { useState, useRef, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { fillBondForm } from './utils/pdfGenerator';
import { Search, Plus, Upload, FileText, X, ChevronLeft, Copy, UserPlus, Save } from 'lucide-react';

export default function App() {
  // Formatting functions
  const formatPhone = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const formatDate = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  };

  const formatMoney = (value) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedCase, setSelectedCase] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({});
  const [newCharge, setNewCharge] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const { data: casesData, error: casesError } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (casesError) throw casesError;

      // Fetch related data for each case
      const casesWithDetails = await Promise.all(casesData.map(async (c) => {
        const { data: contacts } = await supabase.from('contacts').select('*').eq('case_id', c.id);
        const { data: documents } = await supabase.from('documents').select('*').eq('case_id', c.id);
        return { ...c, contacts: contacts || [], documents: documents || [] };
      }));

      setCases(casesWithDetails);
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c => {
    const query = searchQuery.toLowerCase();
    return (c.defendant_name?.toLowerCase() || '').includes(query) ||
      (c.defendant_booking_number?.toLowerCase() || '').includes(query) ||
      (c.caller_phone?.includes(query)) ||
      (c.case_number?.toLowerCase() || '').includes(query) ||
      (c.status?.toLowerCase() || '').includes(query);
  });

  const handleNewCase = () => {
    setFormData({
      caller_name: '', caller_phone: '', caller_email: '', caller_relationship: '',
      call_datetime: new Date().toISOString(),
      defendant_name: '', defendant_dob: '', defendant_booking_number: '',
      case_number: '', charges: [], bond_amount: '', jail_location: '',
      county: '', district: '', justice_court: '', court_type: 'District',
      form_number: '', contacts: [], bondsman_name: '', notes: '', status: 'Intake'
    });
    setNewCharge('');
    setCurrentView('newCase');
  };

  const handleCopyCallerToContact = () => {
    if (!formData.caller_name) {
      alert('Please fill in caller information first');
      return;
    }
    const newContact = {
      id: Date.now(), name: formData.caller_name, phone: formData.caller_phone,
      email: formData.caller_email, address: '', employer: '', ownership: 'Rent'
    };
    setFormData({ ...formData, contacts: [...(formData.contacts || []), newContact] });
  };

  const handleAddContact = () => {
    const newContact = {
      id: Date.now(), name: '', phone: '', email: '', address: '', employer: '', ownership: 'Rent'
    };
    setFormData({ ...formData, contacts: [...(formData.contacts || []), newContact] });
  };

  const handleUpdateContact = (contactId, field, value) => {
    setFormData({
      ...formData,
      contacts: formData.contacts.map(c => c.id === contactId ? { ...c, [field]: value } : c)
    });
  };

  const handleRemoveContact = (contactId) => {
    setFormData({ ...formData, contacts: formData.contacts.filter(c => c.id !== contactId) });
  };

  const handleAddCharge = () => {
    if (!newCharge.trim()) return;
    setFormData({ ...formData, charges: [...(formData.charges || []), newCharge.trim()] });
    setNewCharge('');
  };

  const handleRemoveCharge = (index) => {
    setFormData({ ...formData, charges: formData.charges.filter((_, i) => i !== index) });
  };

  const handleSaveCase = async () => {
    if (!formData.defendant_name || !formData.caller_name) {
      alert('Please fill in at least Caller Name and Defendant Name');
      return;
    }

    try {
      // Prepare case data (exclude contacts/documents arrays)
      const { contacts, documents, ...caseData } = formData;

      // Auto-set status based on payment info
      if (caseData.payment_plan_amount || (caseData.total_owed && caseData.total_owed !== '0')) {
        caseData.status = 'Owes Money';
      }

      // Insert/Update Case
      const { data: savedCase, error: caseError } = await supabase
        .from('cases')
        .upsert(caseData)
        .select()
        .single();

      if (caseError) throw caseError;

      // Handle Contacts
      if (contacts && contacts.length > 0) {
        const contactsWithCaseId = contacts.map(c => {
          const contact = {
            ...c,
            case_id: savedCase.id
          };
          // Only include id if it's a valid database ID (not a temp timestamp)
          if (c.id && typeof c.id !== 'number') {
            contact.id = c.id;
          } else {
            // Don't include id field for new contacts - let Supabase generate it
            delete contact.id;
          }
          return contact;
        });

        const { error: contactsError } = await supabase
          .from('contacts')
          .upsert(contactsWithCaseId);

        if (contactsError) throw contactsError;
      }

      await fetchCases();
      setCurrentView('dashboard');
      alert('Case saved successfully!');
    } catch (error) {
      console.error('Error saving case:', error);
      alert('Error saving case: ' + error.message);
    }
  };

  const handleViewCase = (caseItem) => {
    setSelectedCase(caseItem);
    setCurrentView('caseDetail');
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${selectedCase.id}/${fileName}`;

        // Upload to Storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        // Save to Database
        const { data: savedDoc, error: dbError } = await supabase
          .from('documents')
          .insert({
            case_id: selectedCase.id,
            name: file.name,
            type: fileExt,
            url: publicUrl,
            storage_path: filePath
          })
          .select()
          .single();

        if (dbError) throw dbError;

        // Update Local State
        const updatedCase = { ...selectedCase, documents: [...selectedCase.documents, savedDoc] };
        setCases(cases.map(c => c.id === selectedCase.id ? updatedCase : c));
        setSelectedCase(updatedCase);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file: ' + error.message);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('cases')
        .update({ status: newStatus })
        .eq('id', selectedCase.id);

      if (error) throw error;

      const updatedCase = { ...selectedCase, status: newStatus };
      setCases(cases.map(c => c.id === selectedCase.id ? updatedCase : c));
      setSelectedCase(updatedCase);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  };

  const handleDeleteDocument = async (docId, storagePath) => {
    try {
      // Delete from Storage
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([storagePath]);
        if (storageError) console.error('Error deleting from storage:', storageError);
      }

      // Delete from Database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);

      if (dbError) throw dbError;

      const updatedCase = { ...selectedCase, documents: selectedCase.documents.filter(d => d.id !== docId) };
      setCases(cases.map(c => c.id === selectedCase.id ? updatedCase : c));
      setSelectedCase(updatedCase);
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error deleting document');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Intake': return 'bg-yellow-100 text-yellow-800';
      case 'Pending Docs': return 'bg-blue-100 text-blue-800';
      case 'Bond Written': return 'bg-green-100 text-green-800';
      case 'Complete': return 'bg-gray-100 text-gray-800';
      case 'Owes Money': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (currentView === 'dashboard') {
    return (
      <div className="min-h-screen text-slate-200 font-sans selection:bg-indigo-500/30">
        {/* Navbar */}
        <div className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <FileText className="text-white" size={24} />
                </div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                  Bail Bonds Manager
                </h1>
              </div>
              <button onClick={handleNewCase}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all duration-300 shadow-lg shadow-indigo-500/25 font-medium border border-white/10">
                <Plus size={20} />
                New Client
              </button>
            </div>

            {/* Search Bar */}
            <div className="mt-6 relative max-w-2xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl blur-xl"></div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, booking #, case #, phone, or status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 placeholder-slate-500 transition-all shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden">
            {filteredCases.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="text-slate-500" size={32} />
                </div>
                <h3 className="text-lg font-medium text-slate-300">No cases found</h3>
                <p className="text-slate-500 mt-1">Get started by creating a new client case.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredCases.map(c => (
                  <div key={c.id} onClick={() => handleViewCase(c)}
                    className="p-5 hover:bg-white/[0.02] cursor-pointer transition-all duration-200 group border-l-2 border-transparent hover:border-indigo-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">
                            {c.defendant_name}
                          </h3>
                          <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${c.status === 'Bond Written' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            c.status === 'Owes Money' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                              c.status === 'Pending Docs' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                'bg-slate-700/30 text-slate-400 border-slate-600/30'
                            }`}>
                            {c.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-400">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Case #</span>
                            {c.case_number || c.id}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Booking #</span>
                            {c.defendant_booking_number}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Bond</span>
                            <span className="text-slate-300">${c.bond_amount}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Court</span>
                            {c.court_type}
                          </div>
                        </div>
                      </div>

                      <div className="ml-4 flex items-center gap-2 text-slate-500">
                        <FileText size={16} />
                        <span className="text-sm">{c.documents.length}</span>
                        <ChevronLeft className="rotate-180 text-slate-600 group-hover:text-indigo-500 transition-colors ml-2" size={20} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'newCase') {
    return (
      <div className="min-h-screen text-slate-200 font-sans selection:bg-indigo-500/30 pb-20">
        <div className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentView('dashboard')}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                <ChevronLeft size={24} />
              </button>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                New Client Intake
              </h1>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl shadow-2xl backdrop-blur-sm p-8 space-y-8">

            <div>
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                Caller Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <span className="text-sm font-medium text-slate-400 block mb-1">Call Date/Time</span>
                  <p className="text-slate-200 font-mono bg-slate-950/50 px-3 py-2 rounded-lg border border-white/5 inline-block">
                    {formData.call_datetime ? new Date(formData.call_datetime).toLocaleString() : new Date().toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Name *</label>
                  <input type="text" value={formData.caller_name || ''} onChange={(e) => setFormData({ ...formData, caller_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Phone</label>
                  <input type="text" value={formData.caller_phone || ''} onChange={(e) => setFormData({ ...formData, caller_phone: formatPhone(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
                  <input type="email" value={formData.caller_email || ''} onChange={(e) => setFormData({ ...formData, caller_email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Relationship to Defendant</label>
                  <input type="text" value={formData.caller_relationship || ''} onChange={(e) => setFormData({ ...formData, caller_relationship: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                Defendant Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Name *</label>
                  <input type="text" value={formData.defendant_name || ''} onChange={(e) => setFormData({ ...formData, defendant_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Date of Birth</label>
                  <input type="text" placeholder="MM/DD/YYYY" maxLength="10" value={formData.defendant_dob || ''} onChange={(e) => setFormData({ ...formData, defendant_dob: formatDate(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">SO#</label>
                  <input type="text" value={formData.defendant_booking_number || ''} onChange={(e) => setFormData({ ...formData, defendant_booking_number: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Case Number</label>
                  <input type="text" placeholder="or 'NEW'" value={formData.case_number || ''} onChange={(e) => setFormData({ ...formData, case_number: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Bond Amount</label>
                  <input type="text" value={formData.bond_amount || ''} onChange={(e) => setFormData({ ...formData, bond_amount: formatMoney(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Jail Location</label>
                  <input type="text" value={formData.jail_location || ''} onChange={(e) => setFormData({ ...formData, jail_location: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-slate-400 mb-2">Charges</label>
                <div className="flex gap-2 mb-3">
                  <input type="text" value={newCharge} onChange={(e) => setNewCharge(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCharge()}
                    placeholder="Enter charge and press Enter"
                    className="flex-1 px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                  <button onClick={handleAddCharge} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors font-medium shadow-lg shadow-indigo-500/25">Add</button>
                </div>
                {formData.charges && formData.charges.length > 0 && (
                  <div className="space-y-2">
                    {formData.charges.map((charge, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-950/30 border border-white/5 rounded-lg group hover:border-white/10 transition-colors">
                        <span className="text-sm text-slate-300">{charge}</span>
                        <button onClick={() => handleRemoveCharge(idx)} className="text-slate-500 hover:text-rose-400 transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                Court Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Court Type</label>
                  <select value={formData.court_type || 'District'} onChange={(e) => setFormData({ ...formData, court_type: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all">
                    <option>District</option>
                    <option>Justice</option>
                  </select>
                </div>

                {formData.court_type === 'District' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Form Number</label>
                      <input type="text" value={formData.form_number || ''} onChange={(e) => setFormData({ ...formData, form_number: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">County</label>
                      <input type="text" value={formData.county || ''} onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">District</label>
                      <input type="text" placeholder="e.g., Third District" value={formData.district || ''} onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                    </div>
                  </>
                )}

                {formData.court_type === 'Justice' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Justice Court Name</label>
                    <input type="text" placeholder="e.g., West Valley Justice Court" value={formData.justice_court || ''} onChange={(e) => setFormData({ ...formData, justice_court: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Bondsman Name</label>
                  <input type="text" value={formData.bondsman_name || ''} onChange={(e) => setFormData({ ...formData, bondsman_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                  Contacts / Cosigners
                </h2>
                <div className="flex gap-3">
                  <button onClick={handleCopyCallerToContact} className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-800 text-slate-200 rounded-xl hover:bg-slate-700 border border-white/10 transition-all">
                    <Copy size={16} />
                    Copy Caller
                  </button>
                  <button onClick={handleAddContact} className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 transition-all">
                    <UserPlus size={16} />
                    Add Contact
                  </button>
                </div>
              </div>

              {(!formData.contacts || formData.contacts.length === 0) && (
                <div className="text-center py-12 text-slate-500 text-sm border-2 border-dashed border-white/10 rounded-2xl bg-slate-950/30">
                  No contacts added yet. Click "Copy Caller" or "Add Contact" above.
                </div>
              )}

              {formData.contacts && formData.contacts.map((contact, idx) => (
                <div key={contact.id} className="p-6 border border-white/5 rounded-xl bg-slate-950/30 mb-6 relative group">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-medium text-slate-200 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs border border-indigo-500/30">{idx + 1}</span>
                      Contact Details
                    </h3>
                    <button onClick={() => handleRemoveContact(contact.id)} className="text-slate-500 hover:text-rose-400 transition-colors p-2 hover:bg-rose-500/10 rounded-lg">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Name</label>
                      <input type="text" value={contact.name} onChange={(e) => handleUpdateContact(contact.id, 'name', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Phone</label>
                      <input type="text" value={contact.phone} onChange={(e) => handleUpdateContact(contact.id, 'phone', formatPhone(e.target.value))}
                        className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
                      <input type="email" value={contact.email} onChange={(e) => handleUpdateContact(contact.id, 'email', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Own or Rent</label>
                      <select value={contact.ownership} onChange={(e) => handleUpdateContact(contact.id, 'ownership', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all">
                        <option>Own</option>
                        <option>Rent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Address</label>
                      <input type="text" value={contact.address || ''} onChange={(e) => handleUpdateContact(contact.id, 'address', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">City</label>
                      <input type="text" value={contact.city || ''} onChange={(e) => handleUpdateContact(contact.id, 'city', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">State</label>
                      <input type="text" value={contact.state || ''} onChange={(e) => handleUpdateContact(contact.id, 'state', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Zip</label>
                      <input type="text" value={contact.zip || ''} onChange={(e) => handleUpdateContact(contact.id, 'zip', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Employer</label>
                      <input type="text" value={contact.employer || ''} onChange={(e) => handleUpdateContact(contact.id, 'employer', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Employer Phone</label>
                      <input type="text" value={contact.employer_phone || ''} onChange={(e) => handleUpdateContact(contact.id, 'employer_phone', formatPhone(e.target.value))}
                        className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Employer City</label>
                      <input type="text" value={contact.employer_city || ''} onChange={(e) => handleUpdateContact(contact.id, 'employer_city', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Employer State</label>
                      <input type="text" value={contact.employer_state || ''} onChange={(e) => handleUpdateContact(contact.id, 'employer_state', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Employer Zip</label>
                      <input type="text" value={contact.employer_zip || ''} onChange={(e) => handleUpdateContact(contact.id, 'employer_zip', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Supervisor/Contact</label>
                      <input type="text" value={contact.employer_contact || ''} onChange={(e) => handleUpdateContact(contact.id, 'employer_contact', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Occupation</label>
                      <input type="text" value={contact.occupation || ''} onChange={(e) => handleUpdateContact(contact.id, 'occupation', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                Payment Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Total Amount Owed</label>
                  <input type="text" value={formData.total_owed || ''} onChange={(e) => setFormData({ ...formData, total_owed: formatMoney(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Payment Plan Amount</label>
                  <input type="text" value={formData.payment_plan_amount || ''} onChange={(e) => setFormData({ ...formData, payment_plan_amount: formatMoney(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Payment Frequency</label>
                  <select value={formData.payment_frequency || 'Weekly'} onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all">
                    <option>Weekly</option>
                    <option>Bi-Weekly</option>
                    <option>Monthly</option>
                    <option>One-Time</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                Notes
              </h2>
              <textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={4}
                className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all resize-none" />
            </div>

            <div className="flex justify-end gap-4 pt-8 border-t border-white/10">
              <button onClick={() => setCurrentView('dashboard')} className="px-6 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                Cancel
              </button>
              <button onClick={handleSaveCase} className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 transition-all font-medium">
                <Save size={20} />
                Save Case
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'caseDetail' && selectedCase) {
    return (
      <div className="min-h-screen text-slate-200 font-sans selection:bg-indigo-500/30 pb-20">
        <div className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <button onClick={() => setCurrentView('dashboard')}
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                  <ChevronLeft size={24} />
                </button>
                <div>
                  <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    Case {selectedCase.case_number || selectedCase.id} - {selectedCase.defendant_name}
                  </h1>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    Created {new Date(selectedCase.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(selectedCase.status)}`}>{selectedCase.status}</span>
                <select value={selectedCase.status} onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 transition-all">
                  <option>Intake</option>
                  <option>Pending Docs</option>
                  <option>Bond Written</option>
                  <option>Complete</option>
                  <option>Owes Money</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl shadow-2xl backdrop-blur-sm p-8">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                  Defendant Information
                </h2>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div><span className="font-medium text-slate-400 block mb-1">Name</span><p className="text-slate-200 text-base">{selectedCase.defendant_name}</p></div>
                  <div><span className="font-medium text-slate-400 block mb-1">DOB</span><p className="text-slate-200 text-base">{selectedCase.defendant_dob}</p></div>
                  <div><span className="font-medium text-slate-400 block mb-1">Case #</span><p className="text-slate-200 text-base font-mono bg-slate-950/50 px-2 py-1 rounded inline-block border border-white/5">{selectedCase.case_number}</p></div>
                  <div><span className="font-medium text-slate-400 block mb-1">SO#</span><p className="text-slate-200 text-base font-mono bg-slate-950/50 px-2 py-1 rounded inline-block border border-white/5">{selectedCase.defendant_booking_number}</p></div>
                  <div><span className="font-medium text-slate-400 block mb-1">Bond Amount</span><p className="text-emerald-400 text-base font-medium">${selectedCase.bond_amount}</p></div>
                  <div><span className="font-medium text-slate-400 block mb-1">Jail</span><p className="text-slate-200 text-base">{selectedCase.jail_location}</p></div>
                  <div className="col-span-2">
                    <span className="font-medium text-slate-400 block mb-2">Charges</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedCase.charges && selectedCase.charges.map((charge, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg border border-white/10 text-sm">
                          {charge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-white/5 rounded-2xl shadow-2xl backdrop-blur-sm p-8">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                  Court Information
                </h2>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div><span className="font-medium text-slate-400 block mb-1">Court Type</span><p className="text-slate-200 text-base">{selectedCase.court_type}</p></div>
                  {selectedCase.court_type === 'District' && (
                    <>
                      <div><span className="font-medium text-slate-400 block mb-1">Form #</span><p className="text-slate-200 text-base">{selectedCase.form_number || 'N/A'}</p></div>
                      <div><span className="font-medium text-slate-400 block mb-1">County</span><p className="text-slate-200 text-base">{selectedCase.county || 'N/A'}</p></div>
                      <div><span className="font-medium text-slate-400 block mb-1">District</span><p className="text-slate-200 text-base">{selectedCase.district || 'N/A'}</p></div>
                    </>
                  )}
                  {selectedCase.court_type === 'Justice' && (
                    <div className="col-span-2"><span className="font-medium text-slate-400 block mb-1">Justice Court</span><p className="text-slate-200 text-base">{selectedCase.justice_court || 'N/A'}</p></div>
                  )}
                  <div><span className="font-medium text-slate-400 block mb-1">Bondsman</span><p className="text-slate-200 text-base">{selectedCase.bondsman_name || 'N/A'}</p></div>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-white/5 rounded-2xl shadow-2xl backdrop-blur-sm p-8">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                  Caller Information
                </h2>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div><span className="font-medium text-slate-400 block mb-1">Name</span><p className="text-slate-200 text-base">{selectedCase.caller_name}</p></div>
                  <div><span className="font-medium text-slate-400 block mb-1">Phone</span><p className="text-slate-200 text-base">{selectedCase.caller_phone}</p></div>
                  <div><span className="font-medium text-slate-400 block mb-1">Email</span><p className="text-slate-200 text-base">{selectedCase.caller_email || 'N/A'}</p></div>
                  <div><span className="font-medium text-slate-400 block mb-1">Relationship</span><p className="text-slate-200 text-base">{selectedCase.caller_relationship}</p></div>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-white/5 rounded-2xl shadow-2xl backdrop-blur-sm p-8">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                  Contacts / Cosigners
                </h2>
                {selectedCase.contacts && selectedCase.contacts.length > 0 ? (
                  <div className="space-y-4">
                    {selectedCase.contacts.map((contact, idx) => (
                      <div key={contact.id} className="p-6 bg-slate-950/30 border border-white/5 rounded-xl">
                        <h3 className="font-medium text-slate-200 mb-4 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs border border-indigo-500/30">{idx + 1}</span>
                          Contact Details
                        </h3>
                        <div className="grid grid-cols-2 gap-6 text-sm">
                          <div><span className="font-medium text-slate-400 block mb-1">Name</span><p className="text-slate-200 text-base">{contact.name}</p></div>
                          <div><span className="font-medium text-slate-400 block mb-1">Phone</span><p className="text-slate-200 text-base">{contact.phone}</p></div>
                          <div><span className="font-medium text-slate-400 block mb-1">Email</span><p className="text-slate-200 text-base">{contact.email || 'N/A'}</p></div>
                          <div><span className="font-medium text-slate-400 block mb-1">Ownership</span><p className="text-slate-200 text-base">{contact.ownership}</p></div>
                          <div className="col-span-2"><span className="font-medium text-slate-400 block mb-1">Address</span><p className="text-slate-200 text-base">{contact.address || 'N/A'}</p></div>
                          <div><span className="font-medium text-slate-400 block mb-1">Employer</span><p className="text-slate-200 text-base">{contact.employer || 'N/A'}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 text-sm border-2 border-dashed border-white/10 rounded-xl bg-slate-950/30">
                    No contacts added
                  </div>
                )}
              </div>

              <div className="bg-slate-900/40 border border-white/5 rounded-2xl shadow-2xl backdrop-blur-sm p-8">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                  Payment Information
                </h2>
                <div className="grid grid-cols-3 gap-6 text-sm">
                  <div><span className="font-medium text-slate-400 block mb-1">Total Owed</span><p className="text-slate-200 text-base">${selectedCase.total_owed || 'N/A'}</p></div>
                  <div><span className="font-medium text-slate-400 block mb-1">Payment Plan</span><p className="text-slate-200 text-base">${selectedCase.payment_plan_amount || 'N/A'}</p></div>
                  <div><span className="font-medium text-slate-400 block mb-1">Frequency</span><p className="text-slate-200 text-base">{selectedCase.payment_frequency || 'N/A'}</p></div>
                </div>
              </div>

              {selectedCase.notes && (
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl shadow-2xl backdrop-blur-sm p-8">
                  <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                    Notes
                  </h2>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{selectedCase.notes}</p>
                </div>
              )}
            </div>

            <div className="space-y-8">
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl shadow-2xl backdrop-blur-sm p-8">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                  Quick Actions
                </h2>
                <button onClick={() => { setFormData(selectedCase); setCurrentView('newCase'); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-fuchsia-600 text-white rounded-xl hover:bg-fuchsia-500 shadow-lg shadow-fuchsia-500/25 transition-all text-sm font-medium mb-4">
                  <FileText size={18} />Edit Case
                </button>
                <div className="space-y-3">
                  <button onClick={() => alert('PDF generation coming soon')} className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 text-slate-200 rounded-xl hover:bg-slate-700 border border-white/10 transition-all text-sm font-medium group">
                    <FileText size={18} className="text-indigo-400 group-hover:text-indigo-300" />Generate Intel Sheet
                  </button>
                  <button onClick={() => fillBondForm(selectedCase)} className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 text-slate-200 rounded-xl hover:bg-slate-700 border border-white/10 transition-all text-sm font-medium group">
                    <FileText size={18} className="text-emerald-400 group-hover:text-emerald-300" />Generate Bond Forms
                  </button>
                  <button onClick={() => alert('DocuSign integration coming soon')} className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 text-slate-200 rounded-xl hover:bg-slate-700 border border-white/10 transition-all text-sm font-medium group">
                    <FileText size={18} className="text-amber-400 group-hover:text-amber-300" />Send to DocuSign
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-white/5 rounded-2xl shadow-2xl backdrop-blur-sm p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                    Documents
                  </h2>
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 transition-all font-medium">
                    <Upload size={16} />Upload
                  </button>
                  <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                </div>
                {selectedCase.documents.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm border-2 border-dashed border-white/10 rounded-xl bg-slate-950/30">
                    No documents uploaded yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCase.documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-950/30 border border-white/5 rounded-xl group hover:border-white/10 transition-all">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                            <FileText size={20} className="text-indigo-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">{doc.name}</p>
                            <p className="text-xs text-slate-500">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => window.open(doc.url, '_blank')} className="text-indigo-400 hover:text-indigo-300 text-sm font-medium px-3 py-1 hover:bg-indigo-500/10 rounded-lg transition-all">
                            View
                          </button>
                          <button onClick={() => handleDeleteDocument(doc.id, doc.storage_path)} className="text-slate-500 hover:text-rose-400 transition-colors p-1 hover:bg-rose-500/10 rounded-lg">
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}