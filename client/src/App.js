import "./App.css";
import GameContainer from "./features/game/ui/GameContainer";
import GameProvider from "./app/providers/GameProvider";

function App() {
  return (
    <div className="App">
      <GameProvider>
        <GameContainer />
      </GameProvider>
    </div>
  );
}

export default App;
