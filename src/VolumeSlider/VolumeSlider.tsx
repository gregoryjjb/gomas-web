import { Component, JSX, ParentComponent } from 'solid-js';
import { Icon } from 'solid-heroicons';
import { speakerWave } from 'solid-heroicons/solid-mini';

import './VolumeSlider2.css';
import { createStoredSignal } from '../hooks/createStorageSignal';

const VolumeSlider: Component<{
  value?: number;
  onChange?: (n: number) => void;
}> = (props) => {
  return (
    <div class="flex items-center rounded-lg bg-zinc-700 p-2">
      <Icon path={speakerWave} class="mr-2 h-5 w-5 text-zinc-100" />
      <input
        type="range"
        min="0"
        max="1"
        step="any"
        value={props.value}
        class="volume-slider w-28"
        onInput={(e) => {
          props.onChange?.(parseFloat(e.target.value));
        }}
      />
    </div>
  );
};

export default VolumeSlider;
