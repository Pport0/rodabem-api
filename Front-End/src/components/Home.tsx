interface HomeProps {
  onLogin: () => void;
  onSignup: () => void;
}

export default function Home({ onLogin, onSignup }: HomeProps) {
  return (
    <div className="screen home-screen">
      <div className="home-logo-area">
        <img src="/logo.jpg" alt="RodaBem" className="home-logo-img" />
      </div>

      <div className="home-actions">
        <button className="btn-primary" onClick={onLogin}>ENTRAR</button>
        <button className="btn-outline" onClick={onSignup}>CRIAR CONTA</button>
      </div>

      <div className="home-spacer" />
      <div className="home-footer">© 2025 - 2026 RodaBem</div>
    </div>
  );
}
