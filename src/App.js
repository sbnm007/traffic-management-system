import './App.css';
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Booking from './Components/Booking';
import Cancel from './Components/Cancel';

function App() {
  return (
    <>
    <Router>
      <Routes>
        <Route path='/booking' element={<Booking/>}/>
        <Route path='/cancel' element={<Cancel/>}/>
      </Routes>
    </Router>
    </>
  );
}

export default App;
