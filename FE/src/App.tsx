import { useEffect } from "react";
import { World } from "./world/World";
import { useHashSync } from "./world/useHashSync";
import { useWorld } from "./store/useWorld";
import { usePortfolio } from "./store/usePortfolio";
import { useAudioDirector } from "./audio/useAudioDirector";
import { Subtitle } from "./ui/Subtitle";
import { Intro } from "./ui/Intro";
import { Hud } from "./ui/Hud";
import { ChatPanel } from "./ui/ChatPanel";
import { Panels } from "./ui/Panels";
import { CursorGlow, Guide, SmallScreenNotice, useEscape } from "./ui/Overlays";

export default function App() {
  useEffect(() => {
    void usePortfolio.getState().load();
  }, []);
  const introDone = useWorld((s) => s.introDone);
  const lang = useWorld((s) => s.lang);
  const traveling = useWorld((s) => s.travel !== null);
  const chatOpen = useWorld((s) => s.chatOpen);
  useHashSync();
  useAudioDirector();
  useEscape();

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <main className={`app ${traveling ? "is-traveling" : ""} ${chatOpen ? "chat-open" : ""}`}>
      <World />
      {introDone && (
        <>
          <Hud />
          <Subtitle />
          <Panels />
          <ChatPanel />
          <Guide />
        </>
      )}
      <Intro />
      <div className="travel-flash" aria-hidden="true" />
      <CursorGlow />
      <SmallScreenNotice />
    </main>
  );
}
