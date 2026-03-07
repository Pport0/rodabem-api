import { useState } from 'react';
import Home from './components/Home';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import EditProfile from './components/EditProfile';
import PostosPrecos from './components/PostosPrecos';
import Abastecimento from './components/Abastecimento';
import RegistroManual from './components/RegistroManual';
import MeusDocumentos from './components/MeusDocumentos';
import DocumentosMotorista from './components/DocumentosMotorista';
import DocumentosPendentes from './components/DocumentosPendentes';
import MetodoRegistro from './components/MetodoRegistro';
import Camera from './components/Camera';
import RegistroCNH from './components/RegistroCNH';
import RegistroMOPP from './components/RegistroMOPP';
import RegistroRNTRC from './components/RegistroRNTRC';
import DocumentosVeiculo from './components/DocumentosVeiculo';

type Screen = 'home' | 'login' | 'signup' | 'dashboard' | 'profile' | 'editprofile' | 'postos' | 'abastecimento' | 'registromanual' | 'documentos' | 'docsmotorista' | 'docspendentes' | 'metodoregistro' | 'camera' | 'registrocnh' | 'registromopp' | 'registrorntrc' | 'docsveiculo';
type DocType = 'CNH' | 'MOPP' | 'RNTRC' | null;

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedDoc, setSelectedDoc] = useState<DocType>(null);

  const goToMetodo = (doc: DocType) => {
    setSelectedDoc(doc);
    setScreen('metodoregistro');
  };

  const goToDigitarManual = () => {
    if (selectedDoc === 'CNH') setScreen('registrocnh');
    else if (selectedDoc === 'MOPP') setScreen('registromopp');
    else setScreen('registrorntrc'); // RNTRC
  };

  return (
    <div className="app-shell">
      <div className="phone-frame">
        {screen === 'home' && <Home onLogin={() => setScreen('login')} onSignup={() => setScreen('signup')} />}
        {screen === 'login' && <Login onBack={() => setScreen('home')} onForgotPassword={() => alert('Funcionalidade em breve!')} onLogin={() => setScreen('dashboard')} />}
        {screen === 'signup' && <Signup onBack={() => setScreen('home')} />}
        {screen === 'dashboard' && <Dashboard onLogout={() => setScreen('home')} onProfile={() => setScreen('profile')} onPostos={() => setScreen('postos')} onAbastecimento={() => setScreen('abastecimento')} onDocumentos={() => setScreen('documentos')} />}
        {screen === 'profile' && <Profile onBack={() => setScreen('dashboard')} onEditProfile={() => setScreen('editprofile')} />}
        {screen === 'editprofile' && <EditProfile onBack={() => setScreen('profile')} />}
        {screen === 'postos' && <PostosPrecos onBack={() => setScreen('dashboard')} />}
        {screen === 'abastecimento' && <Abastecimento onBack={() => setScreen('dashboard')} onProfile={() => setScreen('profile')} onDigitarManual={() => setScreen('registromanual')} />}
        {screen === 'registromanual' && <RegistroManual onBack={() => setScreen('abastecimento')} />}
        {screen === 'documentos' && <MeusDocumentos onBack={() => setScreen('dashboard')} onProfile={() => setScreen('profile')} onMotorista={() => setScreen('docsmotorista')} onVeiculo={() => setScreen('docsveiculo')} />}
        {screen === 'docsmotorista' && <DocumentosMotorista onBack={() => setScreen('documentos')} onAdicionar={() => setScreen('docspendentes')} />}
        {screen === 'docspendentes' && <DocumentosPendentes onBack={() => setScreen('docsmotorista')} onSelectDoc={(doc) => goToMetodo(doc === 'Curso MOPP' ? 'MOPP' : doc === 'RNTRC' ? 'RNTRC' : 'CNH')} />}
        {screen === 'metodoregistro' && <MetodoRegistro onBack={() => setScreen('docspendentes')} onTirarFoto={() => setScreen('camera')} onDigitarManual={goToDigitarManual} />}
        {screen === 'camera' && <Camera onBack={() => setScreen('metodoregistro')} />}
        {screen === 'registrocnh' && <RegistroCNH onBack={() => setScreen('metodoregistro')} />}
        {screen === 'registromopp' && <RegistroMOPP onBack={() => setScreen('metodoregistro')} />}
        {screen === 'registrorntrc' && <RegistroRNTRC onBack={() => setScreen('metodoregistro')} />}
        {screen === 'docsveiculo' && <DocumentosVeiculo onBack={() => setScreen('documentos')} />}
      </div>
    </div>
  );
}
