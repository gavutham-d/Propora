import React, { useState, useEffect } from 'react';
import { ChevronRight, Plus, X, Edit2, Trash2, Check, AlertCircle, TrendingUp } from 'lucide-react';

const API_BASE = '/api';

// Thin fetch wrapper: sends/receives JSON and throws on non-2xx responses
// so callers can catch a single error type.
async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('propora_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('propora_token');
      localStorage.removeItem('propora_user');
    }
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // response had no JSON body
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

export default function Propora() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModal, setShowModal] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // State for properties, tenants, payments, and maintenance —
  // loaded from the backend API (see loadAllData below) instead of
  // hardcoded mock data.
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [formData, setFormData] = useState({});

  const [token, setToken] = useState(() => localStorage.getItem('propora_token'));
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('propora_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showNotifications, setShowNotifications] = useState(false);

  // Initial data load
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;

    async function loadAllData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [propertiesData, tenantsData, paymentsData, maintenanceData] = await Promise.all([
          apiRequest('/properties'),
          apiRequest('/tenants'),
          apiRequest('/payments'),
          apiRequest('/maintenance')
        ]);
        if (cancelled) return;
        setProperties(propertiesData);
        setTenants(tenantsData);
        setPayments(paymentsData);
        setMaintenance(maintenanceData);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message);
          if (err.message.includes('401') || err.message.toLowerCase().includes('token') || err.message.toLowerCase().includes('auth')) {
            localStorage.removeItem('propora_token');
            localStorage.removeItem('propora_user');
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadAllData();
    return () => { cancelled = true; };
  }, [token]);

  // Helper functions
  const getTenantName = (tenantId) => tenants.find(t => t.id === tenantId)?.name || 'Unknown';
  const getTenant = (tenantId) => tenants.find(t => t.id === tenantId);
  const getPropertyTenants = (propId) => tenants.filter(t => t.propertyId === propId);
  const getPropertyPayments = (propId) => payments.filter(p => tenants.find(t => t.id === p.tenantId && t.propertyId === propId));

  // Form handlers
  const handleAddProperty = () => {
    setFormData({});
    setFormErrors({});
    setShowModal('addProperty');
  };

  const handleSaveProperty = async () => {
    const errors = {};
    if (!formData.address?.trim()) errors.address = 'Address required';
    if (!formData.city?.trim()) errors.city = 'City required';
    if (!formData.units || formData.units < 1) errors.units = 'Valid units required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setActionError(null);
    try {
      const newProperty = await apiRequest('/properties', {
        method: 'POST',
        body: JSON.stringify({
          address: formData.address,
          city: formData.city,
          units: parseInt(formData.units)
        })
      });
      setProperties([...properties, newProperty]);
      setShowModal(null);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDeleteProperty = async (id) => {
    setActionError(null);
    try {
      await apiRequest(`/properties/${id}`, { method: 'DELETE' });
      setProperties(properties.filter(p => p.id !== id));
      setTenants(tenants.filter(t => t.propertyId !== id));
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleAddTenant = () => {
    setFormData({ propertyId: selectedProperty });
    setFormErrors({});
    setShowModal('addTenant');
  };

  const handleSaveTenant = async () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = 'Name required';
    if (!formData.email?.trim()) errors.email = 'Email required';
    if (!formData.unit?.trim()) errors.unit = 'Unit required';
    if (!formData.rent || formData.rent < 1) errors.rent = 'Valid rent required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setActionError(null);
    try {
      const newTenant = await apiRequest('/tenants', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || '',
          propertyId: selectedProperty,
          unit: formData.unit,
          rent: parseInt(formData.rent),
          moveInDate: formData.moveInDate || new Date().toISOString().split('T')[0]
        })
      });
      setTenants([...tenants, newTenant]);
      setShowModal(null);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDeleteTenant = async (id) => {
    setActionError(null);
    try {
      await apiRequest(`/tenants/${id}`, { method: 'DELETE' });
      setTenants(tenants.filter(t => t.id !== id));
      setPayments(payments.filter(p => p.tenantId !== id));
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleAddPayment = () => {
    setFormData({ propertyId: selectedProperty });
    setFormErrors({});
    setShowModal('addPayment');
  };

  const handleSavePayment = async () => {
    const errors = {};
    if (!formData.tenantId) errors.tenantId = 'Tenant required';
    if (!formData.amount || formData.amount < 1) errors.amount = 'Valid amount required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setActionError(null);
    try {
      const newPayment = await apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: parseInt(formData.tenantId),
          amount: parseInt(formData.amount),
          dueDate: formData.dueDate,
          status: formData.status || 'Pending'
        })
      });
      setPayments([...payments, newPayment]);
      setShowModal(null);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleAddMaintenance = () => {
    setFormData({ propertyId: selectedProperty, priority: 'Medium' });
    setFormErrors({});
    setShowModal('addMaintenance');
  };

  const handleSaveMaintenance = async () => {
    const errors = {};
    if (!formData.title?.trim()) errors.title = 'Title required';
    if (!formData.unit?.trim()) errors.unit = 'Unit required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setActionError(null);
    try {
      const newRequest = await apiRequest('/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: selectedProperty,
          unit: formData.unit,
          title: formData.title,
          description: formData.description || '',
          priority: formData.priority || 'Medium',
          cost: parseInt(formData.cost) || 0
        })
      });
      setMaintenance([...maintenance, newRequest]);
      setShowModal(null);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const updateMaintenanceStatus = async (id, status) => {
    setActionError(null);
    try {
      const updated = await apiRequest(`/maintenance/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      setMaintenance(maintenance.map(m => m.id === id ? updated : m));
    } catch (err) {
      setActionError(err.message);
    }
  };

  const deleteMaintenance = async (id) => {
    setActionError(null);
    try {
      await apiRequest(`/maintenance/${id}`, { method: 'DELETE' });
      setMaintenance(maintenance.filter(m => m.id !== id));
    } catch (err) {
      setActionError(err.message);
    }
  };

  // Calculate metrics
  const totalRevenue = properties.reduce((sum, p) => sum + p.rent, 0);
  const totalExpenses = maintenance.reduce((sum, m) => sum + (m.status === 'Completed' ? m.cost : 0), 0);
  const pendingPaymentsCount = payments.filter(p => p.status === 'Pending').length;
  const pendingMaintenanceCount = maintenance.filter(m => m.status === 'Submitted').length;

  // Pages
  const renderDashboardPage = () => (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Welcome back, {user?.name?.split(' ')[0] || 'User'}</h1>
        <p style={{ fontSize: '15px', color: '#666', margin: 0 }}>Here's what's happening with your properties today</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <MetricCard title="Total Revenue" value={`$${totalRevenue}`} icon="📊" trend="+12%" color="#E8765B" />
        <MetricCard title="Active Tenants" value={tenants.length} icon="👥" trend="+2" color="#7B8D6B" />
        <MetricCard title="Pending Payments" value={pendingPaymentsCount} icon="💰" trend={`$${payments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0)}`} color="#C97B4A" />
        <MetricCard title="Maintenance Items" value={pendingMaintenanceCount} icon="🔧" trend={`${maintenance.filter(m => m.status === 'Completed').length} completed`} color="#B8956A" />
      </div>

      {/* Quick Actions */}
      <div style={{ backgroundColor: '#FAF5F0', borderRadius: '16px', padding: '24px', border: '1px solid #E8D5C4' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 16px 0' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          <ActionButton label="Add Payment" onClick={() => { setSelectedProperty(properties[0]?.id); handleAddPayment(); }} color="#E8765B" />
          <ActionButton label="New Tenant" onClick={() => { setSelectedProperty(properties[0]?.id); handleAddTenant(); }} color="#7B8D6B" />
          <ActionButton label="Report Issue" onClick={() => { setSelectedProperty(properties[0]?.id); handleAddMaintenance(); }} color="#C97B4A" />
          <ActionButton label="View Reports" onClick={() => setCurrentPage('financials')} color="#B8956A" />
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E8D5C4' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 16px 0' }}>Upcoming Payments</h2>
        <div style={{ space: '12px' }}>
          {payments.filter(p => p.status === 'Pending').slice(0, 4).map(payment => (
            <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#FAF5F0', borderRadius: '12px', marginBottom: '8px' }}>
              <div>
                <p style={{ fontWeight: '600', color: '#1a1a1a', margin: 0, fontSize: '14px' }}>{getTenantName(payment.tenantId)}</p>
                <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0 0' }}>Due: {new Date(payment.dueDate).toLocaleDateString()}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: '700', color: '#E8765B', margin: 0, fontSize: '16px' }}>${payment.amount}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPropertiesPage = () => (
    <div className="space-y-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Properties</h1>
        <button onClick={handleAddProperty} style={{ backgroundColor: '#E8765B', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'all 0.3s ease' }} onMouseOver={(e) => e.target.style.backgroundColor = '#d85d48'} onMouseOut={(e) => e.target.style.backgroundColor = '#E8765B'}>
          + Add Property
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {properties.map(prop => (
          <div key={prop.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E8D5C4', cursor: 'pointer', transition: 'all 0.3s ease', position: 'relative' }} onClick={() => { setSelectedProperty(prop.id); setCurrentPage('property-detail'); }} onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 8px 20px rgba(232, 118, 91, 0.12)'} onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>{prop.address}</h3>
                <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 12px 0' }}>{prop.city}</p>
                <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                  <div>
                    <p style={{ color: '#888', margin: 0 }}>Units</p>
                    <p style={{ fontWeight: '700', color: '#1a1a1a', margin: '4px 0 0 0' }}>{prop.units}</p>
                  </div>
                  <div>
                    <p style={{ color: '#888', margin: 0 }}>Income</p>
                    <p style={{ fontWeight: '700', color: '#7B8D6B', margin: '4px 0 0 0' }}>${prop.rent}</p>
                  </div>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteProperty(prop.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '18px', padding: '8px' }}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPropertyDetailPage = () => {
    const prop = properties.find(p => p.id === selectedProperty);
    if (!prop) return <div>Property not found</div>;

    const propTenants = getPropertyTenants(selectedProperty);
    const propPayments = getPropertyPayments(selectedProperty);
    const propMaintenance = maintenance.filter(m => m.propertyId === selectedProperty);

    return (
      <div className="space-y-6">
        <button onClick={() => setCurrentPage('properties')} style={{ backgroundColor: 'transparent', border: 'none', color: '#E8765B', cursor: 'pointer', fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>
          ← Back to Properties
        </button>

        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>{prop.address}</h1>
          <p style={{ fontSize: '14px', color: '#888', margin: '4px 0 0 0' }}>{prop.city}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <StatCard label="Total Units" value={prop.units} color="#E8765B" />
          <StatCard label="Monthly Income" value={`$${prop.rent}`} color="#7B8D6B" />
          <StatCard label="Occupied" value={`${propTenants.length}/${prop.units}`} color="#C97B4A" />
        </div>

        {/* Tenants Section */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E8D5C4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Tenants</h2>
            <button onClick={handleAddTenant} style={{ backgroundColor: '#E8765B', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>+ Add Tenant</button>
          </div>
          <div style={{ space: '12px' }}>
            {propTenants.length > 0 ? propTenants.map(tenant => (
              <div key={tenant.id} style={{ padding: '12px', backgroundColor: '#FAF5F0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <p style={{ fontWeight: '600', color: '#1a1a1a', margin: 0, fontSize: '14px' }}>{tenant.name}</p>
                  <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0 0' }}>Unit {tenant.unit} • ${tenant.rent}/mo</p>
                </div>
                <button onClick={() => handleDeleteTenant(tenant.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '18px' }}>×</button>
              </div>
            )) : <p style={{ color: '#888', fontSize: '13px' }}>No tenants yet</p>}
          </div>
        </div>

        {/* Payments Section */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E8D5C4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Payments</h2>
            <button onClick={handleAddPayment} style={{ backgroundColor: '#E8765B', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>+ Log Payment</button>
          </div>
          <div style={{ space: '12px' }}>
            {propPayments.length > 0 ? propPayments.map(payment => (
              <div key={payment.id} style={{ padding: '12px', backgroundColor: '#FAF5F0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <p style={{ fontWeight: '600', color: '#1a1a1a', margin: 0, fontSize: '14px' }}>{getTenantName(payment.tenantId)}</p>
                  <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0 0' }}>Due: {new Date(payment.dueDate).toLocaleDateString()}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: '700', color: '#1a1a1a', margin: 0 }}>${payment.amount}</p>
                  <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', backgroundColor: payment.status === 'Paid' ? '#D4EDDA' : '#FFF3CD', color: payment.status === 'Paid' ? '#155724' : '#856404' }}>{payment.status}</span>
                </div>
              </div>
            )) : <p style={{ color: '#888', fontSize: '13px' }}>No payments yet</p>}
          </div>
        </div>

        {/* Maintenance Section */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E8D5C4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Maintenance</h2>
            <button onClick={handleAddMaintenance} style={{ backgroundColor: '#E8765B', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>+ New Request</button>
          </div>
          <div style={{ space: '12px' }}>
            {propMaintenance.length > 0 ? propMaintenance.map(req => (
              <div key={req.id} style={{ padding: '12px', backgroundColor: '#FAF5F0', borderRadius: '12px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '600', color: '#1a1a1a', margin: 0, fontSize: '14px' }}>{req.title}</p>
                    <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0 0' }}>Unit {req.unit} • {req.description}</p>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '11px' }}>
                      <span style={{ color: req.priority === 'High' ? '#d32f2f' : req.priority === 'Medium' ? '#f57c00' : '#388e3c' }}>⬤ {req.priority}</span>
                      <span style={{ color: '#888' }}>${req.cost}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select value={req.status} onChange={(e) => updateMaintenanceStatus(req.id, e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #E8D5C4', fontSize: '11px', fontWeight: '600' }}>
                      <option>Submitted</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                    </select>
                    <button onClick={() => deleteMaintenance(req.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '16px' }}>×</button>
                  </div>
                </div>
              </div>
            )) : <p style={{ color: '#888', fontSize: '13px' }}>No maintenance requests</p>}
          </div>
        </div>
      </div>
    );
  };

  const renderFinancialsPage = () => (
    <div className="space-y-6">
      <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Financial Report</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <FinancialCard label="Total Revenue" value={`$${totalRevenue}`} color="#7B8D6B" />
        <FinancialCard label="Total Expenses" value={`$${totalExpenses}`} color="#C97B4A" />
        <FinancialCard label="Net Income" value={`$${totalRevenue - totalExpenses}`} color="#E8765B" />
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E8D5C4' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 16px 0' }}>Payment Overview</h2>
        <div>
          {payments.map(p => (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', padding: '12px', borderBottom: '1px solid #E8D5C4', fontSize: '13px', alignItems: 'center' }}>
              <div><p style={{ fontWeight: '600', color: '#1a1a1a', margin: 0 }}>{getTenantName(p.tenantId)}</p></div>
              <div><p style={{ color: '#888', margin: 0 }}>${p.amount}</p></div>
              <div><p style={{ color: '#888', margin: 0 }}>{new Date(p.dueDate).toLocaleDateString()}</p></div>
              <div><span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: p.status === 'Paid' ? '#D4EDDA' : '#FFF3CD', color: p.status === 'Paid' ? '#155724' : '#856404', fontSize: '11px', fontWeight: '600' }}>{p.status}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Modals
  const renderAddPropertyModal = () => (
    <ModalOverlay onClose={() => setShowModal(null)}>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 16px 0' }}>Add Property</h2>
      <div style={{ space: '12px' }}>
        <FormField label="Address" value={formData.address || ''} onChange={(val) => setFormData({ ...formData, address: val })} error={formErrors.address} />
        <FormField label="City" value={formData.city || ''} onChange={(val) => setFormData({ ...formData, city: val })} error={formErrors.city} />
        <FormField label="Number of Units" type="number" value={formData.units || ''} onChange={(val) => setFormData({ ...formData, units: val })} error={formErrors.units} />
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button onClick={() => setShowModal(null)} style={{ flex: 1, padding: '10px', border: '1px solid #E8D5C4', borderRadius: '8px', backgroundColor: '#FAF5F0', cursor: 'pointer', fontWeight: '600', color: '#1a1a1a' }}>Cancel</button>
          <button onClick={handleSaveProperty} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', backgroundColor: '#E8765B', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Save Property</button>
        </div>
      </div>
    </ModalOverlay>
  );

  const renderAddTenantModal = () => (
    <ModalOverlay onClose={() => setShowModal(null)}>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 16px 0' }}>Add Tenant</h2>
      <div style={{ space: '12px' }}>
        <FormField label="Name" value={formData.name || ''} onChange={(val) => setFormData({ ...formData, name: val })} error={formErrors.name} />
        <FormField label="Email" type="email" value={formData.email || ''} onChange={(val) => setFormData({ ...formData, email: val })} error={formErrors.email} />
        <FormField label="Phone" value={formData.phone || ''} onChange={(val) => setFormData({ ...formData, phone: val })} />
        <FormField label="Unit" value={formData.unit || ''} onChange={(val) => setFormData({ ...formData, unit: val })} error={formErrors.unit} />
        <FormField label="Monthly Rent" type="number" value={formData.rent || ''} onChange={(val) => setFormData({ ...formData, rent: val })} error={formErrors.rent} />
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button onClick={() => setShowModal(null)} style={{ flex: 1, padding: '10px', border: '1px solid #E8D5C4', borderRadius: '8px', backgroundColor: '#FAF5F0', cursor: 'pointer', fontWeight: '600', color: '#1a1a1a' }}>Cancel</button>
          <button onClick={handleSaveTenant} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', backgroundColor: '#E8765B', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Add Tenant</button>
        </div>
      </div>
    </ModalOverlay>
  );

  const renderAddPaymentModal = () => (
    <ModalOverlay onClose={() => setShowModal(null)}>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 16px 0' }}>Log Payment</h2>
      <div style={{ space: '12px' }}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', display: 'block', marginBottom: '6px' }}>Tenant</label>
          <select value={formData.tenantId || ''} onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #E8D5C4', borderRadius: '8px', fontSize: '13px' }}>
            <option value="">Select tenant</option>
            {getPropertyTenants(selectedProperty).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {formErrors.tenantId && <p style={{ color: '#d32f2f', fontSize: '11px', marginTop: '4px' }}>{formErrors.tenantId}</p>}
        </div>
        <FormField label="Amount" type="number" value={formData.amount || ''} onChange={(val) => setFormData({ ...formData, amount: val })} error={formErrors.amount} />
        <FormField label="Due Date" type="date" value={formData.dueDate || ''} onChange={(val) => setFormData({ ...formData, dueDate: val })} />
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', display: 'block', marginBottom: '6px' }}>Status</label>
          <select value={formData.status || 'Pending'} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #E8D5C4', borderRadius: '8px', fontSize: '13px' }}>
            <option>Pending</option>
            <option>Paid</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button onClick={() => setShowModal(null)} style={{ flex: 1, padding: '10px', border: '1px solid #E8D5C4', borderRadius: '8px', backgroundColor: '#FAF5F0', cursor: 'pointer', fontWeight: '600', color: '#1a1a1a' }}>Cancel</button>
          <button onClick={handleSavePayment} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', backgroundColor: '#E8765B', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Log Payment</button>
        </div>
      </div>
    </ModalOverlay>
  );

  const renderAddMaintenanceModal = () => (
    <ModalOverlay onClose={() => setShowModal(null)}>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 16px 0' }}>Report Maintenance</h2>
      <div style={{ space: '12px' }}>
        <FormField label="Title" value={formData.title || ''} onChange={(val) => setFormData({ ...formData, title: val })} error={formErrors.title} />
        <FormField label="Unit" value={formData.unit || ''} onChange={(val) => setFormData({ ...formData, unit: val })} error={formErrors.unit} />
        <FormField label="Description" value={formData.description || ''} onChange={(val) => setFormData({ ...formData, description: val })} />
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', display: 'block', marginBottom: '6px' }}>Priority</label>
          <select value={formData.priority || 'Medium'} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #E8D5C4', borderRadius: '8px', fontSize: '13px' }}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </div>
        <FormField label="Estimated Cost" type="number" value={formData.cost || ''} onChange={(val) => setFormData({ ...formData, cost: val })} />
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button onClick={() => setShowModal(null)} style={{ flex: 1, padding: '10px', border: '1px solid #E8D5C4', borderRadius: '8px', backgroundColor: '#FAF5F0', cursor: 'pointer', fontWeight: '600', color: '#1a1a1a' }}>Cancel</button>
          <button onClick={handleSaveMaintenance} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', backgroundColor: '#E8765B', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Report Issue</button>
        </div>
      </div>
    </ModalOverlay>
  );

  const notificationsList = [];
  
  // 1. Pending Payments
  payments.filter(p => p.status === 'Pending').forEach(p => {
    const tenant = tenants.find(t => t.id === p.tenantId);
    notificationsList.push({
      id: `payment-${p.id}`,
      type: 'Pending Payment',
      tag: `$${p.amount}`,
      text: `${tenant ? tenant.name : 'Unknown Tenant'}: Due on ${new Date(p.dueDate).toLocaleDateString()}`,
      color: '#C97B4A',
      page: 'financials'
    });
  });

  // 2. Submitted Maintenance Requests
  maintenance.filter(m => m.status === 'Submitted').forEach(m => {
    notificationsList.push({
      id: `maintenance-${m.id}`,
      type: `Maintenance (${m.priority})`,
      tag: m.status,
      text: `Unit ${m.unit}: ${m.title}`,
      color: m.priority === 'High' ? '#d32f2f' : m.priority === 'Medium' ? '#f57c00' : '#388e3c',
      page: 'property-detail',
      propId: m.propertyId
    });
  });

  const notificationsCount = notificationsList.length;

  if (!token) {
    return (
      <AuthScreen
        onLogin={(newToken, userData) => {
          localStorage.setItem('propora_token', newToken);
          localStorage.setItem('propora_user', JSON.stringify(userData));
          setToken(newToken);
          setUser(userData);
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#FAF5F0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#888' }}>
        Loading Propora…
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#FAF5F0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', gap: '12px', padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#d32f2f', fontWeight: '600' }}>Couldn't load Propora</p>
        <p style={{ color: '#888', fontSize: '13px' }}>{loadError}</p>
        <p style={{ color: '#888', fontSize: '13px' }}>Make sure the backend is running on http://localhost:5000.</p>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', border: 'none', borderRadius: '8px', backgroundColor: '#E8765B', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#FAF5F0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? '260px' : '0', backgroundColor: '#2D2D2D', color: '#FFF', transition: 'width 0.3s ease', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #444' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, letterSpacing: '-0.5px' }}>Propora</h1>
          <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Property Management</p>
        </div>

        <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'properties', label: 'Properties', icon: '🏠' },
            { id: 'financials', label: 'Reports', icon: '📈' }
          ].map(item => (
            <button key={item.id} onClick={() => setCurrentPage(item.id)} style={{ width: '100%', padding: '12px', marginBottom: '8px', backgroundColor: currentPage === item.id ? '#E8765B' : 'transparent', border: 'none', borderRadius: '10px', color: '#FFF', cursor: 'pointer', textAlign: 'left', fontSize: '14px', fontWeight: currentPage === item.id ? '600' : '500', transition: 'all 0.2s ease' }} onMouseOver={(e) => !['dashboard', 'properties', 'financials'].includes(currentPage) && (e.target.style.backgroundColor = '#444')} onMouseOut={(e) => !['dashboard', 'properties', 'financials'].includes(currentPage) && (e.target.style.backgroundColor = 'transparent')}>
              <span style={{ marginRight: '8px' }}>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '12px', borderTop: '1px solid #444', fontSize: '12px' }}>
          <p style={{ color: '#999', margin: 0 }}>Logged in as</p>
          <p style={{ fontWeight: '600', margin: '4px 0 0 0' }}>{user?.name || 'User'}</p>
          <button onClick={() => {
            localStorage.removeItem('propora_token');
            localStorage.removeItem('propora_user');
            setToken(null);
            setUser(null);
            apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
          }} style={{ width: '100%', marginTop: '12px', padding: '8px', backgroundColor: '#444', border: 'none', borderRadius: '8px', color: '#FFF', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Logout</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar */}
        <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E8D5C4', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#1a1a1a' }}>
            {sidebarOpen ? '✕' : '≡'}
          </button>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowNotifications(!showNotifications)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', position: 'relative', padding: '4px' }}>
                🔔
                {notificationsCount > 0 && (
                  <span style={{ position: 'absolute', top: '-2px', right: '-2px', backgroundColor: '#E8765B', color: 'white', borderRadius: '50%', width: '15px', height: '15px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                    {notificationsCount}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div style={{ position: 'absolute', right: 0, top: '32px', width: '320px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E8D5C4', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', padding: '16px', zIndex: 1001 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #FAF5F0', paddingBottom: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Notifications</h3>
                    <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '12px' }}>Close</button>
                  </div>
                  <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {notificationsList.length > 0 ? notificationsList.map(n => (
                      <div key={n.id} onClick={() => { setCurrentPage(n.page); if (n.propId) setSelectedProperty(n.propId); setShowNotifications(false); }} style={{ padding: '8px 10px', backgroundColor: '#FAF5F0', borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s', fontSize: '12px' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F5ECE3'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#FAF5F0'}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '600', color: n.color }}>{n.type}</span>
                          <span style={{ color: '#888', fontSize: '10px' }}>{n.tag}</span>
                        </div>
                        <p style={{ color: '#333', margin: 0, fontWeight: '500' }}>{n.text}</p>
                      </div>
                    )) : (
                      <p style={{ color: '#888', fontSize: '12px', textAlign: 'center', margin: '16px 0' }}>No pending tasks</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
          {actionError && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FDECEA', border: '1px solid #F5C6CB', color: '#d32f2f', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px' }}>
              <span>{actionError}</span>
              <button onClick={() => setActionError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f', fontSize: '16px' }}>×</button>
            </div>
          )}
          {currentPage === 'dashboard' && renderDashboardPage()}
          {currentPage === 'properties' && renderPropertiesPage()}
          {currentPage === 'property-detail' && renderPropertyDetailPage()}
          {currentPage === 'financials' && renderFinancialsPage()}
        </div>
      </div>

      {/* Modals */}
      {showModal === 'addProperty' && renderAddPropertyModal()}
      {showModal === 'addTenant' && renderAddTenantModal()}
      {showModal === 'addPayment' && renderAddPaymentModal()}
      {showModal === 'addMaintenance' && renderAddMaintenanceModal()}
    </div>
  );
}

// Helper Components
function MetricCard({ title, value, icon, trend, color }) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E8D5C4', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: '-10px', top: '-10px', fontSize: '40px', opacity: 0.1 }}>{icon}</div>
      <p style={{ fontSize: '13px', color: '#888', fontWeight: '600', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</p>
      <p style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', margin: '8px 0 0 0' }}>{value}</p>
      <p style={{ fontSize: '12px', color: color, fontWeight: '600', margin: '8px 0 0 0' }}>↗ {trend}</p>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '16px', border: '1px solid #E8D5C4', textAlign: 'center' }}>
      <p style={{ fontSize: '12px', color: '#888', fontWeight: '600', margin: 0, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontSize: '24px', fontWeight: '700', color: color, margin: '8px 0 0 0' }}>{value}</p>
    </div>
  );
}

function FinancialCard({ label, value, color }) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E8D5C4' }}>
      <p style={{ fontSize: '13px', color: '#888', fontWeight: '600', margin: 0 }}>{label}</p>
      <p style={{ fontSize: '32px', fontWeight: '700', color: color, margin: '12px 0 0 0' }}>{value}</p>
    </div>
  );
}

function ActionButton({ label, onClick, color }) {
  return (
    <button onClick={onClick} style={{ padding: '12px 16px', backgroundColor: color, color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: 'all 0.3s ease', minHeight: '44px' }} onMouseOver={(e) => e.target.style.opacity = '0.85'} onMouseOut={(e) => e.target.style.opacity = '1'}>
      {label}
    </button>
  );
}

function FormField({ label, type = 'text', value, onChange, error }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', display: 'block', marginBottom: '6px' }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: error ? '1px solid #d32f2f' : '1px solid #E8D5C4', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit' }} />
      {error && <p style={{ color: '#d32f2f', fontSize: '11px', marginTop: '4px' }}>{error}</p>}
    </div>
  );
}

function ModalOverlay({ onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', animation: 'slideUp 0.3s ease' }}>
        {children}
      </div>
    </div>
  );
}

function AuthScreen({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering && !name.trim()) {
        throw new Error('Name is required');
      }
      if (!email.trim() || !password) {
        throw new Error('Email and password are required');
      }

      const endpoint = isRegistering ? '/auth/register' : '/auth/login';
      const body = isRegistering ? { name, email, password } : { email, password };

      const data = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (data?.token && data?.user) {
        onLogin(data.token, data.user);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#FAF5F0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '20px' }}>
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', border: '1px solid #E8D5C4', boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', margin: 0, letterSpacing: '-0.5px' }}>Propora</h1>
          <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Property Management Platform</p>
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', marginBottom: '20px', textAlign: 'center' }}>
          {isRegistering ? 'Create your account' : 'Sign in to your account'}
        </h2>

        {error && (
          <div style={{ backgroundColor: '#FDECEA', border: '1px solid #F5C6CB', color: '#d32f2f', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️ {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isRegistering && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '6px' }}>Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #E8D5C4', borderRadius: '8px', fontSize: '13px' }} placeholder="Your Name" />
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '6px' }}>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #E8D5C4', borderRadius: '8px', fontSize: '13px' }} placeholder="sarah.mitchell@example.com" />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '6px' }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #E8D5C4', borderRadius: '8px', fontSize: '13px' }} placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', marginTop: '8px', border: 'none', borderRadius: '8px', backgroundColor: '#E8765B', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'background-color 0.2s' }}>
            {loading ? 'Processing...' : isRegistering ? 'Register' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={() => { setIsRegistering(!isRegistering); setError(null); }} style={{ background: 'none', border: 'none', color: '#E8765B', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}