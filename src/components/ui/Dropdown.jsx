import {
  createSignal,
  createEffect,
  onCleanup,
  Show,
  For,
  mergeProps
} from "solid-js";
import {signalUtils} from "../../utils/utils";
import {t, programLabel} from "../../i18n/index.js";

let activeDropdownSetter = null;

export function Dropdown(props) {
  // Default props
  props = mergeProps(
    {
      label: "",
      options: [],
      onSelect: () => null,
      selected: null,
      disabled: false,
    },
    props
  );

  const [open, setOpen] = createSignal(false);
  const [selected, setSelected] = signalUtils.createEffectSignal(() => props.selected);

  const resolve = (v) => (typeof v === "function" ? v() : v);
  // Toggle dropdown
  const handleButtonClick = () => {
    if (props.disabled) return;

    if (open()) {
      // If clicked while open, reset selection
      setSelected(null);
      props.onSelect(null);
      setOpen(false);
      activeDropdownSetter = null;
    } else {
      // Close other dropdown if open
      if (activeDropdownSetter && activeDropdownSetter !== setOpen)
        activeDropdownSetter(false);

      setOpen(true);
      activeDropdownSetter = setOpen;
    }
  };

  // Handle selection
  const handleSelect = (value) => {
    setSelected(value);
    props.onSelect(value);
    setOpen(false);
    activeDropdownSetter = null;
  };

  // Click outside closes dropdown
  const handleClickOutside = (e) => {
    if (!e.target.closest(".dropdown-container")) {
      setOpen(false);
      if (activeDropdownSetter === setOpen) activeDropdownSetter = null;
    }
  };

  // Event listener management
  createEffect(() => {
    document.addEventListener("click", handleClickOutside);
    onCleanup(() => document.removeEventListener("click", handleClickOutside));
  });

  // Dropdown vertical position
  const dropdownOffset = () =>
    selected() ? "calc(100% + 3px)" : "calc(100% - 10px)";

  return (
    <div
      class="relative inline-block text-left dropdown-container select-none"
      style={{"min-width": "fit-content"}}
      onFocusOut={(e) => {
        // Close dropdown when focus moves outside
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      {/* Main Button */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={props.disabled}
        class="relative flex flex-col items-center justify-start cursor-pointer h-[30px] rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset"
        classList={{
          "cursor-default text-gray-400": props.disabled,
          "hover:text-indigo-600": !props.disabled,
        }}
      >
        {/* Label + arrow */}
        <div class="flex items-center justify-center gap-[2px] font-semibold text-sm leading-none text-gray-700">
          <span>{props.label}</span>
          <Show when={!props.disabled}>
            <span
              class="transition-transform duration-200 text-gray-500"
              classList={{"rotate-180": open()}}
            >
              ▾
            </span>
          </Show>
        </div>

        {/* Selected value below label */}
        <Show when={selected()}>
          <div class="mt-[1px] text-xs text-gray-500 font-semibold text-center">
            {t(programLabel(selected()))}
          </div>
        </Show>
      </button>

      {/* Dropdown menu */}
      <Show when={open()}>
        <ul
          class="absolute left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999]
                 max-h-60 overflow-auto py-1 text-sm w-max min-w-[100%] text-center
                 transition-all duration-150 ease-out"
          style={{
            top: dropdownOffset(),
            isolation: "isolate",
          }}
        >
          <For each={resolve(props.options)}>
            {(opt) => (
              <li
                tabIndex={0}
                class="flex items-center justify-center px-4 py-1 cursor-pointer
                       font-semibold  text-gray-700 hover:bg-gray-200 transition
                       focus:bg-gray-200 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(opt);
                  }
                }}
                onClick={() => handleSelect(opt)}
              >
                <span>{t(programLabel(opt))}</span>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
