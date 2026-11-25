import { NavLink, Navigate, Route, Routes, Link } from "react-router-dom";
import { useStore } from "./store";
import { Toaster } from "./toast";
import { useEvents } from "./useEvents";
import Login from "./pages/Login";
import Shop from "./pages/Shop";
import Collection from "./pages/Collection";
import Quiz from "./pages/Quiz";
import Events from "./pages/Events";
import Profile from "./pages/Profile";
import Styles from "./pages/Styles";
import Feed from "./pages/Feed";

export default function App() {
  const { me, loading } = useStore();

  if (loading) {
    return (
      <>
        <div className="app-bg" />
        <div className="loading-screen">
          <div className="spinner" />
        </div>
      </>
    );
  }

  if (!me) {
    return (
      <>
        <div className="app-bg" />
        <div className="app-grain" />
        <Login />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <div className="app-bg" />
      <div className="app-grain" />
      <Nav />
      <Routes>
        <Route path="/" element={<Shop />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/collection/:playerId" element={<Collection />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/events" element={<Events />} />
        <Route path="/styles" element={<Styles />} />
        <Route path="/fil" element={<Feed />} />
        <Route path="/profil" element={<Profile />} />
        <Route path="/profil/:playerId" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Toaster />
    </>
  );
}

function Nav() {
  const { me, rules } = useStore();
  const { data } = useEvents();
  const evPacks = data?.events.reduce((s, e) => s + e.available, 0) ?? 0;
  if (!me) return null;
  const packs = rules ? Math.floor(me.points / rules.packCost) : 0;
  const mins = Math.ceil(me.nextPointInMs / 60000);
  return (
    <nav className="nav">
      <Link to="/" className="logo">
        <span className="logo-seal">ラ</span>
        <span className="logo-word">RAKAMA</span>
      </Link>
      <div className="nav-links">
        <NavLink to="/" end>
          Packs
        </NavLink>
        <NavLink to="/collection">Collection</NavLink>
        <NavLink to="/quiz">Quiz du jour</NavLink>
        <NavLink to="/events">
          Événements
          {evPacks > 0 && <span className="dot" />}
        </NavLink>
        <NavLink to="/fil">Le fil</NavLink>
        <NavLink to="/profil">Profil</NavLink>
      </div>
      <div className="nav-spacer" />
      <Link to="/profil" className="nav-user">
        {me.name}
      </Link>
      <div className="points-pill" title={`+1 point dans ${mins} min`}>
        <span className="coin">✦</span>
        <span>{me.points.toLocaleString("fr-FR")}</span>
        <small>
          = {packs} pack{packs > 1 ? "s" : ""}
        </small>
      </div>
    </nav>
  );
}
