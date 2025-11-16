import React, { useState, useRef } from 'react';
import { Search, Plus, Upload, FileText, X, ChevronLeft, Copy, UserPlus } from 'lucide-react';

const initialCases = [
  {
    id: 1,
    caller_name: "Maria Rodriguez",
    caller_phone: "801-555-0123",
    caller_email: "maria.r@email.com",
    caller_relationship: "Mother",
    defendant_name: "Carlos Rodriguez",
    defendant_dob: "03/15/1995",
    defendant_booking_number: "SL2024-45678",
    case_number: "201234567",
    charges: ["Possession of Controlled Substance", "Failure to Appear"],
    bond_amount: "7500",
    jail_location: "Salt Lake County Jail",
    county: "Salt Lake",
    district: "Third District",
    court_type: "District",
    form_number: "1001",
    contacts: [
      {
        id: 1,
        name: "Maria Rodriguez",
        phone: "801-555-0123",
        email: "maria.r@email.com",
        address: "1234 West Temple, SLC, UT 84101",
        employer: "Mountain View Hospital",
        ownership: "Own"
      }
    ],
    bondsman_name: "Dewey",
    notes: "Mother is willing to cosign. Defendant has stable employment history.",
    status: "Bond Written",
    created_at: "2024-11-10T14:30:00",
    documents: []
  }
];

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
  const [cases, setCases] = useState(initialCases);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedCase, setSelectedCase] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({});
  const [newCharge, setNewCharge] = useState('');
  const fileInputRef = useRef(null);

  const filteredCases = cases.filter(c => {
    const query = searchQuery.toLowerCase();
    return c.defendant_name.toLowerCase().includes(query) ||
      c.defendant_booking_number.toLowerCase().includes(query) ||
      c.caller_phone.includes(query) ||
      (c.case_number && c.case_number.toLowerCase().includes(query)) ||
      c.status.toLowerCase().includes(query);
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

  const handleSaveCase = () => {
    if (!formData.defendant_name || !formData.caller_name) {
      alert('Please fill in at least Caller Name and Defendant Name');
      return;
    }

    // Auto-set status based on payment info
    let updatedFormData = { ...formData };
    if (formData.payment_plan_amount || (formData.total_owed && formData.total_owed !== '0')) {
      updatedFormData.status = 'Owes Money';
    }

    if (updatedFormData.id) {
      // Editing existing case
      setCases(cases.map(c => c.id === updatedFormData.id ? updatedFormData : c));
    } else {
      // Creating new case
      const newCase = { ...updatedFormData, id: cases.length + 1, created_at: new Date().toISOString(), documents: [] };
      setCases([...cases, newCase]);
    }

    setCurrentView('dashboard');
    alert('Case saved successfully!');
  };

  const handleViewCase = (caseItem) => {
    setSelectedCase(caseItem);
    setCurrentView('caseDetail');
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const newDocuments = files.map((file, idx) => ({
      id: Date.now() + idx, name: file.name, type: 'Other',
      uploaded_at: new Date().toISOString(), file: file
    }));
    const updatedCase = { ...selectedCase, documents: [...selectedCase.documents, ...newDocuments] };
    setCases(cases.map(c => c.id === selectedCase.id ? updatedCase : c));
    setSelectedCase(updatedCase);
  };

  const handleStatusChange = (newStatus) => {
    const updatedCase = { ...selectedCase, status: newStatus };
    setCases(cases.map(c => c.id === selectedCase.id ? updatedCase : c));
    setSelectedCase(updatedCase);
  };

  const handleDeleteDocument = (docId) => {
    const updatedCase = { ...selectedCase, documents: selectedCase.documents.filter(d => d.id !== docId) };
    setCases(cases.map(c => c.id === selectedCase.id ? updatedCase : c));
    setSelectedCase(updatedCase);
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
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Bail Bonds Manager</h1>
              <button onClick={handleNewCase} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                <Plus size={20} />
                New Client
              </button>
            </div>
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="Search by name, booking #, case #, phone, or status..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow">
            {filteredCases.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No cases found. Click "New Case" to get started.</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredCases.map(c => (
                  <div key={c.id} onClick={() => handleViewCase(c)} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">Case {c.case_number || c.id} - {c.defendant_name}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(c.status)}`}>{c.status}</span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                          <div><span className="font-medium">SO#:</span> {c.defendant_booking_number}</div>
                          <div><span className="font-medium">Bond:</span> ${c.bond_amount}</div>
                          <div><span className="font-medium">Caller:</span> {c.caller_name}</div>
                          <div><span className="font-medium">Court:</span> {c.court_type}</div>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          Charges: {c.charges && c.charges.length > 0 ? c.charges.join(', ') : 'N/A'}
                        </div>
                      </div>
                      <div className="ml-4 text-sm text-gray-500">{c.documents.length} docs</div>
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
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentView('dashboard')} className="text-gray-600 hover:text-gray-900">
                <ChevronLeft size={24} />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">New Client Intake</h1>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow p-6 space-y-6">

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Caller Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <span className="font-medium text-gray-700">Call Date/Time:</span>
                  <p className="text-gray-900">
                    {formData.call_datetime ? new Date(formData.call_datetime).toLocaleString() : new Date().toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" value={formData.caller_name || ''} onChange={(e) => setFormData({ ...formData, caller_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={formData.caller_phone || ''} onChange={(e) => setFormData({ ...formData, caller_phone: formatPhone(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formData.caller_email || ''} onChange={(e) => setFormData({ ...formData, caller_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship to Defendant</label>
                  <input type="text" value={formData.caller_relationship || ''} onChange={(e) => setFormData({ ...formData, caller_relationship: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Defendant Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" value={formData.defendant_name || ''} onChange={(e) => setFormData({ ...formData, defendant_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input type="text" placeholder="MM/DD/YYYY" maxLength="10" value={formData.defendant_dob || ''} onChange={(e) => setFormData({ ...formData, defendant_dob: formatDate(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SO#</label>
                  <input type="text" value={formData.defendant_booking_number || ''} onChange={(e) => setFormData({ ...formData, defendant_booking_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Case Number</label>
                  <input type="text" placeholder="or 'NEW'" value={formData.case_number || ''} onChange={(e) => setFormData({ ...formData, case_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bond Amount</label>
                  <input type="text" value={formData.bond_amount || ''} onChange={(e) => setFormData({ ...formData, bond_amount: formatMoney(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jail Location</label>
                  <input type="text" value={formData.jail_location || ''} onChange={(e) => setFormData({ ...formData, jail_location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Charges</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={newCharge} onChange={(e) => setNewCharge(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCharge()}
                    placeholder="Enter charge and press Enter"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={handleAddCharge} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
                </div>
                {formData.charges && formData.charges.length > 0 && (
                  <div className="space-y-1">
                    {formData.charges.map((charge, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{charge}</span>
                        <button onClick={() => handleRemoveCharge(idx)} className="text-red-600 hover:text-red-800">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Court Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Court Type</label>
                  <select value={formData.court_type || 'District'} onChange={(e) => setFormData({ ...formData, court_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>District</option>
                    <option>Justice</option>
                  </select>
                </div>

                {formData.court_type === 'District' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Form Number</label>
                      <input type="text" value={formData.form_number || ''} onChange={(e) => setFormData({ ...formData, form_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                      <input type="text" value={formData.county || ''} onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                      <input type="text" placeholder="e.g., Third District" value={formData.district || ''} onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </>
                )}

                {formData.court_type === 'Justice' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Justice Court Name</label>
                    <input type="text" placeholder="e.g., West Valley Justice Court" value={formData.justice_court || ''} onChange={(e) => setFormData({ ...formData, justice_court: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bondsman Name</label>
                  <input type="text" value={formData.bondsman_name || ''} onChange={(e) => setFormData({ ...formData, bondsman_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Contacts / Cosigners</h2>
                <div className="flex gap-2">
                  <button onClick={handleCopyCallerToContact} className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    <Copy size={16} />
                    Copy Caller
                  </button>
                  <button onClick={handleAddContact} className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <UserPlus size={16} />
                    Add Contact
                  </button>
                </div>
              </div>

              {(!formData.contacts || formData.contacts.length === 0) && (
                <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-gray-300 rounded-lg">
                  No contacts added yet. Click "Copy Caller" or "Add Contact" above.
                </div>
              )}

              {formData.contacts && formData.contacts.map((contact, idx) => (
                <div key={contact.id} className="p-4 border border-gray-200 rounded-lg mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Contact {idx + 1}</h3>
                    <button onClick={() => handleRemoveContact(contact.id)} className="text-red-600 hover:text-red-800">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input type="text" value={contact.name} onChange={(e) => handleUpdateContact(contact.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input type="text" value={contact.phone} onChange={(e) => handleUpdateContact(contact.id, 'phone', formatPhone(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input type="email" value={contact.email} onChange={(e) => handleUpdateContact(contact.id, 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Own or Rent</label>
                      <select value={contact.ownership} onChange={(e) => handleUpdateContact(contact.id, 'ownership', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Own</option>
                        <option>Rent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <input type="text" value={contact.address || ''} onChange={(e) => handleUpdateContact(contact.id, 'address', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input type="text" value={contact.city || ''} onChange={(e) => handleUpdateContact(contact.id, 'city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input type="text" value={contact.state || ''} onChange={(e) => handleUpdateContact(contact.id, 'state', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
                      <input type="text" value={contact.zip || ''} onChange={(e) => handleUpdateContact(contact.id, 'zip', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employer</label>
                      <input type="text" value={contact.employer || ''} onChange={(e) => handleUpdateContact(contact.id, 'employer', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employer Phone</label>
                      <input type="text" value={contact.employer_phone || ''} onChange={(e) => handleUpdateContact(contact.id, 'employer_phone', formatPhone(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employer City</label>
                      <input type="text" value={contact.employer_city || ''} onChange={(e) => handleUpdateContact(contact.id, 'employer_city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employer State</label>
                      <input type="text" value={contact.employer_state || ''} onChange={(e) => handleUpdateContact(contact.id, 'employer_state', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employer Zip</label>
                      <input type="text" value={contact.employer_zip || ''} onChange={(e) => handleUpdateContact(contact.id, 'employer_zip', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor/Contact</label>
                      <input type="text" value={contact.employer_contact || ''} onChange={(e) => handleUpdateContact(contact.id, 'employer_contact', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                      <input type="text" value={contact.occupation || ''} onChange={(e) => handleUpdateContact(contact.id, 'occupation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount Owed</label>
                  <input type="text" value={formData.total_owed || ''} onChange={(e) => setFormData({ ...formData, total_owed: formatMoney(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Plan Amount</label>
                  <input type="text" value={formData.payment_plan_amount || ''} onChange={(e) => setFormData({ ...formData, payment_plan_amount: formatMoney(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Frequency</label>
                  <select value={formData.payment_frequency || 'Weekly'} onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Weekly</option>
                    <option>Bi-Weekly</option>
                    <option>Monthly</option>
                    <option>One-Time</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
              <textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional information..." />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button onClick={handleSaveCase} className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Save Case
              </button>
              <button onClick={() => setCurrentView('dashboard')} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'caseDetail' && selectedCase) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <button onClick={() => setCurrentView('dashboard')} className="text-gray-600 hover:text-gray-900">
                  <ChevronLeft size={24} />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Case {selectedCase.case_number || selectedCase.id} - {selectedCase.defendant_name}</h1>
                  <p className="text-sm text-gray-500 mt-1">Created {new Date(selectedCase.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedCase.status)}`}>{selectedCase.status}</span>
                <select value={selectedCase.status} onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
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

        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Defendant Information</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium text-gray-700">Name:</span><p className="text-gray-900">{selectedCase.defendant_name}</p></div>
                  <div><span className="font-medium text-gray-700">DOB:</span><p className="text-gray-900">{selectedCase.defendant_dob}</p></div>
                  <div><span className="font-medium text-gray-700">Case #:</span><p className="text-gray-900">{selectedCase.case_number}</p></div>
                  <div><span className="font-medium text-gray-700">SO#:</span><p className="text-gray-900">{selectedCase.defendant_booking_number}</p></div>
                  <div><span className="font-medium text-gray-700">Bond Amount:</span><p className="text-gray-900">${selectedCase.bond_amount}</p></div>
                  <div><span className="font-medium text-gray-700">Jail:</span><p className="text-gray-900">{selectedCase.jail_location}</p></div>
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700">Charges:</span>
                    <div className="mt-1">
                      {selectedCase.charges && selectedCase.charges.map((charge, idx) => (
                        <p key={idx} className="text-gray-900">• {charge}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Court Information</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium text-gray-700">Court Type:</span><p className="text-gray-900">{selectedCase.court_type}</p></div>
                  {selectedCase.court_type === 'District' && (
                    <>
                      <div><span className="font-medium text-gray-700">Form #:</span><p className="text-gray-900">{selectedCase.form_number || 'N/A'}</p></div>
                      <div><span className="font-medium text-gray-700">County:</span><p className="text-gray-900">{selectedCase.county || 'N/A'}</p></div>
                      <div><span className="font-medium text-gray-700">District:</span><p className="text-gray-900">{selectedCase.district || 'N/A'}</p></div>
                    </>
                  )}
                  {selectedCase.court_type === 'Justice' && (
                    <div className="col-span-2"><span className="font-medium text-gray-700">Justice Court:</span><p className="text-gray-900">{selectedCase.justice_court || 'N/A'}</p></div>
                  )}
                  <div><span className="font-medium text-gray-700">Bondsman:</span><p className="text-gray-900">{selectedCase.bondsman_name || 'N/A'}</p></div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Caller Information</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium text-gray-700">Name:</span><p className="text-gray-900">{selectedCase.caller_name}</p></div>
                  <div><span className="font-medium text-gray-700">Phone:</span><p className="text-gray-900">{selectedCase.caller_phone}</p></div>
                  <div><span className="font-medium text-gray-700">Email:</span><p className="text-gray-900">{selectedCase.caller_email || 'N/A'}</p></div>
                  <div><span className="font-medium text-gray-700">Relationship:</span><p className="text-gray-900">{selectedCase.caller_relationship}</p></div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Contacts / Cosigners</h2>
                {selectedCase.contacts && selectedCase.contacts.length > 0 ? (
                  <div className="space-y-4">
                    {selectedCase.contacts.map((contact, idx) => (
                      <div key={contact.id} className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-medium text-gray-900 mb-2">Contact {idx + 1}</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="font-medium text-gray-700">Name:</span><p className="text-gray-900">{contact.name}</p></div>
                          <div><span className="font-medium text-gray-700">Phone:</span><p className="text-gray-900">{contact.phone}</p></div>
                          <div><span className="font-medium text-gray-700">Email:</span><p className="text-gray-900">{contact.email || 'N/A'}</p></div>
                          <div><span className="font-medium text-gray-700">Ownership:</span><p className="text-gray-900">{contact.ownership}</p></div>
                          <div className="col-span-2"><span className="font-medium text-gray-700">Address:</span><p className="text-gray-900">{contact.address || 'N/A'}</p></div>
                          <div><span className="font-medium text-gray-700">Employer:</span><p className="text-gray-900">{contact.employer || 'N/A'}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No contacts added</p>
                )}
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="font-medium text-gray-700">Total Owed:</span><p className="text-gray-900">${selectedCase.total_owed || 'N/A'}</p></div>
                  <div><span className="font-medium text-gray-700">Payment Plan:</span><p className="text-gray-900">${selectedCase.payment_plan_amount || 'N/A'}</p></div>
                  <div><span className="font-medium text-gray-700">Frequency:</span><p className="text-gray-900">{selectedCase.payment_frequency || 'N/A'}</p></div>
                </div>
              </div>

              {selectedCase.notes && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedCase.notes}</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <button onClick={() => { setFormData(selectedCase); setCurrentView('newCase'); }}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm mb-2">
                  <FileText size={18} />Edit Case
                </button>
                <div className="space-y-2">
                  <button onClick={() => alert('PDF generation coming soon')} className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    <FileText size={18} />Generate Intel Sheet
                  </button>
                  <button onClick={() => alert('PDF generation coming soon')} className="w-full flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                    <FileText size={18} />Generate Bond Forms
                  </button>
                  <button onClick={() => alert('DocuSign integration coming soon')} className="w-full flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                    <FileText size={18} />Send to DocuSign
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                    <Upload size={16} />Upload
                  </button>
                  <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                </div>
                {selectedCase.documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">No documents uploaded yet</div>
                ) : (
                  <div className="space-y-2">
                    {selectedCase.documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText size={16} className="text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                            <p className="text-xs text-gray-500">{doc.type} • {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteDocument(doc.id)} className="flex-shrink-0 p-1 text-red-600 hover:bg-red-50 rounded transition-colors">
                          <X size={16} />
                        </button>
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