import { ChatWindow } from './ui/windows/ChatWindow';
import { PetWindow } from './ui/windows/PetWindow';
import { SettingsWindow } from './ui/windows/SettingsWindow';

const windowName = new URLSearchParams(window.location.search).get('window') ?? 'pet';

export default function App() {
  if (windowName === 'settings') return <SettingsWindow />;
  if (windowName === 'chat') return <ChatWindow />;
  return <PetWindow />;
}
