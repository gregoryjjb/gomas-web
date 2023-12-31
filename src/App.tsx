import { Component, createSignal, onCleanup } from 'solid-js';
import './App.css';
import Help from './Help';
import { Menu, MenuBar, MenuItem, MenuItemSpacer } from './MenuBar';
import NewProjectForm from './NewProjectForm';
import Toolbar from './Toolbar';
import { ModalTitle, createModal } from './components/Modal';
import { createStoredSignal } from './hooks/createStorageSignal';
import {
  Command,
  SimpleCommand,
  keybindFor,
  nameFor,
} from './timeline/commands';
import { LocalPersistence } from './timeline/persistence';
import Timeline from './timeline/timeline';
import { newTracks } from './timeline/timeline-data';
import { ShowDataJSON } from './timeline/types';
import { setShowHelp, showHelp, volume } from './global';
import OpenProjectForm from './OpenProjectForm';

const show: ShowDataJSON = {
  tracks: [
    { id: 'Channel 1', keyframes: [] },
    { id: 'Channel 2', keyframes: [] },
    { id: 'Channel 3', keyframes: [] },
    { id: 'Channel 4', keyframes: [] },
    { id: 'Channel 5', keyframes: [] },
    { id: 'Channel 6', keyframes: [] },
    { id: 'Channel 7', keyframes: [] },
    { id: 'Channel 8', keyframes: [] },
  ],
};

function App() {
  let t: Timeline;

  const [playing, setPlaying] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [editLog, setEditLog] = createSignal<
    { time: number; message: string }[]
  >([]);
  const [selectedCount, setSelectedCount] = createSignal(0);
  const [prompt, setPrompt] = createSignal('');

  const handleCommand = (c: Command) => {
    t.execute(c);
  };

  const [NewProjectModal, modal] = createModal();
  const [OpenProjectModal, openModal] = createModal();

  const importLegacy = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.click();

    input.addEventListener('change', (e) => {
      const file = input.files?.[0];
      if (!file) {
        console.error('no file selected?');
        return;
      }

      const reader = new FileReader();
      reader.readAsText(file, 'UTF-8');

      reader.onload = (e) => {
        const raw = e.target?.result || '';
        if (typeof raw !== 'string') {
          throw new Error('Got non-string');
        }

        t.loadLegacyJSON(JSON.parse(raw));
      };
    });
  };

  const CommandMenuItem: Component<{
    command: SimpleCommand;
    requireSelected?: boolean;
  }> = (props) => {
    return (
      <MenuItem
        name={nameFor(props.command)}
        keybind={keybindFor(props.command)}
        onClick={() => handleCommand(props.command)}
        disabled={props.requireSelected && selectedCount() === 0}
      />
    );
  };

  return (
    <div class="flex h-screen flex-col">
      <MenuBar>
        <Menu name="File">
          <MenuItem name="New project" onClick={() => modal.show()} />
          <MenuItem name="Open" onClick={() => openModal.show()} />
          <MenuItem name="Download" />
          <MenuItem name="Import legacy JSON" onClick={importLegacy} />
        </Menu>
        <Menu name="Edit">
          <CommandMenuItem command="undo" />
          <CommandMenuItem command="redo" />
          <MenuItemSpacer />
          <CommandMenuItem requireSelected command="invert" />
          <CommandMenuItem requireSelected command="align" />
          <CommandMenuItem requireSelected command="snapToCursor" />
          <CommandMenuItem requireSelected command="equallySpace" />
          <CommandMenuItem requireSelected command="duplicate" />
          <CommandMenuItem requireSelected command="delete" />
          <MenuItemSpacer />
          <CommandMenuItem requireSelected command="dedup" />
          <CommandMenuItem requireSelected command="shiftUp" />
          <CommandMenuItem requireSelected command="shiftDown" />
          <CommandMenuItem requireSelected command="flipVertically" />
        </Menu>
        <Menu name="Help">
          <MenuItem name="Show help" onClick={() => setShowHelp(true)} />
        </Menu>
      </MenuBar>
      <div class="flex flex-col gap-3 p-3">
        <input class="bg-transparent p-0 text-white" value="Untitled show" />
        <Toolbar
          selectedCount={selectedCount()}
          playing={playing()}
          onCommand={handleCommand}
          onComplexCommand={(c, a) => {
            t?.executeWithArgs(c, a);
          }}
          onPlaybackRateChange={(rate) => t?.setPlaybackRate(rate)}
        />
      </div>
      <div
        class="min-h-0 flex-1"
        // style={{
        //   position: 'absolute',
        //   top: '78px',
        //   left: '33px',
        //   right: '69px',
        // }}
        ref={(el) => {
          t = new Timeline(el);
          t.on('play', () => setPlaying(true));
          t.on('pause', () => setPlaying(false));
          t.on('edit', (action) =>
            setEditLog((a) => [{ time: Date.now(), message: action }, ...a]),
          );
          t.on('selected', (n) => setSelectedCount(n));
          t.on('render', () => setPrompt(t.getPrompt()));
          t.on('loading', (l) => setLoading(l));

          t.executeWithArgs('setVolume', volume());

          // fetch('/queen_of_the_winter_night.json')
          //   .then((res) => res.json())
          //   .then((json) => {
          //     // t.load(json, '/halloween_1978_pT4FY3NrhGg.opus');
          //     t.load(json, '/queen_of_the_winter_night.mp3');
          //   });

          LocalPersistence.loadExisting().then((lp) => {
            if (lp) {
              t.loadPersistence(lp);
            }
          });

          onCleanup(() => {
            t.destroy();
          });
        }}
      />
      <div class="border-t border-zinc-400 bg-zinc-800 px-2 py-1">
        <p>{prompt() || `${selectedCount()} keyframes selected`}</p>
      </div>
      {showHelp() && <Help onClose={() => setShowHelp(false)} />}
      {/* <p>{selectedCount()} keyframes selected</p>
      <ul class="fixed bottom-0 left-0 flex flex-col-reverse font-mono text-white">
        {editLog().map((a) => (
          <li>
            {new Date(a.time).toLocaleTimeString()} {a.message}
          </li>
        ))}
      </ul> */}
      {loading() && (
        <div class="fixed inset-0 flex items-center justify-center bg-black/25">
          <p class="text-3xl text-white">LOADING...</p>
        </div>
      )}
      <NewProjectModal>
        <ModalTitle>New project</ModalTitle>
        <NewProjectForm
          onSubmit={(project) => {
            const blankData = newTracks(project.channelCount);
            modal.hide();

            t.load(blankData, project.file);
          }}
        />
      </NewProjectModal>

      <OpenProjectModal>
        <ModalTitle>Open project</ModalTitle>
        <OpenProjectForm
          onSubmit={(payload) => {
            openModal.hide();
            t.load(payload.tracks, payload.audio);
          }}
        />
      </OpenProjectModal>
    </div>
  );
}

export default App;
