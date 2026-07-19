import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, auth, googleAuthProvider } from './lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

const SUPER_ADMIN_EMAILS = ['moustaphasec@gmail.com', 'contact@healthsaas.com']; // Replace with real admin emails

const SuperAdminDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clinics, setClinics] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '', // URL slug (e.g., 'thies')
    name: '',
    subtitle: '',
    logo: 'https://res.cloudinary.com/dzcnlr1yz/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1742394317/f1oy2jfpkujbopbqlrd2.png',
    primaryColor: '#2563eb',
    contactPhone: '',
    contactEmail: '',
    address: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && SUPER_ADMIN_EMAILS.includes(currentUser.email || '')) {
        setUser(currentUser);
        fetchClinics();
      } else if (currentUser) {
        alert("Accès refusé. Vous n'êtes pas un Super Administrateur.");
        signOut(auth);
        setUser(null);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchClinics = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'clinics'));
      const clinicsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClinics(clinicsData);
    } catch (error) {
      console.error("Erreur chargement cliniques", error);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error("Erreur connexion", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSaveClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id) return alert("L'identifiant URL (ex: thies) est obligatoire.");
    
    try {
      // Use setDoc to force the document ID to be the clinic URL slug
      await setDoc(doc(db, 'clinics', formData.id.toLowerCase().trim()), {
        name: formData.name,
        subtitle: formData.subtitle,
        logo: formData.logo,
        primaryColor: formData.primaryColor,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        address: formData.address,
        createdAt: new Date().toISOString()
      });
      alert("Clinique enregistrée avec succès !");
      setIsFormOpen(false);
      setFormData({id:'', name:'', subtitle:'', logo:'', primaryColor:'#2563eb', contactPhone:'', contactEmail:'', address:''});
      fetchClinics();
    } catch (error) {
      console.error("Erreur sauvegarde", error);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette clinique ? Cela ne supprimera pas ses données de rendez-vous, juste sa configuration SaaS.")) {
      try {
        await deleteDoc(doc(db, 'clinics', id));
        fetchClinics();
      } catch (error) {
        console.error("Erreur suppression", error);
      }
    }
  };

  if (loading) return <div style={{padding: '2rem', textAlign:'center'}}>Chargement...</div>;

  if (!user) {
    return (
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh'}}>
        <h1 style={{fontSize: '2rem', marginBottom: '1rem', color: '#1e293b'}}><i className="fas fa-globe-africa"></i> HealthSaaS SuperAdmin</h1>
        <p style={{marginBottom: '2rem', color: '#64748b'}}>Connectez-vous pour gérer les cliniques d'Afrique.</p>
        <button onClick={handleLogin} style={{padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px'}}>
          <i className="fab fa-google"></i> Connexion Administrateur
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="saas-header">
        <h1><i className="fas fa-globe-africa"></i> HealthSaaS Africa - Hub</h1>
        <div>
          <span style={{marginRight: '15px', color: '#64748b'}}>{user.email}</span>
          <button onClick={handleLogout} style={{padding: '8px 16px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>Déconnexion</button>
        </div>
      </div>

      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h2 style={{color: '#334155'}}>Cliniques Déployées ({clinics.length})</h2>
        <button onClick={() => setIsFormOpen(!isFormOpen)} style={{padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'}}>
          <i className="fas fa-plus"></i> Nouvelle Clinique
        </button>
      </div>

      {isFormOpen && (
        <div style={{background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '30px'}}>
          <h3 style={{marginBottom: '20px'}}>Configuration de la Clinique</h3>
          <form onSubmit={handleSaveClinic} style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
            <div>
              <label style={{display:'block', marginBottom:'5px', fontWeight:'500'}}>Identifiant URL (ex: thies, dakar)</label>
              <input required value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} style={{width:'100%', padding:'10px', border:'1px solid #cbd5e1', borderRadius:'6px'}} placeholder="thies" />
            </div>
            <div>
              <label style={{display:'block', marginBottom:'5px', fontWeight:'500'}}>Nom de l'Hôpital/Clinique</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{width:'100%', padding:'10px', border:'1px solid #cbd5e1', borderRadius:'6px'}} placeholder="Ex: Hôpital Régional de Thiès" />
            </div>
            <div>
              <label style={{display:'block', marginBottom:'5px', fontWeight:'500'}}>Sous-titre (Optionnel)</label>
              <input value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} style={{width:'100%', padding:'10px', border:'1px solid #cbd5e1', borderRadius:'6px'}} />
            </div>
            <div>
              <label style={{display:'block', marginBottom:'5px', fontWeight:'500'}}>Couleur Principale (Hex)</label>
              <div style={{display:'flex', gap:'10px'}}>
                <input type="color" value={formData.primaryColor} onChange={e => setFormData({...formData, primaryColor: e.target.value})} style={{width:'50px', height:'40px', padding:'2px'}} />
                <input value={formData.primaryColor} onChange={e => setFormData({...formData, primaryColor: e.target.value})} style={{flex:1, padding:'10px', border:'1px solid #cbd5e1', borderRadius:'6px'}} />
              </div>
            </div>
            <div style={{gridColumn: '1 / -1'}}>
              <label style={{display:'block', marginBottom:'5px', fontWeight:'500'}}>URL du Logo</label>
              <input required value={formData.logo} onChange={e => setFormData({...formData, logo: e.target.value})} style={{width:'100%', padding:'10px', border:'1px solid #cbd5e1', borderRadius:'6px'}} />
            </div>
            <div>
              <label style={{display:'block', marginBottom:'5px', fontWeight:'500'}}>Téléphone</label>
              <input value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} style={{width:'100%', padding:'10px', border:'1px solid #cbd5e1', borderRadius:'6px'}} />
            </div>
            <div>
              <label style={{display:'block', marginBottom:'5px', fontWeight:'500'}}>Adresse Publique</label>
              <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{width:'100%', padding:'10px', border:'1px solid #cbd5e1', borderRadius:'6px'}} />
            </div>
            <div style={{gridColumn: '1 / -1', marginTop: '10px'}}>
              <button type="submit" style={{padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%'}}>
                Enregistrer la Clinique
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px'}}>
        {clinics.map(clinic => (
          <div key={clinic.id} style={{background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderTop: \`5px solid \${clinic.primaryColor}\`}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px'}}>
              <img src={clinic.logo} alt="Logo" style={{width: '50px', height: '50px', objectFit: 'contain'}} />
              <span style={{background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569'}}>.healthsaas.com</span>
            </div>
            <h3 style={{margin: '0 0 5px 0', color: '#1e293b'}}>{clinic.name}</h3>
            <p style={{margin: '0 0 15px 0', color: '#64748b', fontSize: '0.9rem'}}>ID: {clinic.id}</p>
            
            <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
              <button onClick={() => window.open(\`/?clinic=\${clinic.id}\`, '_blank')} style={{flex: 1, padding: '8px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>
                <i className="fas fa-external-link-alt"></i> Visiter
              </button>
              <button onClick={() => handleDelete(clinic.id)} style={{padding: '8px 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>
                <i className="fas fa-trash"></i>
              </button>
            </div>
          </div>
        ))}
        {clinics.length === 0 && !loading && (
          <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#64748b', background: 'white', borderRadius: '12px'}}>
            Aucune clinique configurée pour le moment.
          </div>
        )}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<SuperAdminDashboard />);
