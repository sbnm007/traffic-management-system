import './App.css';
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom';
import Booking from './Components/Booking';
import Cancel from './Components/Cancel';
import Home from './Components/Home';
import Navbar from './Components/Navbar';
import { MapsProvider } from './Components/MapsContext';

function App() {
  return (
    <>
    <Router>
      <MapsProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home/>}/>
          <Route path="/booking" element={<Booking/>}/>
          <Route path="/cancel" element={<Cancel/>}/>
          <Route path="*" element={<Navigate to="/" />}/>
        </Routes>
      </MapsProvider>
    </Router>
    </>
  );
}

export default App;