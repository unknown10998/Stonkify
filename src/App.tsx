import { useGameStore } from './store/gameStore';
import { useBackgroundMusic } from './hooks/useBackgroundMusic';
import { useSettingsStore } from './store/settingsStore';
import { useAuthStore } from './store/authStore';
import AuthScreen from './screens/AuthScreen';
import MenuScreen from './screens/MenuScreen';
import GameScreen from './screens/GameScreen';
import GameOverScreen from './screens/GameOverScreen';

export default function App() {
  const status      = useGameStore(s => s.status);
  const theme       = useSettingsStore(s => s.theme);
  const currentUser = useAuthStore(s => s.currentUser);
  useBackgroundMusic();

  return (
    <div className={theme === 'light' ? 'light-mode' : ''}>
      {!currentUser && <AuthScreen />}
      {currentUser && status === 'menu'     && <MenuScreen />}
      {currentUser && status === 'gameover' && <GameOverScreen />}
      {currentUser && status !== 'menu' && status !== 'gameover' && <GameScreen />}
    </div>
  );
}
