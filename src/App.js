import './App.css';

// import Map from './components/map';
import Map from './components/windy-map'; 
import Header from './components/header';
import Footer from './components/footer';

function App() {
  return (
    <div>
      <Header />
      <Map />
      <Footer />
    </div>
  );
}

export default App;
